'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const CATEGORIES: [string, string][] = [
  ['achats', 'Achats (consommables, petit matériel)'],
  ['loyer', 'Loyer et charges locatives'],
  ['location_materiel', 'Location de matériel'],
  ['entretien', 'Entretien et réparations'],
  ['energie', 'Eau, gaz, électricité'],
  ['honoraires', 'Honoraires (comptable, AGA)'],
  ['assurances', 'Assurances'],
  ['vehicule', 'Frais de véhicule'],
  ['deplacements', 'Autres déplacements'],
  ['cotisations_sociales', 'Cotisations sociales (URSSAF, CARPIMKO)'],
  ['cotisations_pro', 'Cotisations professionnelles'],
  ['formation', 'Formation, congrès, documentation'],
  ['telecom', 'Téléphone, internet, logiciels'],
  ['banque', 'Frais bancaires'],
  ['impots', 'Impôts et taxes (CFE)'],
  ['autres', 'Autres frais de gestion'],
]
const libCat = (k: string) => CATEGORIES.find(c => c[0] === k)?.[1] || 'Non classé'
const PAIEMENTS = ['Carte bancaire', 'Prélèvement', 'Virement', 'Chèque', 'Espèces']
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const COLONNES = 'id, date_charge, fournisseur, libelle, categorie, montant, mode_paiement, cabinet_id, justificatif_path, recurrente_id, source'
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function compresser(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const r = Math.min(1, 2000 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = URL.createObjectURL(file)
  })
}
function enBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob) })
}

type Brouillon = { date_charge: string; fournisseur: string; libelle: string; categorie: string; montant: string; mode_paiement: string; cabinet_id: string; justificatif_path: string | null; recurrent: boolean }

export default function Charges() {
  const [uid, setUid] = useState('')
  const [cabinets, setCabinets] = useState<any[]>([])
  const [partDefaut, setPartDefaut] = useState(100)
  const [mois, setMois] = useState(iso(new Date()).slice(0, 7))
  const [charges, setCharges] = useState<any[]>([])
  const [recurrentes, setRecurrentes] = useState<any[]>([])
  const [recettes, setRecettes] = useState<any[]>([])
  const [onglet, setOnglet] = useState<'mois' | 'recurrentes'>('mois')
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [lecture, setLecture] = useState(false)
  const [etat, setEtat] = useState('')
  const [pret, setPret] = useState(false)

  const [annee, moisNum] = mois.split('-').map(Number)
  const debut = `${mois}-01`
  const fin = iso(new Date(annee, moisNum, 0))

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('cabinets').select('id, nom, retrocession').eq('praticien_id', session.user.id).order('created_at'),
        supabase.from('praticiens').select('retrocession').eq('id', session.user.id).single(),
      ])
      setCabinets(c || []); setPartDefaut(p?.retrocession ?? 100)
      setUid(session.user.id)
    })()
  }, [])

  const chargerMois = async (id: string) => {
    setPret(false)
    const supabase = createClient()
    const [{ data: rec }, { data: f }] = await Promise.all([
      supabase.from('charges_recurrentes').select('*').eq('praticien_id', id).order('created_at'),
      supabase.from('factures').select('total, statut, cabinet').eq('praticien_id', id).gte('date_facture', debut).lte('date_facture', fin).range(0, 4999),
    ])
    setRecurrentes(rec || []); setRecettes(f || [])
    if (mois <= iso(new Date()).slice(0, 7) && rec && rec.length) {
      const { data: deja } = await supabase.from('charges').select('recurrente_id').eq('praticien_id', id)
        .gte('date_charge', debut).lte('date_charge', fin).not('recurrente_id', 'is', null)
      const faits = new Set((deja || []).map((x: any) => x.recurrente_id))
      const dernierJour = new Date(annee, moisNum, 0).getDate()
      const aCreer = rec.filter((r: any) => r.actif && r.date_debut <= fin && (!r.date_fin || r.date_fin >= debut) && !faits.has(r.id))
        .map((r: any) => ({
          praticien_id: id, cabinet_id: r.cabinet_id, fournisseur: r.fournisseur, libelle: r.libelle, categorie: r.categorie,
          montant: r.montant, mode_paiement: r.mode_paiement, recurrente_id: r.id, source: 'recurrente',
          date_charge: `${mois}-${String(Math.min(r.jour_du_mois || 1, dernierJour)).padStart(2, '0')}`,
        }))
      if (aCreer.length) await supabase.from('charges').insert(aCreer)
    }
    const { data: ch } = await supabase.from('charges').select(COLONNES).eq('praticien_id', id).gte('date_charge', debut).lte('date_charge', fin).order('date_charge')
    setCharges(ch || [])
    setPret(true)
  }
  useEffect(() => { if (uid) chargerMois(uid) }, [uid, mois])

  const changerMois = (delta: number) => setMois(iso(new Date(annee, moisNum - 1 + delta, 1)).slice(0, 7))
  const nouveauBrouillon = (): Brouillon => ({
    date_charge: mois === iso(new Date()).slice(0, 7) ? iso(new Date()) : debut,
    fournisseur: '', libelle: '', categorie: 'achats', montant: '', mode_paiement: 'Carte bancaire', cabinet_id: '', justificatif_path: null, recurrent: false,
  })

  const lireFacture = async (file: File) => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setLecture(true); setEtat('Lecture de la facture…')
    const b = nouveauBrouillon()
    try {
      const estPdf = file.type === 'application/pdf'
      if (estPdf && file.size > 4 * 1024 * 1024) throw new Error('PDF trop lourd (4 Mo maximum)')
      const blob: Blob = estPdf ? file : await compresser(file)
      const chemin = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${estPdf ? 'pdf' : 'jpg'}`
      const { error: eUp } = await supabase.storage.from('justificatifs').upload(chemin, blob, { contentType: estPdf ? 'application/pdf' : 'image/jpeg' })
      if (eUp) throw new Error(eUp.message)
      b.justificatif_path = chemin
      const res = await fetch('/api/analyse-justificatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ fichier: await enBase64(blob), type: estPdf ? 'application/pdf' : 'image/jpeg' }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || 'Lecture impossible')
      setBrouillon({
        ...b,
        date_charge: r.date || b.date_charge,
        fournisseur: r.fournisseur || '', libelle: r.libelle || '',
        categorie: CATEGORIES.some(c => c[0] === r.categorie) ? r.categorie : 'autres',
        montant: r.montant ? String(r.montant) : '',
        mode_paiement: PAIEMENTS.includes(r.mode_paiement) ? r.mode_paiement : b.mode_paiement,
      })
      setEtat('Vérifie les informations lues, puis enregistre.')
    } catch (e: any) {
      if (b.justificatif_path) setBrouillon(b)
      setEtat('Lecture automatique impossible (' + (e?.message || 'erreur') + '), complète à la main.')
    }
    setLecture(false)
  }

  const enregistrerBrouillon = async () => {
    if (!brouillon) return
    const montant = parseFloat(brouillon.montant.replace(',', '.'))
    if (!brouillon.date_charge || isNaN(montant)) { alert('Indique au moins une date et un montant.'); return }
    const { data, error } = await createClient().from('charges').insert({
      praticien_id: uid, date_charge: brouillon.date_charge, fournisseur: brouillon.fournisseur || null, libelle: brouillon.libelle || null,
      categorie: brouillon.categorie, montant, mode_paiement: brouillon.mode_paiement, cabinet_id: brouillon.cabinet_id || null,
      justificatif_path: brouillon.justificatif_path, source: brouillon.justificatif_path ? 'photo' : 'manuel',
    }).select(COLONNES).single()
    if (error) { alert('Erreur : ' + error.message); return }
    if (brouillon.recurrent) {
      const rec = await creerRecurrenceDepuis(data)
      if (rec) data.recurrente_id = rec.id
    }
    if (data.date_charge >= debut && data.date_charge <= fin) setCharges(cs => [...cs, data].sort((a, b) => a.date_charge.localeCompare(b.date_charge)))
    else setEtat(`Charge enregistrée sur ${MOIS[Number(data.date_charge.slice(5, 7)) - 1].toLowerCase()}`)
    setBrouillon(null)
    if (data.date_charge >= debut && data.date_charge <= fin) setEtat('Charge enregistrée')
  }
  const annulerBrouillon = async () => {
    if (brouillon?.justificatif_path) await createClient().storage.from('justificatifs').remove([brouillon.justificatif_path])
    setBrouillon(null); setEtat('')
  }

  const majLocale = (id: string, champs: any) => setCharges(cs => cs.map(c => (c.id === id ? { ...c, ...champs } : c)))
  const enregistrer = async (id: string, champs: any) => {
    majLocale(id, champs)
    const { error } = await createClient().from('charges').update(champs).eq('id', id)
    setEtat(error ? 'Erreur : ' + error.message : 'Enregistré')
  }
  const supprimer = async (c: any) => {
    if (!confirm(`Supprimer la charge « ${c.fournisseur || c.libelle || libCat(c.categorie)} » ?${c.recurrente_id ? ' Elle sera recréée au prochain chargement tant que la charge récurrente est active.' : ''}`)) return
    const supabase = createClient()
    if (c.justificatif_path) await supabase.storage.from('justificatifs').remove([c.justificatif_path])
    const { error } = await supabase.from('charges').delete().eq('id', c.id)
    if (error) { setEtat('Erreur : ' + error.message); return }
    setCharges(cs => cs.filter(x => x.id !== c.id))
  }
  const voirJustificatif = async (path: string) => {
    const fenetre = window.open('', '_blank')
    const { data } = await createClient().storage.from('justificatifs').createSignedUrl(path, 600)
    if (data?.signedUrl && fenetre) fenetre.location.href = data.signedUrl
    else if (fenetre) fenetre.close()
  }

  const creerRecurrenceDepuis = async (c: any) => {
    const d = new Date(c.date_charge + 'T12:00:00')
    const supabase = createClient()
    const { data: rec, error } = await supabase.from('charges_recurrentes').insert({
      praticien_id: uid, cabinet_id: c.cabinet_id || null, libelle: c.libelle || c.fournisseur || libCat(c.categorie),
      fournisseur: c.fournisseur || null, categorie: c.categorie, montant: Number(c.montant) || 0,
      mode_paiement: c.mode_paiement || 'Prélèvement', jour_du_mois: Math.min(28, d.getDate()),
      date_debut: iso(new Date(d.getFullYear(), d.getMonth(), 1)), actif: true,
    }).select('*').single()
    if (error || !rec) { alert('Erreur : ' + (error?.message || 'répétition impossible')); return null }
    await supabase.from('charges').update({ recurrente_id: rec.id }).eq('id', c.id)
    setRecurrentes(rs => [...rs, rec])
    return rec
  }
  const rendreMensuelle = async (c: any) => {
    const jour = Math.min(28, Number(String(c.date_charge).slice(8, 10)) || 1)
    if (!confirm('Répéter « ' + (c.fournisseur || c.libelle || libCat(c.categorie)) + ' » (' + eur(Number(c.montant) || 0) + ') tous les mois, le ' + jour + ' ?')) return
    const rec = await creerRecurrenceDepuis(c)
    if (rec) { majLocale(c.id, { recurrente_id: rec.id }); setEtat('Cette charge sera créée automatiquement chaque mois.') }
  }

  const ajouterRecurrente = async (modele: any = {}) => {
    const row = { praticien_id: uid, libelle: 'Nouvelle charge', categorie: 'autres', montant: 0, jour_du_mois: 1, date_debut: debut, actif: true, mode_paiement: 'Prélèvement', cabinet_id: null, ...modele }
    const { data, error } = await createClient().from('charges_recurrentes').insert(row).select('*').single()
    if (error) { alert('Erreur : ' + error.message); return }
    setRecurrentes(rs => [...rs, data])
    setEtat('Charge récurrente ajoutée, elle sera créée automatiquement chaque mois.')
  }
  const majRec = (id: string, champs: any) => setRecurrentes(rs => rs.map(r => (r.id === id ? { ...r, ...champs } : r)))
  const enregistrerRec = async (id: string, champs: any) => {
    majRec(id, champs)
    const { error } = await createClient().from('charges_recurrentes').update(champs).eq('id', id)
    setEtat(error ? 'Erreur : ' + error.message : 'Enregistré')
  }
  const supprimerRec = async (r: any) => {
    if (!confirm(`Supprimer la charge récurrente « ${r.libelle} » ? Les charges déjà créées restent dans tes comptes.`)) return
    const { error } = await createClient().from('charges_recurrentes').delete().eq('id', r.id)
    if (error) { alert('Erreur : ' + error.message); return }
    setRecurrentes(rs => rs.filter(x => x.id !== r.id))
  }

  const partDe = (f: any) => cabinets.find(c => c.nom === f.cabinet)?.retrocession ?? partDefaut
  const recettesActives = recettes.filter(f => f.statut !== 'annulee')
  const totalRecettes = recettesActives.reduce((s, f) => s + Number(f.total || 0), 0)
  const maPart = recettesActives.reduce((s, f) => s + Number(f.total || 0) * partDe(f) / 100, 0)
  const totalCharges = charges.reduce((s, c) => s + Number(c.montant || 0), 0)
  const resultat = maPart - totalCharges
  const parCat: Record<string, number> = {}
  charges.forEach(c => { parCat[c.categorie] = (parCat[c.categorie] || 0) + Number(c.montant || 0) })
  const listeCat = Object.entries(parCat).sort((a, b) => b[1] - a[1])
  const livry = cabinets.find(c => /livry/i.test(c.nom))
  const aLoyer = recurrentes.some(r => r.categorie === 'loyer')

  const selectCab = (valeur: string | null, onChange: (v: string | null) => void) => (
    <select className="ch-champ" value={valeur || ''} onChange={e => onChange(e.target.value || null)} aria-label="Cabinet">
      <option value="">Commune</option>
      {cabinets.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
    </select>
  )
  const selectCat = (valeur: string, onChange: (v: string) => void) => (
    <select className="ch-champ" value={valeur} onChange={e => onChange(e.target.value)} aria-label="Catégorie">
      {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  )

  return (
    <div className="ch">
      <style>{`
        .ch{padding:30px 36px 48px;max-width:1320px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
        .ch *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .ch-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .ch-titre{font-family:var(--font-display);font-weight:400;font-size:34px;margin:0}
        .ch-petit{font-size:12.5px;color:var(--fg-3)}
        .ch-petit a{color:var(--fg-2)}
        .ch-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .ch-mois{display:flex;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:3px}
        .ch-mois button{border:none;background:none;width:32px;height:32px;border-radius:9px;cursor:pointer;color:var(--fg-2);font-size:17px}
        .ch-mois span{font-size:14px;min-width:130px;text-align:center}
        .ch-principal{font:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;border-radius:11px;border:none;background:var(--accent);color:var(--accent-fg);cursor:pointer;display:inline-flex;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.12)}
        .ch-principal[aria-disabled=true]{opacity:.6;cursor:default}
        .ch-bouton{font:inherit;font-size:13.5px;padding:11px 16px;border-radius:11px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
        .ch-bouton:hover{border-color:var(--accent)}
        .ch-onglets{display:flex;gap:4px;border-bottom:1px solid var(--line)}
        .ch-onglets button{font:inherit;font-size:14px;border:none;background:none;padding:10px 14px;color:var(--fg-3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
        .ch-onglets button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
        .ch-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .ch-carte{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;min-width:0;box-sizing:border-box}
        .ch-kpi b{font-family:var(--font-display);font-weight:400;font-size:30px;font-variant-numeric:tabular-nums}
        .ch-resultat{background:var(--dark);color:var(--on-dark);border-color:transparent}
        .ch-resultat .ch-petit{color:inherit;opacity:.75}
        .ch-corps{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start}
        .ch-ligne{display:grid;grid-template-columns:130px minmax(0,1.4fr) minmax(0,1.3fr) 120px 110px 92px;gap:6px;align-items:center;padding:5px 4px;border-radius:10px}
        .ch-ligne:not(.ch-titres):hover{background:var(--surface-2)}
        .ch-titres{font-size:12px;color:var(--fg-3);border-bottom:1px solid var(--line-2);border-radius:0;padding-bottom:8px;margin-bottom:4px}
        .ch-titres span{padding-left:9px}
        .ch-champ{appearance:none;-webkit-appearance:none;width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;color:var(--fg);padding:8px 9px;border:1px solid transparent;border-radius:9px;background:transparent;text-overflow:ellipsis}
        .ch-champ:hover{border-color:var(--line);background:var(--surface)}
        .ch-champ:focus{outline:none;border-color:var(--accent);background:var(--surface)}
        .ch-form .ch-champ{border-color:var(--line);background:var(--surface)}
        .ch-montant{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;-moz-appearance:textfield}
        .ch-montant::-webkit-outer-spin-button,.ch-montant::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .ch-double{display:flex;flex-direction:column}
        .ch-double .ch-champ:last-child{font-size:12.5px;color:var(--fg-3);padding-top:2px}
        .ch-badge{font-size:11px;font-weight:600;border-radius:20px;padding:2px 8px;background:var(--accent-soft);color:var(--fg-2);margin-left:9px;align-self:flex-start}
        .ch-icones{display:flex;justify-content:flex-end;gap:2px}
        .ch-icone{border:none;background:none;width:28px;height:28px;border-radius:8px;cursor:pointer;color:var(--fg-2);font-size:13px}
        .ch-icone:hover{background:var(--surface-3)}
        .ch-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .ch-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--fg-3)}
        .ch-cat{display:flex;flex-direction:column;gap:5px;font-size:13px}
        .ch-piste{height:8px;background:var(--line-2);border-radius:8px;overflow:hidden}
        .ch-piste i{display:block;height:100%;background:var(--accent);border-radius:8px}
        .ch-vide{padding:36px 0 20px;text-align:center;color:var(--fg-3);font-size:14px;line-height:1.6}
        .ch-rec{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1.3fr) 130px 110px 90px 90px 36px;gap:6px;align-items:center;padding:5px 4px}
        .ch-suggestion{font:inherit;font-size:13px;padding:9px 13px;border-radius:10px;border:1px dashed var(--accent);background:var(--accent-soft);color:var(--fg);cursor:pointer}
        @media (max-width:1100px){.ch-corps{grid-template-columns:1fr}.ch-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ch-form{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (max-width:760px){.ch{padding:18px 14px 90px}.ch-titres{display:none!important}.ch-ligne,.ch-rec{grid-template-columns:1fr 1fr;border-bottom:1px solid var(--line-2);border-radius:0;padding:10px 0}}
      `}</style>

      <header className="ch-tete">
        <div>
          <h1 className="ch-titre">Charges</h1>
          <p className="ch-petit" style={{ margin: '4px 0 0' }}><a href="/dashboard/comptabilite">Retour à la compta</a></p>
        </div>
        <div className="ch-actions">
          <div className="ch-mois">
            <button onClick={() => changerMois(-1)} aria-label="Mois précédent">‹</button>
            <span>{MOIS[moisNum - 1]} {annee}</span>
            <button onClick={() => changerMois(1)} aria-label="Mois suivant">›</button>
          </div>
          <label className="ch-principal" aria-disabled={lecture}>
            {lecture ? 'Lecture…' : 'Ajouter depuis une facture'}
            <input type="file" accept="image/*,application/pdf" hidden disabled={lecture}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setOnglet('mois'); lireFacture(f) } }} />
          </label>
          <button className="ch-bouton" onClick={() => { setOnglet('mois'); setBrouillon(nouveauBrouillon()); setEtat('') }}>Saisir à la main</button>
        </div>
      </header>

      <section className="ch-kpis">
        <div className="ch-carte ch-kpi"><span className="ch-petit">Recettes du mois</span><b>{eur(totalRecettes)}</b></div>
        <div className="ch-carte ch-kpi"><span className="ch-petit">Ma part</span><b>{eur(maPart)}</b><span className="ch-petit">après rétrocession</span></div>
        <div className="ch-carte ch-kpi"><span className="ch-petit">Charges du mois</span><b>{eur(totalCharges)}</b><span className="ch-petit">{charges.length} dépense{charges.length > 1 ? 's' : ''}</span></div>
        <div className="ch-carte ch-kpi ch-resultat"><span className="ch-petit">Résultat du mois</span><b style={{ color: resultat >= 0 ? '#8fe0a8' : '#ffb4a2' }}>{eur(resultat)}</b><span className="ch-petit">ma part moins les charges</span></div>
      </section>

      <div className="ch-onglets" role="tablist">
        <button role="tab" aria-selected={onglet === 'mois'} onClick={() => setOnglet('mois')}>Dépenses du mois</button>
        <button role="tab" aria-selected={onglet === 'recurrentes'} onClick={() => setOnglet('recurrentes')}>Charges récurrentes ({recurrentes.length})</button>
      </div>
      {etat && <p className="ch-petit" aria-live="polite" style={{ margin: 0 }}>{etat}</p>}

      {onglet === 'mois' && brouillon && (
        <section className="ch-carte">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <strong style={{ fontSize: 15 }}>Nouvelle charge</strong>
            {brouillon.justificatif_path && <button className="ch-bouton" style={{ padding: '6px 12px' }} onClick={() => voirJustificatif(brouillon.justificatif_path!)}>Voir le justificatif</button>}
          </div>
          <div className="ch-form">
            <label>Date<input type="date" className="ch-champ" value={brouillon.date_charge} onChange={e => setBrouillon({ ...brouillon, date_charge: e.target.value })} /></label>
            <label>Fournisseur<input className="ch-champ" value={brouillon.fournisseur} placeholder="Pharmacie, Orange…" onChange={e => setBrouillon({ ...brouillon, fournisseur: e.target.value })} /></label>
            <label style={{ gridColumn: 'span 2' }}>Description<input className="ch-champ" value={brouillon.libelle} placeholder="Ce qui a été acheté" onChange={e => setBrouillon({ ...brouillon, libelle: e.target.value })} /></label>
            <label>Catégorie{selectCat(brouillon.categorie, v => setBrouillon({ ...brouillon, categorie: v }))}</label>
            <label>Cabinet{selectCab(brouillon.cabinet_id, v => setBrouillon({ ...brouillon, cabinet_id: v || '' }))}</label>
            <label>Paiement
              <select className="ch-champ" value={brouillon.mode_paiement} onChange={e => setBrouillon({ ...brouillon, mode_paiement: e.target.value })}>
                {PAIEMENTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Montant TTC (€)<input className="ch-champ ch-montant" inputMode="decimal" value={brouillon.montant} placeholder="0,00" onChange={e => setBrouillon({ ...brouillon, montant: e.target.value })} /></label>
            <label style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--fg)', cursor: 'pointer' }}>
              <input type="checkbox" checked={brouillon.recurrent} onChange={e => setBrouillon({ ...brouillon, recurrent: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
              Répéter cette charge tous les mois, le {Math.min(28, Number(brouillon.date_charge.slice(8, 10)) || 1)} du mois
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ch-principal" onClick={enregistrerBrouillon}>Enregistrer la charge</button>
            <button className="ch-bouton" onClick={annulerBrouillon}>Annuler</button>
          </div>
        </section>
      )}

      {onglet === 'mois' && (
        <div className="ch-corps">
          <section className="ch-carte">
            {!pret ? <p className="ch-vide">Chargement…</p> : charges.length === 0 ? (
              <p className="ch-vide">Aucune charge en {MOIS[moisNum - 1].toLowerCase()}.<br />Ajoute une facture en photo ou saisis une dépense à la main.</p>
            ) : (
              <>
                <div className="ch-ligne ch-titres"><span>Date</span><span>Fournisseur</span><span>Catégorie</span><span>Cabinet</span><span style={{ textAlign: 'right', paddingRight: 9 }}>Montant</span><span /></div>
                {charges.map(c => (
                  <div key={c.id} className="ch-ligne">
                    <input type="date" className="ch-champ" value={c.date_charge} onChange={e => enregistrer(c.id, { date_charge: e.target.value })} aria-label="Date" />
                    <div className="ch-double">
                      <input className="ch-champ" value={c.fournisseur || ''} placeholder="Fournisseur" aria-label="Fournisseur"
                        onChange={e => majLocale(c.id, { fournisseur: e.target.value })} onBlur={e => enregistrer(c.id, { fournisseur: e.target.value || null })} />
                      <input className="ch-champ" value={c.libelle || ''} placeholder="Description" aria-label="Description"
                        onChange={e => majLocale(c.id, { libelle: e.target.value })} onBlur={e => enregistrer(c.id, { libelle: e.target.value || null })} />
                      {c.recurrente_id && <span className="ch-badge">récurrente</span>}
                    </div>
                    {selectCat(c.categorie, v => enregistrer(c.id, { categorie: v }))}
                    {selectCab(c.cabinet_id, v => enregistrer(c.id, { cabinet_id: v }))}
                    <input className="ch-champ ch-montant" type="number" step="0.01" value={c.montant ?? 0} aria-label="Montant"
                      onChange={e => majLocale(c.id, { montant: e.target.value })} onBlur={e => enregistrer(c.id, { montant: parseFloat(e.target.value) || 0 })} />
                    <div className="ch-icones">
                      {c.justificatif_path && <button className="ch-icone" title="Voir le justificatif" aria-label="Voir le justificatif" onClick={() => voirJustificatif(c.justificatif_path)}>📎</button>}
                      {!c.recurrente_id && <button className="ch-icone" title="Répéter tous les mois" aria-label="Répéter tous les mois" onClick={() => rendreMensuelle(c)}>↻</button>}
                      <button className="ch-icone" title="Supprimer" aria-label="Supprimer" onClick={() => supprimer(c)}>✕</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
          <aside className="ch-carte">
            <strong style={{ fontSize: 15 }}>Par catégorie</strong>
            {listeCat.length === 0 && <p className="ch-petit" style={{ margin: 0 }}>Rien pour ce mois.</p>}
            {listeCat.map(([k, v]) => (
              <div key={k} className="ch-cat">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{libCat(k)}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{eur(v)}</b></div>
                <div className="ch-piste"><i style={{ width: Math.round(v / Math.max(1, totalCharges) * 100) + '%' }} /></div>
              </div>
            ))}
          </aside>
        </div>
      )}

      {onglet === 'recurrentes' && (
        <section className="ch-carte">
          <p className="ch-petit" style={{ margin: 0 }}>Ces charges sont créées automatiquement chaque mois, à la date indiquée. Modifier une ligne ici ne change pas les mois déjà passés.</p>
          {!aLoyer && livry && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="ch-suggestion" onClick={() => ajouterRecurrente({ libelle: 'Loyer cabinet Livry-Gargan', fournisseur: 'SCI Les Ombrages', categorie: 'loyer', montant: 694, cabinet_id: livry.id, date_debut: '2026-09-01' })}>+ Loyer Livry-Gargan, 694 €</button>
              <button className="ch-suggestion" onClick={() => ajouterRecurrente({ libelle: 'Provision de charges Livry-Gargan', fournisseur: 'SCI Les Ombrages', categorie: 'loyer', montant: 72, cabinet_id: livry.id, date_debut: '2026-09-01' })}>+ Provision de charges Livry-Gargan, 72 €</button>
            </div>
          )}
          {recurrentes.length > 0 && (
            <div>
              <div className="ch-rec ch-titres" style={{ display: 'grid' }}><span>Libellé</span><span>Catégorie</span><span>Cabinet</span><span style={{ textAlign: 'right' }}>Montant</span><span>Jour</span><span>Active</span><span /></div>
              {recurrentes.map(r => (
                <div key={r.id} className="ch-rec">
                  <input className="ch-champ" value={r.libelle} aria-label="Libellé" onChange={e => majRec(r.id, { libelle: e.target.value })} onBlur={e => enregistrerRec(r.id, { libelle: e.target.value || 'Charge' })} />
                  {selectCat(r.categorie, v => enregistrerRec(r.id, { categorie: v }))}
                  {selectCab(r.cabinet_id, v => enregistrerRec(r.id, { cabinet_id: v }))}
                  <input className="ch-champ ch-montant" type="number" step="0.01" value={r.montant ?? 0} aria-label="Montant"
                    onChange={e => majRec(r.id, { montant: e.target.value })} onBlur={e => enregistrerRec(r.id, { montant: parseFloat(e.target.value) || 0 })} />
                  <input className="ch-champ" type="number" min={1} max={28} value={r.jour_du_mois} aria-label="Jour du mois"
                    onChange={e => majRec(r.id, { jour_du_mois: e.target.value })} onBlur={e => enregistrerRec(r.id, { jour_du_mois: Math.max(1, Math.min(28, parseInt(e.target.value) || 1)) })} />
                  <button className="ch-bouton" style={{ padding: '7px 10px', background: r.actif ? 'var(--dark)' : 'var(--surface)', color: r.actif ? 'var(--on-dark)' : 'var(--fg-3)' }}
                    onClick={() => enregistrerRec(r.id, { actif: !r.actif })} aria-pressed={r.actif}>{r.actif ? 'Oui' : 'Non'}</button>
                  <button className="ch-icone" aria-label="Supprimer" title="Supprimer" onClick={() => supprimerRec(r)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button className="ch-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => ajouterRecurrente()}>+ Ajouter une charge récurrente</button>
        </section>
      )}
    </div>
  )
}
