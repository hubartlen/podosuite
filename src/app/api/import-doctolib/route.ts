import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { pdf, image, mediaType, praticienNom } = await request.json()

    let content: any[]

    const prompt = praticienNom
      ? `Analyse ce planning Doctolib. Extrais UNIQUEMENT les patients du praticien "${praticienNom}". Si tu ne trouves pas ce praticien spécifiquement, extrais TOUS les patients visibles dans le planning.`
      : `Analyse ce planning Doctolib. Extrais TOUS les patients visibles dans le planning.`

    const fullPrompt = `${prompt}

Retourne UNIQUEMENT ce JSON, sans aucun texte avant ou après :
{"patients":[{"civilite":"Mme","nom":"DUPONT","prenom":"Marie","motif":"Soins de pédicurie","heure":"10:15"}]}

Règles :
- civilite = "Mme" ou "M." selon le préfixe, sinon ""
- nom = en MAJUSCULES
- prenom = avec majuscule initiale
- motif = le motif de consultation
- heure = l'heure du rendez-vous
- Ignore les absences et les blocs non-patient`

    if (image) {
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: image } },
        { type: 'text', text: fullPrompt }
      ]
    } else {
      content = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } },
        { type: 'text', text: fullPrompt }
      ]
    }

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
      console.error('Parse error, text was:', text)
      return NextResponse.json({ patients: [] })
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
