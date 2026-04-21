import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { pdf, image, mediaType } = await request.json()

    let content: any[]

    if (image) {
      content = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType || 'image/png', data: image }
        },
        {
          type: 'text',
          text: `Analyse cette capture d'écran d'un agenda Doctolib. Extrais TOUS les patients visibles dans cette capture — tous ceux qui ont un nom en MAJUSCULES suivi d'un prénom.

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"patients":[{"civilite":"","nom":"DORCAL","prenom":"Noah","motif":"","heure":"10:30"}]}

Règles :
- Extrais TOUS les noms de patients visibles (format NOM Prénom)
- civilite = "" (pas d'info disponible sur cette vue)
- nom = la partie en MAJUSCULES
- prenom = la partie avec majuscule initiale
- motif = "" si non visible
- heure = l'heure de début du rendez-vous
- Ignore les absences et les blocs non-patient`
        }
      ]
    } else {
      content = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdf }
        },
        {
          type: 'text',
          text: `Analyse ce planning Doctolib. Extrais UNIQUEMENT les patients dont la ligne commence par "Collab" (patients d'Arthur Le Neué). Ignore toutes les lignes "Prévost Marie".

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"patients":[{"civilite":"Mme","nom":"JERBI","prenom":"Seloua","motif":"diabète - soin de pédicurie","heure":"09:00"}]}

Règles :
- civilite = "Mme" ou "M." selon le préfixe, sinon ""
- nom = en MAJUSCULES
- prenom = avec majuscule initiale
- motif = le motif de consultation
- heure = l'heure du rendez-vous`
        }
      ]
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content }]
      })
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
      return NextResponse.json({ patients: [] })
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
