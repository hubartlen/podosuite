import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { pdf, image, mediaType } = await request.json()

    const prompt = `Analyse ce planning Doctolib. Extrais TOUS les rendez-vous patients visibles.

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"rendez_vous":[{"date":"2024-04-22","heure":"09:00","duree":30,"nom":"JERBI","prenom":"Seloua","motif":"soin de pédicurie"}]}

Règles :
- date = format YYYY-MM-DD (déduis la date depuis le document — si plusieurs jours visibles, mets la bonne date pour chaque RDV)
- heure = format HH:MM (heure de début)
- duree = durée en minutes (30 par défaut si non visible)
- nom = en MAJUSCULES
- prenom = avec majuscule initiale
- motif = motif de consultation (ou "" si non visible)
- Ignorer les créneaux vides, bloqués ou sans nom patient
- Pour un planning partagé, n'extraire QUE les patients de la colonne "Collab" / Arthur Le Neué, pas les autres praticiens`

    const content: any[] = image
      ? [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: image } },
          { type: 'text', text: prompt },
        ]
      : [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } },
          { type: 'text', text: prompt },
        ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_VALUE_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return NextResponse.json({ error: 'Erreur API', details: err }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return NextResponse.json(JSON.parse(clean))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return NextResponse.json(JSON.parse(match[0]))
      return NextResponse.json({ rendez_vous: [] })
    }
  } catch (error) {
    console.error('Import RDV error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
