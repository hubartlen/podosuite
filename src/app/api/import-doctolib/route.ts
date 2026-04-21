import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { pdf } = await request.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdf }
            },
            {
              type: 'text',
              text: `Analyse ce planning Doctolib. Extrais UNIQUEMENT les patients dont la ligne commence par "Collab" (ce sont les patients d'Arthur Le Neué). Ignore toutes les lignes "Prévost Marie".

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
        }]
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
      const json = JSON.parse(clean)
      return NextResponse.json(json)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        return NextResponse.json(JSON.parse(match[0]))
      }
      console.error('Parse error, text was:', text)
      return NextResponse.json({ patients: [] })
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
