const CIVILITES = ['MR', 'M', 'MME', 'MLLE', 'MONSIEUR', 'MADAME']

export const normNom = (s: string) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim()

const sansCivilite = (s: string) => normNom(s).split(' ').filter(m => !CIVILITES.includes(m)).join(' ')

export async function prochainNumero(supabase: any, uid: string, annee: string): Promise<string> {
  const { data } = await supabase.from('factures').select('numero').eq('praticien_id', uid)
    .like('numero', 'FAC-' + annee + '-%').order('numero', { ascending: false }).limit(1)
  const dernier = data && data[0] ? parseInt(String(data[0].numero).split('-')[2]) || 0 : 0
  return 'FAC-' + annee + '-' + String(dernier + 1).padStart(4, '0')
}

export function trouverPatient(patients: any[], nomComplet: string): any | null {
  const cible = sansCivilite(nomComplet)
  if (!cible) return null
  const mots = cible.split(' ')
  const trouves = patients.filter(p => {
    const nom = normNom(p.nom), prenom = normNom(p.prenom)
    if (!nom) return false
    if (cible === (nom + ' ' + prenom).trim() || cible === (prenom + ' ' + nom).trim()) return true
    return nom.split(' ').every(m => mots.includes(m)) && (!prenom || prenom.split(' ').every(m => mots.includes(m)))
  })
  return trouves.length === 1 ? trouves[0] : null
}

export function patientDepuisNom(nomComplet: string): any {
  const mots = (nomComplet || '').trim().split(/\s+/).filter(m => !CIVILITES.includes(normNom(m)))
  const nom = mots.filter(m => m === m.toUpperCase()).join(' ')
  const prenom = mots.filter(m => m !== m.toUpperCase()).join(' ')
  return { nom: nom || mots.join(' '), prenom, sexe: null, date_naissance: null }
}


export async function toutCharger(requete: (de: number, a: number) => any): Promise<any[]> {
  const res: any[] = []
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await requete(de, de + 999)
    if (error || !data) break
    res.push(...data)
    if (data.length < 1000) break
  }
  return res
}

export async function relierRecettes(supabase: any, uid: string, appliquer = true) {
  const vide = { relies: [] as [string, string][], crees: 0, ambigus: 0, aRelier: 0, aCreer: 0, recettes: 0 }
  const factures = await toutCharger((de, a) => supabase.from('factures').select('id, patient_nom').eq('praticien_id', uid).is('patient_id', null).not('patient_nom', 'is', null).range(de, a))
  if (!factures.length) return vide
  const patients = await toutCharger((de, a) => supabase.from('patients').select('id, nom, prenom').eq('praticien_id', uid).range(de, a))
  const index = new Map<string, Set<string>>()
  const noter = (k: string, id: string) => { if (!k) return; if (!index.has(k)) index.set(k, new Set()); index.get(k)!.add(id) }
  for (const p of patients) {
    const n = normNom(p.nom), pr = normNom(p.prenom)
    noter((n + ' ' + pr).trim(), p.id)
    noter((pr + ' ' + n).trim(), p.id)
  }
  const liens: [string, string][] = []
  const nouveaux = new Map<string, { nom: string; prenom: string; ids: string[] }>()
  let ambigus = 0
  for (const f of factures) {
    const cle = sansCivilite(f.patient_nom || '')
    if (!cle) continue
    const c = index.get(cle)
    if (c && c.size === 1) liens.push([f.id, Array.from(c)[0]])
    else if (c && c.size > 1) ambigus++
    else {
      if (!nouveaux.has(cle)) { const d = patientDepuisNom(f.patient_nom); nouveaux.set(cle, { nom: d.nom, prenom: d.prenom, ids: [] }) }
      nouveaux.get(cle)!.ids.push(f.id)
    }
  }
  const recettesNouvelles = Array.from(nouveaux.values()).reduce((t, e) => t + e.ids.length, 0)
  if (!appliquer) return { ...vide, ambigus, aRelier: liens.length, aCreer: nouveaux.size, recettes: liens.length + recettesNouvelles }

  let crees = 0
  const lots = Array.from(nouveaux.values())
  for (let i = 0; i < lots.length; i += 200) {
    const lot = lots.slice(i, i + 200)
    const { data, error } = await supabase.from('patients').insert(lot.map(e => ({ praticien_id: uid, nom: e.nom || 'Inconnu', prenom: e.prenom || '' }))).select('id, nom, prenom')
    if (error || !data) continue
    const parCle = new Map<string, string>()
    data.forEach((p: any) => parCle.set((normNom(p.nom) + ' ' + normNom(p.prenom)).trim(), p.id))
    for (const e of lot) {
      const id = parCle.get((normNom(e.nom || 'Inconnu') + ' ' + normNom(e.prenom)).trim())
      if (id) { crees++; e.ids.forEach(fid => liens.push([fid, id])) }
    }
  }
  const parPatient = new Map<string, string[]>()
  liens.forEach(([fid, pid]) => { if (!parPatient.has(pid)) parPatient.set(pid, []); parPatient.get(pid)!.push(fid) })
  const taches = Array.from(parPatient.entries())
  const relies: [string, string][] = []
  for (let i = 0; i < taches.length; i += 8) {
    await Promise.all(taches.slice(i, i + 8).map(async ([pid, fids]) => {
      for (let k = 0; k < fids.length; k += 200) {
        const part = fids.slice(k, k + 200)
        const { error } = await supabase.from('factures').update({ patient_id: pid }).in('id', part)
        if (!error) part.forEach(fid => relies.push([fid, pid]))
      }
    }))
  }
  return { ...vide, relies, crees, ambigus, recettes: relies.length }
}
