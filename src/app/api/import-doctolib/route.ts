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
        model: 'claude-opus-4-5',
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
              text: `Analyse ce planning Doctolib et extrais UNIQUEMENT les patients du praticien "Arthur Le Neué" ou "Collab" (pas ceux de "Marie Prévost" ou "Prévost Marie").

Pour chaque patient trouvé, retourne un JSON avec ce format exact, sans markdown, sans texte avant ou après :
{"patients":[{"civilite":"Mme","nom":"DUPONT","prenom":"Marie","motif":"Soin de pédicurie","heure":"09:00"},...]}`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    try {
      const json = JSON.parse(text)
      return NextResponse.json(json)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        return NextResponse.json(JSON.parse(match[0]))
      }
      return NextResponse.json({ patients: [] })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erreur analyse PDF' }, { status: 500 })
  }
}
