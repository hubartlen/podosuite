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
