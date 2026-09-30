import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Session expirée, reconnecte-toi' }, { status: 401 })

    const { image, mediaType, cabinetId, dateDuJour } = await request.json()
    if (!image || !cabinetId) return NextResponse.json({ error: 'Capture ou cabinet manquant' }, { status: 400 })

    const [{ data: tarifs }, { data: prat }] = await Promise.all([
      supabase.from('tarifs').select('designation, couleur_doctolib').eq('cabinet_id', cabinetId).order('ordre'),
      supabase.from('praticiens').select('nom, prenom').eq('id', user.id).single(),
    ])
    if (!tarifs || tarifs.length === 0) return NextResponse.json({ error: 'Aucun tarif pour ce cabinet (voir Réglages)' }, { status: 400 })

    const actes = tarifs.map((t: any) => `- "${t.designation}" : rendez-vous de couleur ${t.couleur_doctolib || 'non précisée'}`).join('\n')
    const praticien = prat ? `${prat.prenom} ${prat.nom}` : 'Arthur Le Neué'

    const prompt = `Analyse cette capture d'écran d'agenda Doctolib d'un pédicure-podologue. Extrais chaque rendez-vous patient visible.

Actes possibles, reconnaissables à la couleur du rendez-vous :
${actes}

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"rendez_vous":[{"date":"2026-09-25","heure":"09:00","nom":"DUPONT","prenom":"Marie","acte":"Soin de pédicurie"}]}

Règles :
- date au format AAAA-MM-JJ, lue dans l'en-tête de l'agenda ; si plusieurs jours sont visibles, mets la bonne date pour chaque rendez-vous ; si l'année n'est pas visible, utilise celle de ${dateDuJour} ; si aucune date n'est lisible, utilise ${dateDuJour}
- heure = heure de début au format HH:MM
- nom en MAJUSCULES, prenom avec majuscule initiale
- acte = recopie EXACTEMENT une des désignations ci-dessus d'après la couleur ; si le motif écrit sur le rendez-vous indique clairement l'acte, il prime sur la couleur ; si tu n'es pas sûr, mets ""
- Ignore les créneaux libres, absences, pauses et plages bloquées
- Si l'agenda affiche plusieurs praticiens, ne garde que les rendez-vous de ${praticien} (colonne "Collab" le cas échéant)`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_VALUE_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
          { type: 'text', text: prompt },
        ] }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Erreur API Claude' }, { status: 500 })
    }

    const data = await response.json()
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    try {
      return NextResponse.json(JSON.parse(text.replace(/```json|```/g, '').trim()))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return NextResponse.json(JSON.parse(match[0]))
      return NextResponse.json({ rendez_vous: [] })
    }
  } catch (error) {
    console.error('Import recettes error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
