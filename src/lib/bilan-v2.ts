export type Choix = { cle: string; libelle: string; options: string[] }

export const ETAPES = [
  { cle: 'contexte', titre: 'Patient et contexte' },
  { cle: 'motif', titre: 'Motif et douleurs' },
  { cle: 'examen', titre: 'Examen clinique' },
  { cle: 'posture', titre: 'Posture et genoux' },
  { cle: 'marche', titre: 'Marche' },
  { cle: 'synthese', titre: 'Synthèse' },
  { cle: 'semelles', titre: 'Semelles et conseils' },
]

export const EXAMEN: Choix[] = [
  { cle: 'empreinte', libelle: 'Empreinte podoscopique', options: ['Normale', 'Plate', 'Creuse'] },
  { cle: 'arriere_pied', libelle: 'Arrière-pied', options: ['Neutre', 'Valgus', 'Varus'] },
  { cle: 'avant_pied', libelle: 'Avant-pied', options: ['RAS', 'Hallux valgus', 'Griffes', 'Étalé', 'Quintus varus'] },
  { cle: 'hallux', libelle: "Mobilité de l'hallux", options: ['Normale', 'Limitée', 'Rigide'] },
  { cle: 'flexion_dorsale', libelle: 'Flexion dorsale de cheville', options: ['Normale', 'Limitée'] },
  { cle: 'sous_talienne', libelle: 'Sous-talienne', options: ['Normale', 'Limitée', 'Hypermobile'] },
  { cle: 'jack', libelle: 'Test de Jack', options: ['Positif', 'Négatif'] },
  { cle: 'unipodal', libelle: 'Appui unipodal', options: ['Stable', 'Instable'] },
  { cle: 'peau_ongles', libelle: 'Peau et ongles', options: ['RAS', 'Hyperkératose', 'Mycose', 'Verrue', 'Ongle incarné'] },
]

export const POSTURE: Choix[] = [
  { cle: 'tete', libelle: 'Tête', options: ['Droite', 'Inclinée à gauche', 'Inclinée à droite'] },
  { cle: 'epaules', libelle: 'Épaules', options: ['Horizontales', 'Gauche basse', 'Droite basse'] },
  { cle: 'bassin', libelle: 'Bassin', options: ['Horizontal', 'Hanche gauche basse', 'Hanche droite basse'] },
  { cle: 'rachis', libelle: 'Rachis', options: ['Normal', 'Attitude scoliotique', 'Hyperlordose', 'Hypercyphose'] },
  { cle: 'genoux', libelle: 'Genoux', options: ['Normo-axés', 'Genu valgum', 'Genu varum', 'Genu recurvatum', 'Flessum'] },
  { cle: 'patellas', libelle: 'Patellas', options: ['Au zénith', 'En dedans', 'En dehors'] },
]

export const MARCHE: Choix[] = [
  { cle: 'attaque', libelle: 'Attaque du pas', options: ['Talonnière', 'Médio-pied', 'Avant-pied'] },
  { cle: 'deroule', libelle: 'Déroulé', options: ['Normal', 'Pronateur', 'Supinateur'] },
  { cle: 'propulsion', libelle: 'Propulsion', options: ['Normale', 'Diminuée à gauche', 'Diminuée à droite', 'Diminuée des deux côtés'] },
  { cle: 'boiterie', libelle: 'Boiterie', options: ['Absente', 'Présente'] },
]

export const ELEMENTS_SEMELLES: [string, string][] = [
  ['brc', 'Barre rétro-capitale (BRC)'],
  ['orc', 'Olive rétro-capitale (ORC)'],
  ['hci', 'Hémi-coupole interne (HCI)'],
  ['hce', 'Hémi-coupole externe (HCE)'],
  ['butee', 'Butée'],
  ['sous_cuboidien', 'Élément sous-cuboïdien'],
  ['coin_supinateur', 'Coin supinateur'],
  ['coin_pronateur', 'Coin pronateur'],
  ['talonnette', 'Talonnette'],
  ['evidement_talon', 'Évidement talon'],
]

export const TYPES_SEMELLES = ['Thermoformées', 'Moulées', 'Composites', 'Résine']
export const RECOUVREMENTS = ['Cuir', 'Microfibre', 'Mousse', 'Sport']

export function donneesVides(): any {
  return {
    contexte: { profession: '', activite: '', chaussage: '', pointure: '', medecin: '' },
    motif: { texte: '', anciennete: '', antecedents: '', suivis: '', traitements: '', semelles_anterieures: '', douleurs: [] },
    examen: {},
    examen_remarques: '',
    posture: {},
    posture_remarques: '',
    marche: {},
    marche_remarques: '',
    synthese: '',
    semelles: {
      gabarit: '', type: '', recouvrement: '', conseils: '', controle: '', port: '',
      elements: ELEMENTS_SEMELLES.map(([cle, libelle]) => ({ cle, libelle, G: false, D: false, valeur: '' })),
    },
    photos: [],
  }
}

export function normaliser(d: any): any {
  const v = donneesVides()
  const s = d || {}
  return {
    ...v, ...s,
    contexte: { ...v.contexte, ...(s.contexte || {}) },
    motif: { ...v.motif, ...(s.motif || {}), douleurs: s.motif?.douleurs || [] },
    examen: s.examen || {},
    posture: s.posture || {},
    marche: s.marche || {},
    semelles: { ...v.semelles, ...(s.semelles || {}), elements: s.semelles?.elements?.length ? s.semelles.elements : v.semelles.elements },
    photos: s.photos || [],
  }
}

const rempli = (o: any): boolean => Object.values(o || {}).some((x: any) =>
  typeof x === 'string' ? x.trim() !== '' : Array.isArray(x) ? x.length > 0 : x && typeof x === 'object' ? rempli(x) : !!x)

export function etapeRemplie(cle: string, d: any): boolean {
  switch (cle) {
    case 'contexte': return rempli(d.contexte)
    case 'motif': return rempli(d.motif)
    case 'examen': return rempli(d.examen) || !!d.examen_remarques?.trim() || d.photos.length > 0
    case 'posture': return rempli(d.posture) || !!d.posture_remarques?.trim()
    case 'marche': return rempli(d.marche) || !!d.marche_remarques?.trim()
    case 'synthese': return !!d.synthese?.trim()
    case 'semelles': return d.semelles.elements.some((e: any) => e.G || e.D) ||
      !!(d.semelles.gabarit || d.semelles.type || d.semelles.recouvrement || d.semelles.conseils || d.semelles.controle || d.semelles.port)
  }
  return false
}

export function syntheseProposee(d: any): string {
  const phrases: string[] = []
  const anomalies = (cote: 'G' | 'D') => EXAMEN.filter(c => {
    const v = d.examen[c.cle]?.[cote]
    return v && v !== c.options[0]
  }).map(c => {
    const v = d.examen[c.cle][cote]
    const p = d.examen[c.cle][cote === 'G' ? 'precG' : 'precD']
    return `${c.libelle.toLowerCase()} ${v.toLowerCase()}${p ? ` (${p})` : ''}`
  })
  const g = anomalies('G'), dr = anomalies('D')
  if (g.length) phrases.push(`À gauche, l'examen retrouve : ${g.join(', ')}.`)
  if (dr.length) phrases.push(`À droite, l'examen retrouve : ${dr.join(', ')}.`)
  if (!g.length && !dr.length && Object.keys(d.examen).length) phrases.push("L'examen clinique des pieds ne retrouve pas d'anomalie notable.")
  const post = POSTURE.filter(c => d.posture[c.cle] && d.posture[c.cle] !== c.options[0]).map(c => `${c.libelle.toLowerCase()} ${d.posture[c.cle].toLowerCase()}`)
  if (post.length) phrases.push(`Sur le plan postural : ${post.join(', ')}.`)
  const mar = MARCHE.filter(c => d.marche[c.cle] && d.marche[c.cle] !== c.options[0]).map(c => `${c.libelle.toLowerCase()} ${d.marche[c.cle].toLowerCase()}`)
  if (mar.length) phrases.push(`À la marche : ${mar.join(', ')}.`)
  const el = d.semelles.elements.filter((e: any) => e.G || e.D)
    .map((e: any) => `${e.libelle.replace(/ \(.*\)$/, '').toLowerCase()} ${e.G && e.D ? 'des deux côtés' : e.G ? 'à gauche' : 'à droite'}`)
  if (el.length) phrases.push(`Réalisation d'orthèses plantaires comprenant : ${el.join(', ')}.`)
  return phrases.join(' ')
}
