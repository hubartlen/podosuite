export interface Patient {
  id: string
  praticien_id: string
  nom: string
  prenom: string
  date_naissance: string | null
  sexe: 'M' | 'F'
  telephone: string | null
  email: string | null
  adresse: string | null
  num_secu: string | null
  mutuelle: string | null
  created_at: string
}

export interface Bilan {
  id: string
  patient_id: string
  praticien_id: string
  date_bilan: string
  infection_tegumentaire: string
  hyperkeratose: string
  ongles: string
  deformations: string
  valgus_calcaneen: string
  patellas: string
  genou: string
  bassin: string
  ceinture_scapulaire: string
  semelles_hci: boolean
  semelles_hce: boolean
  semelles_barre: boolean
  semelles_coins: boolean
  talonnette_cote: string
  talonnette_mm: number | null
  remarques: string | null
  created_at: string
  patient?: Patient
}

export interface Acte {
  designation: string
  quantite: number
  prix_unitaire: number
}

export interface Facture {
  id: string
  patient_id: string
  praticien_id: string
  numero: string
  date_facture: string
  actes: Acte[]
  mode_paiement: string
  mention: string | null
  total: number
  created_at: string
  patient?: Patient
}

export interface Praticien {
  id: string
  email: string
  nom: string
  prenom: string
  rpps: string
  am: string
  telephone: string
  adresse: string
  ville: string
  code_postal: string
}
