import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const CLES = ['achats', 'loyer', 'location_materiel', 'entretien', 'energie', 'honoraires', 'assurances', 'vehicule', 'deplacements', 'cotisations_sociales', 'cotisations_pro', 'formation', 'telecom', 'banque', 'impots', 'autres']

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

    const { fichier, type } = await request.json()
    if (!fichier) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })

    const prompt = `Tu analyses un justificatif de dépense professionnelle (facture, ticket de caisse, avis de prélèvement, échéancier) d'un pédicure-podologue libéral en France.

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"date":"AAAA-MM-JJ","fournisseur":"","libelle":"","montant":0,"categorie":"","mode_paiement":""}

Règles :
- date = date de la facture ou du paiement, au format AAAA-MM-JJ
- fournisseur = nom de l'entreprise ou de l'organisme
- libelle = description courte de ce qui est acheté (ex. "Lames de bistouri et compresses", "Abonnement téléphonique")
- montant = total TTC réellement payé, en nombre (le podologue ne récupère pas la TVA)
- categorie = la clé la plus adaptée parmi : achats (consommables, petit matériel), loyer (loyer et charges locatives), location_materiel, entretien (entretien, réparations, ménage), energie (eau, gaz, électricité), honoraires (comptable, AGA, avocat), assurances (RCP, multirisque), vehicule (carburant, entretien, péage, parking), deplacements (transports, hôtel), cotisations_sociales (URSSAF, CARPIMKO, CSG), cotisations_pro (Ordre, syndicat), formation (formations, congrès, livres, abonnements pro), telecom (téléphone, internet, logiciels), banque (frais bancaires, terminal CB), impots (CFE, taxes), autres
- mode_paiement = une valeur parmi "Carte bancaire", "Prélèvement", "Virement", "Chèque", "Espèces", ou "" si ce n'est pas indiqué`

    const contenu = type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fichier } }
      : { type: 'image', source: { type: 'base64', media_type: type || 'image/jpeg', data: fichier } }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_VALUE_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 800, messages: [{ role: 'user', content: [contenu, { type: 'text', text: prompt }] }] }),
    })
    if (!response.ok) {
      console.error('Anthropic error:', await response.text())
      return NextResponse.json({ error: 'Erreur API Claude' }, { status: 500 })
    }
    const data = await response.json()
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    const match = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Justificatif illisible' }, { status: 500 })
    const r = JSON.parse(match[0])
    return NextResponse.json({
      date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : '',
      fournisseur: String(r.fournisseur || ''),
      libelle: String(r.libelle || ''),
      montant: Number(r.montant) || 0,
      categorie: CLES.includes(r.categorie) ? r.categorie : 'autres',
      mode_paiement: String(r.mode_paiement || ''),
    })
  } catch (error) {
    console.error('Analyse justificatif error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
