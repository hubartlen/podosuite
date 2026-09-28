'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tarif = { designation: string; prix: number; couleur_doctolib: string | null; ordre: number }
type Cabinet = { id: string; nom: string; tarifs: Tarif[] }
type Ligne = { id: string; date: string; heure: string; nom: string; prenom: string; acte: string; prix: number; mode_paiement: string }

const PAIEMENTS = ['Carte bancaire', 'Espèces', 'Chèque', 'Virement', 'Tiers payant']

function compresser(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const r = Math.min(1, 2000 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = img.width * r
      c.height = img.height * r
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      resolve(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)

export default function ImportDoctolibRecettes({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false)
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [cabinetId, setCabinetId] = useState('')
  const [paiementDefaut, setPaiementDefaut] = useState('Carte bancaire')
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [analyse, setAnalyse] = useState(false)
  const [statut, setStatut] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('cabinets').select('id, nom, tarifs(designation, prix, couleur_doctolib, ordre)').eq('praticien_id', session.user.id).order('created_at')
      const cabs = (data || []).map((c: any) => ({ ...c, tarifs: (c.tarifs || []).sort((a: Tarif, b: Tarif) => a.ordre - b.ordre) }))
      setCabinets(cabs)
      if (cabs.length && !cabinetId) setCabinetId(cabs[0].id)
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    const coller = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files || []).filter(x => x.type.startsWith('image/'))
      if (f.length) analyser(f)
    }
    window.addEventListener('paste', coller)
    return () => window.removeEventListener('paste', coller)
  })

  const cabinet = cabinets.find(c => c.id === cabinetId)
  const prixDans = (cab: Cabinet | undefined, acte: string) => cab?.tarifs.find(t => t.designation === acte)?.prix ?? 0

  const changerCabinet = (id: string) => {
    setCabinetId(id)
    const cab = cabinets.find(c => c.id === id)
    setLignes(ls => ls.map(l => {
      const acte = cab?.tarifs.some(t => t.designation === l.acte) ? l.acte : ''
      return { ...l, acte, prix: prixDans(cab, acte) }
    }))
  }

  async function analyser(fichiers: File[]) {
    if (!cabinetId || !fichiers.length || analyse) return
    setAnalyse(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAnalyse(false); setStatut('Session expirée, reconnecte-toi.'); return }
    const nouvelles: Ligne[] = []
    let erreurs = 0
    let dernierMessage = ''
    for (let i = 0; i < fichiers.length; i++) {
      setStatut(`Analyse de la capture ${i + 1}/${fichiers.length}…`)
      try {
        const dataUrl = await compresser(fichiers[i])
        const res = await fetch('/api/import-recettes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ image: dataUrl.split(',')[1], mediaType: 'image/jpeg', cabinetId, dateDuJour: new Date().toISOString().slice(0, 10) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur')
        for (const r of data.rendez_vous || []) {
          const acte = cabinet?.tarifs.some(t => t.designation === r.acte) ? r.acte : ''
          nouvelles.push({ id: crypto.randomUUID(), date: r.date || '', heure: r.heure || '', nom: (r.nom || '').toUpperCase(), prenom: r.prenom || '', acte, prix: prixDans(cabinet, acte), mode_paiement: paiementDefaut })
        }
      } catch (e: any) {
        erreurs++
        dernierMessage = e?.message || ''
        console.error(e)
      }
    }
    setLignes(prev => {
      const cle = (l: Ligne) => `${l.date}|${l.heure}|${l.nom}`
      const vus = new Set(prev.map(cle))
      return [...prev, ...nouvelles.filter(l => !vus.has(cle(l)))].sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
    })
    setStatut(`${nouvelles.length} rendez-vous détectés.${erreurs ? ` ${erreurs} capture(s) en erreur : ${dernierMessage}` : ''}`)
    setAnalyse(false)
  }

  const maj = (id: string, champ: keyof Ligne, val: any) => setLignes(ls => ls.map(l => {
    if (l.id !== id) return l
    const n = { ...l, [champ]: val }
    if (champ === 'acte') n.prix = prixDans(cabinet, val)
    return n
  }))
  const suppr = (id: string) => setLignes(ls => ls.filter(l => l.id !== id))

  async function confirmer() {
    if (!cabinet) return
    const aVerifier = lignes.filter(l => !l.acte || !l.date || !l.nom)
    if (aVerifier.length) { alert(`${aVerifier.length} ligne(s) à compléter (acte, date ou nom) avant l'import.`); return }
    setImporting(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setImporting(false); return }
    const { data: existantes } = await supabase.from('factures').select('numero').eq('praticien_id', session.user.id).like('numero', 'DOC-%')
    const deja = new Set((existantes || []).map((f: any) => f.numero))
    const rows: any[] = []
    let doublons = 0
    for (const l of lignes) {
      const numero = `DOC-${l.date.replace(/-/g, '')}-${(l.heure || '0000').replace(':', '')}-${slug(l.nom)}`
      if (deja.has(numero)) { doublons++; continue }
      deja.add(numero)
      rows.push({
        praticien_id: session.user.id,
        numero,
        date_facture: l.date,
        patient_nom: `${l.nom} ${l.prenom}`.trim(),
        mode_paiement: l.mode_paiement,
        total: l.prix,
        cabinet: cabinet.nom,
        actes: [{ designation: l.acte, quantite: 1, prix_unitaire: l.prix }],
        statut: 'payee',
        source: 'import_doctolib',
      })
    }
    if (rows.length) {
      const { error } = await supabase.from('factures').insert(rows)
      if (error) { alert('Erreur import : ' + error.message); setImporting(false); return }
    }
    setImporting(false)
    alert(`${rows.length} recette(s) importée(s)${doublons ? `, ${doublons} déjà présente(s) ignorée(s)` : ''}.`)
    setLignes([]); setStatut(''); setOpen(false)
    onImported()
  }

  const total = lignes.reduce((s, l) => s + (Number(l.prix) || 0), 0)
  const sansCouleur = cabinet?.tarifs.filter(t => !t.couleur_doctolib).length || 0
  const champ: React.CSSProperties = { padding: '5px 8px', border: '1px solid #e2dbd0', borderRadius: '6px', fontSize: '12px', color: '#1a1410', background: '#fff', width: '100%' }
  const grille = '130px 64px 1fr 180px 130px 80px 28px'

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: '9px 16px', background: '#f5f2ee', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', color: '#4a3f35', cursor: 'pointer' }}>
        📸 Import Doctolib
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: 'min(960px, 95vw)', maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#1a1410', fontWeight: '400', marginBottom: '6px' }}>Import Doctolib</h2>
            <p style={{ fontSize: '13px', color: '#9b8f7e', marginBottom: '18px' }}>Dépose une ou plusieurs captures de ton agenda, ou colle-les avec Cmd + V. Vérifie ensuite chaque ligne avant d'importer.</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
              <select value={cabinetId} onChange={e => changerCabinet(e.target.value)} style={{ padding: '9px 14px', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', background: '#fff' }}>
                {cabinets.length === 0 && <option value="">Aucun cabinet</option>}
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <select value={paiementDefaut} onChange={e => setPaiementDefaut(e.target.value)} style={{ padding: '9px 14px', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', background: '#fff' }}>
                {PAIEMENTS.map(p => <option key={p} value={p}>Paiement par défaut : {p}</option>)}
              </select>
              <label style={{ padding: '9px 16px', background: '#1a1410', borderRadius: '10px', fontSize: '13px', color: '#f5f2ee', cursor: analyse ? 'default' : 'pointer', opacity: analyse ? 0.6 : 1 }}>
                {analyse ? 'Analyse…' : 'Ajouter des captures'}
                <input type="file" accept="image/*" multiple hidden disabled={analyse || !cabinetId} onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; analyser(f) }} />
              </label>
            </div>

            {sansCouleur > 0 && (
              <p style={{ fontSize: '12px', color: '#b45309', marginBottom: '10px' }}>{sansCouleur} acte(s) de ce cabinet n'ont pas de couleur Doctolib : renseigne-les dans Réglages pour une meilleure reconnaissance.</p>
            )}
            {statut && <p style={{ fontSize: '13px', color: '#4a3f35', marginBottom: '12px' }}>{statut}</p>}

            {lignes.length > 0 && (
              <div style={{ border: '1px solid #e2dbd0', borderRadius: '10px', overflow: 'hidden', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: grille, gap: '6px', padding: '10px 12px', background: '#f9f7f4', borderBottom: '1px solid #e2dbd0' }}>
                  {['Date', 'Heure', 'Patient', 'Acte', 'Paiement', 'Montant', ''].map(h => <span key={h} style={{ fontSize: '10px', color: '#9b8f7e', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</span>)}
                </div>
                {lignes.map(l => (
                  <div key={l.id} style={{ display: 'grid', gridTemplateColumns: grille, gap: '6px', padding: '8px 12px', borderBottom: '1px solid #f5f2ee', alignItems: 'center', background: l.acte ? '#fff' : '#fff7e6' }}>
                    <input type="date" value={l.date} onChange={e => maj(l.id, 'date', e.target.value)} style={champ} />
                    <input value={l.heure} onChange={e => maj(l.id, 'heure', e.target.value)} style={champ} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input value={l.nom} onChange={e => maj(l.id, 'nom', e.target.value.toUpperCase())} style={champ} />
                      <input value={l.prenom} onChange={e => maj(l.id, 'prenom', e.target.value)} style={champ} />
                    </div>
                    <select value={l.acte} onChange={e => maj(l.id, 'acte', e.target.value)} style={champ}>
                      <option value="">À vérifier</option>
                      {cabinet?.tarifs.map(t => <option key={t.designation} value={t.designation}>{t.designation}</option>)}
                    </select>
                    <select value={l.mode_paiement} onChange={e => maj(l.id, 'mode_paiement', e.target.value)} style={champ}>
                      {PAIEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="number" step="0.01" value={l.prix} onChange={e => maj(l.id, 'prix', parseFloat(e.target.value) || 0)} style={{ ...champ, textAlign: 'right' }} />
                    <button onClick={() => suppr(l.id)} style={{ background: 'none', border: 'none', color: '#9b8f7e', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '10px 12px', background: '#f0ebe4', fontSize: '13px', color: '#1a1410' }}>
                  <span>{lignes.length} rendez-vous</span>
                  <strong>{total.toFixed(2)} €</strong>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={confirmer} disabled={importing || lignes.length === 0} style={{ padding: '10px 20px', background: '#1a1410', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: '#f5f2ee', cursor: 'pointer', opacity: importing || lignes.length === 0 ? 0.5 : 1 }}>
                {importing ? 'Import...' : `Importer ${lignes.length} recette(s)`}
              </button>
              <button onClick={() => { setOpen(false); setLignes([]); setStatut('') }} style={{ padding: '10px 20px', background: '#f5f2ee', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', color: '#4a3f35', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
