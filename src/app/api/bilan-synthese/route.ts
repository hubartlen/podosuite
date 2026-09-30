import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EXAMEN, POSTURE, MARCHE } from '@/lib/bilan-v2'

export const maxDuration = 60
const MODELE = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
const plein = (v: any) => typeof v === 'string' && v.trim() !== ''

function resume(d: any, age: number | null, sexe: string | null) {
  const L: string[] = []
  L.push(`Patient : ${sexe === 'F' ? 'femme' : sexe === 'M' ? 'homme' : 'sexe non précisé'}${age !== null && age !== undefined ? `, ${age} ans` : ''}`)
  const c = d.contexte || {}
  if (plein(c.profession)) L.push(`Profession : ${c.profession}`)
  if (plein(c.activite)) L.push(`Activité physique : ${c.activite}`)
  if (plein(c.chaussage)) L.push(`Chaussage habituel : ${c.chaussage}`)
  if (plein(c.pointure)) L.push(`Pointure : ${c.pointure}`)
  const m = d.motif || {}
  if (plein(m.texte)) L.push(`Motif de consultation : ${m.texte}`)
  if (plein(m.anciennete)) L.push(`Ancienneté : ${m.anciennete}`)
  if (plein(m.antecedents)) L.push(`Antécédents : ${m.antecedents}`)
  if (plein(m.suivis)) L.push(`Suivis en cours : ${m.suivis}`)
  if (plein(m.traitements)) L.push(`Traitements : ${m.traitements}`)
  if (plein(m.semelles_anterieures)) L.push(`Semelles antérieures : ${m.semelles_anterieures}`)
  ;(m.douleurs || []).forEach((p: any, i: number) => {
    L.push(`Douleur ${i + 1} : pied ${p.pied === 'G' ? 'gauche' : 'droit'}${plein(p.zone) ? `, ${p.zone}` : ''}${plein(p.moment) ? `, ${p.moment}` : ''}${p.eva !== '' && p.eva !== undefined ? `, EVA ${p.eva}/10` : ''}`)
  })
  const ex = d.examen || {}
  const lignesEx = EXAMEN.filter(k => plein(ex[k.cle]?.G) || plein(ex[k.cle]?.D)).map(k => {
    const e = ex[k.cle]
    const g = plein(e.G) ? `${e.G}${plein(e.precG) ? ` (${e.precG})` : ''}` : 'non évalué'
    const dr = plein(e.D) ? `${e.D}${plein(e.precD) ? ` (${e.precD})` : ''}` : 'non évalué'
    return `  ${k.libelle} : gauche ${g}, droit ${dr}`
  })
  if (lignesEx.length) L.push('Examen clinique :', ...lignesEx)
  if (plein(d.examen_remarques)) L.push(`Remarques d'examen : ${d.examen_remarques}`)
  const po = POSTURE.filter(k => plein(d.posture?.[k.cle])).map(k => `  ${k.libelle} : ${d.posture[k.cle]}`)
  if (po.length) L.push('Posture :', ...po)
  if (plein(d.posture_remarques)) L.push(`Remarques posturales : ${d.posture_remarques}`)
  const ma = MARCHE.filter(k => plein(d.marche?.[k.cle])).map(k => `  ${k.libelle} : ${d.marche[k.cle]}`)
  if (ma.length) L.push('Marche :', ...ma)
  if (plein(d.marche_remarques)) L.push(`Remarques sur la marche : ${d.marche_remarques}`)
  const s = d.semelles || {}
  const el = (s.elements || []).filter((e: any) => e.G || e.D).map((e: any) => `  ${e.libelle} : ${e.G && e.D ? 'des deux côtés' : e.G ? 'à gauche' : 'à droite'}${plein(e.valeur) ? `, ${e.valeur}` : ''}`)
  if (el.length) L.push('Orthèses plantaires prescrites :', ...el)
  else L.push("Orthèses plantaires : aucun élément coché pour l'instant")
  if (plein(s.type)) L.push(`Type de semelle : ${s.type}`)
  if (plein(s.recouvrement)) L.push(`Recouvrement : ${s.recouvrement}`)
  if (plein(d.synthese)) L.push(`Synthèse déjà rédigée par le praticien : ${d.synthese}`)
  return L.join('\n')
}

const CONSIGNE_SYNTHESE = `"synthese" : la synthèse du bilan, en 4 à 7 phrases, au présent, à la troisième personne ("Le patient présente…" ou "La patiente présente…"), dans un style professionnel mais compréhensible par le patient. Relie les constats entre eux de façon clinique et prudente, sans recopier mécaniquement la liste. Si des orthèses sont prescrites, termine en expliquant l'objectif de chaque élément.`
const CONSIGNE_CONSEILS = `"conseils" : 4 à 7 conseils personnalisés adressés au patient en le vouvoyant, réunis dans un seul texte, un conseil par ligne séparé par un retour à la ligne, sans puce ni numéro. Ils portent sur le chaussage adapté à ses activités et à ses constats, des exercices simples et ciblés (étirements, renforcement, proprioception) uniquement s'ils sont pertinents au vu du bilan, l'adaptation progressive au port des semelles si des semelles sont prescrites, et les signes qui doivent l'amener à reconsulter. Aucun conseil générique sans lien avec ce bilan.`

const enTexte = (v: any) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).join('\n') : String(v ?? '').trim())

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

    const { donnees, age, sexe, champ } = await request.json()
    if (!donnees) return NextResponse.json({ error: 'Bilan manquant' }, { status: 400 })
    const veutSynthese = champ !== 'conseils'
    const veutConseils = champ !== 'synthese'

    const consignes = [veutSynthese ? CONSIGNE_SYNTHESE : '', veutConseils ? CONSIGNE_CONSEILS : ''].filter(Boolean)
    const format = veutSynthese && veutConseils ? '{"synthese":"...","conseils":"..."}' : veutSynthese ? '{"synthese":"..."}' : '{"conseils":"..."}'
    const prompt = `Tu es pédicure-podologue diplômé d'État et tu rédiges le compte rendu d'un bilan podologique qui sera remis au patient et, avec son accord, à son médecin. Voici les données saisies pendant la consultation :

${resume(donnees, age ?? null, sexe ?? null)}

Rédige en français :
${consignes.join('\n\n')}

Règles : n'invente aucun constat absent des données, ne pose pas de diagnostic médical hors du champ podologique, ne cite aucun nom de médicament. Si certaines données manquent, rédige avec ce qui est disponible.

Réponds UNIQUEMENT avec ce JSON, sans aucun texte avant ou après : ${format}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_VALUE_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELE, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!response.ok) {
      const detail = await response.text()
      console.error('Anthropic error:', detail)
      let message = ''
      try { message = JSON.parse(detail)?.error?.message || '' } catch {}
      return NextResponse.json({ error: 'Claude a refusé la demande (' + response.status + (message ? ', ' + message : '') + ')' }, { status: 502 })
    }
    const data = await response.json()
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').replace(/```json|```/g, '').trim()
    let r: any = null
    const match = text.match(/\{[\s\S]*\}/)
    if (match) { try { r = JSON.parse(match[0]) } catch {} }
    if (!r && veutConseils && !veutSynthese && text) r = { conseils: text.replace(/^[\s"{]*conseils"?\s*:\s*"?/i, '').replace(/"?\s*}?\s*$/, '') }
    if (!r) return NextResponse.json({ error: 'Réponse illisible, réessaie' }, { status: 500 })

    const synthese = enTexte(r.synthese)
    const conseils = enTexte(r.conseils).split('\n').map(l => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim()).filter(Boolean).join('\n')
    if (veutConseils && !veutSynthese && !conseils) return NextResponse.json({ error: "Aucun conseil n'a été proposé : complète un peu le bilan (motif, examen, semelles) et réessaie" }, { status: 422 })
    if (veutSynthese && !veutConseils && !synthese) return NextResponse.json({ error: "Aucune synthèse n'a été proposée : complète un peu le bilan et réessaie" }, { status: 422 })
    return NextResponse.json({ synthese, conseils })
  } catch (error: any) {
    console.error('Bilan synthese error:', error)
    return NextResponse.json({ error: 'Erreur serveur (' + (error?.message || 'inconnue') + ')' }, { status: 500 })
  }
}
