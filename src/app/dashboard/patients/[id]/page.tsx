'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const IMPRESSION = false

const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const eur = (n: any) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const eurRond = (n: any) => (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const jour = (d?: string | null) => (d ? new Date(String(d).length <= 10 ? d + 'T12:00:00' : String(d)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const heure = (d?: string | null) => (d ? new Date(String(d)).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const ageDe = (d?: string | null) => {
  if (!d) return null
  const n = new Date(String(d).slice(0, 10) + 'T12:00:00')
  return isNaN(n.getTime()) ? null : Math.floor((Date.now() - n.getTime()) / (365.25 * 24 * 3600 * 1000))
}
const actes = (f: any) => (f?.actes || []).map((a: any) => a.designation).filter(Boolean).join(', ')
const estFacturee = (f: any) => String(f?.numero || '').startsWith('FAC-')
const TYPES: Record<string, { lib: string; fond: string; texte: string }> = {
  note: { lib: 'Note', fond: '#fdf1d6', texte: '#8a5a00' },
  facture: { lib: 'Facture', fond: '#e3f1e7', texte: '#23633a' },
  recette: { lib: 'À facturer', fond: '#fdebd6', texte: '#9a4a0b' },
  bilan: { lib: 'Bilan', fond: '#dde8f6', texte: '#1d4a80' },
  ordonnance: { lib: 'Ordonnance', fond: '#efe4f4', texte: '#6a3f7c' },
  devis: { lib: 'Devis', fond: '#fbe3d8', texte: '#9a3b16' },
}
const STATUTS_DEVIS: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', facture: 'Facturé' }
const CHAMPS: [string, string, string?][] = [
  ['nom', 'Nom'], ['prenom', 'Prénom'], ['sexe', 'Sexe', 'sexe'], ['date_naissance', 'Date de naissance', 'date'],
  ['telephone', 'Téléphone', 'tel'], ['email', 'E-mail', 'email'], ['adresse', 'Adresse'], ['num_secu', 'N° de sécurité sociale'], ['mutuelle', 'Complémentaire santé'],
]

export default function FichePatient() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [p, setP] = useState<any>(null)
  const [praticien, setPraticien] = useState<any>(null)
  const [factures, setFactures] = useState<any[]>([])
  const [bilans, setBilans] = useState<any[]>([])
  const [ordos, setOrdos] = useState<any[]>([])
  const [devis, setDevis] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<any[]>([])
  const [notesOk, setNotesOk] = useState(true)
  const [onglet, setOnglet] = useState('suivi')
  const [note, setNote] = useState('')
  const [edition, setEdition] = useState<string | null>(null)
  const [texteEdition, setTexteEdition] = useState('')
  const [etat, setEtat] = useState('')
  const [occupe, setOccupe] = useState('')
  const [introuvable, setIntrouvable] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const u = session.user.id
      setUid(u)
      const { data: pat } = await supabase.from('patients').select('*').eq('id', id).eq('praticien_id', u).single()
      if (!pat) { setIntrouvable(true); return }
      setP(pat)
      const [f, b, o, d, ph, n, pr] = await Promise.all([
        supabase.from('factures').select('*').eq('patient_id', id).eq('praticien_id', u).order('date_facture', { ascending: false }).range(0, 999),
        supabase.from('bilans').select('id, date_bilan, format, remarques, donnees').eq('patient_id', id).eq('praticien_id', u).order('date_bilan', { ascending: false }),
        supabase.from('ordonnances').select('*').eq('patient_id', id).eq('praticien_id', u).order('date_ordonnance', { ascending: false }),
        supabase.from('devis').select('id, numero, date_devis, statut, total, lignes').eq('patient_id', id).eq('praticien_id', u).order('date_devis', { ascending: false }),
        supabase.from('photos').select('id, chemin, legende, created_at').eq('patient_id', id).eq('praticien_id', u).order('created_at', { ascending: false }),
        supabase.from('patient_notes').select('*').eq('patient_id', id).eq('praticien_id', u).order('created_at', { ascending: false }),
        supabase.from('praticiens').select('*').eq('id', u).single(),
      ])
      setFactures((f.data || []).filter((x: any) => x.statut !== 'annulee'))
      setBilans(b.data || []); setOrdos(o.data || []); setDevis(d.data || []); setPhotos(ph.data || [])
      setNotes(n.data || []); setNotesOk(!n.error); setPraticien(pr.data)
      if (ph.data && ph.data.length) {
        const { data: s } = await supabase.storage.from('bilans-photos').createSignedUrls(ph.data.map((x: any) => x.chemin), 3600)
        const m: Record<string, string> = {}
        ;(s || []).forEach((x: any) => { if (x.signedUrl && x.path) m[x.path] = x.signedUrl })
        setUrls(m)
      }
    })()
  }, [id])

  const evenements = useMemo(() => {
    const ev: any[] = []
    notes.forEach(n => ev.push({ cle: 'n' + n.id, type: 'note', date: n.created_at, n }))
    factures.forEach(f => ev.push({ cle: 'f' + f.id, type: estFacturee(f) ? 'facture' : 'recette', date: f.date_facture, f }))
    bilans.forEach(b => ev.push({ cle: 'b' + b.id, type: 'bilan', date: b.date_bilan, b }))
    ordos.forEach(o => ev.push({ cle: 'o' + o.id, type: 'ordonnance', date: o.date_ordonnance, o }))
    devis.forEach(d => ev.push({ cle: 'd' + d.id, type: 'devis', date: d.date_devis, d }))
    return ev.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [notes, factures, bilans, ordos, devis])

  if (introuvable) return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: 'var(--fg-2)' }}>Patient introuvable. <Link href="/dashboard/patients">Retour aux patients</Link></div>
  if (!p) return <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: 'var(--fg-3)' }}>Chargement de la fiche…</div>

  const age = ageDe(p.date_naissance)
  const civ = p.sexe === 'M' ? 'M.' : p.sexe === 'F' ? 'Mme' : ''
  const initiales = ((p.prenom || '').charAt(0) + (p.nom || '').charAt(0)).toUpperCase() || '?'
  const total = factures.reduce((t, f) => t + Number(f.total || 0), 0)
  const derniere = factures[0]
  const premiere = factures[factures.length - 1]
  const aFacturer = factures.filter(f => !estFacturee(f)).length
  const notesTriees = [...notes].sort((a, b) => Number(b.epinglee) - Number(a.epinglee) || String(b.created_at).localeCompare(String(a.created_at)))

  const majChamp = async (champ: string, valeur: string) => {
    const v = valeur.trim()
    if ((champ === 'nom') && !v) { setEtat('Le nom ne peut pas être vide.'); return }
    const propre = champ === 'prenom' ? v : v || null
    if ((p[champ] ?? null) === propre) return
    setP((x: any) => ({ ...x, [champ]: propre }))
    const { error } = await createClient().from('patients').update({ [champ]: propre }).eq('id', id)
    setEtat(error ? 'Erreur : ' + error.message : 'Informations enregistrées')
  }

  const ajouterNote = async () => {
    const t = note.trim()
    if (!t) return
    const { data, error } = await createClient().from('patient_notes').insert({ praticien_id: uid, patient_id: id, contenu: t }).select('*').single()
    if (error) { setEtat('Erreur : ' + error.message); return }
    setNotes(ns => [data, ...ns]); setNote('')
  }
  const epingler = async (n: any) => {
    setNotes(ns => ns.map(x => (x.id === n.id ? { ...x, epinglee: !n.epinglee } : x)))
    await createClient().from('patient_notes').update({ epinglee: !n.epinglee }).eq('id', n.id)
  }
  const enregistrerEdition = async (n: any) => {
    const t = texteEdition.trim()
    if (!t) return
    setNotes(ns => ns.map(x => (x.id === n.id ? { ...x, contenu: t } : x))); setEdition(null)
    await createClient().from('patient_notes').update({ contenu: t, updated_at: new Date().toISOString() }).eq('id', n.id)
  }
  const supprimerNote = async (n: any) => {
    if (!confirm('Supprimer cette note ?')) return
    setNotes(ns => ns.filter(x => x.id !== n.id))
    await createClient().from('patient_notes').delete().eq('id', n.id)
  }

  const telecharger = async (f: any) => {
    if (IMPRESSION) { window.open('/impression/facture/' + f.id, '_blank'); return }
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    genererPDFFacture(f, p, praticien).save('Facture_' + f.numero + '_' + (p.nom || '') + '.pdf')
  }
  const facturer = async (f: any) => {
    if (!Number(f.total)) { alert("Cette recette est à 0 € : corrige d'abord son montant dans le Journal."); return }
    setOccupe(f.id)
    const supabase = createClient()
    const { prochainNumero } = await import('@/lib/factures')
    const numero = await prochainNumero(supabase, uid, String(f.date_facture).slice(0, 4))
    const { data, error } = await supabase.from('factures').update({ numero, patient_id: id }).eq('id', f.id).select('*').single()
    setOccupe('')
    if (error || !data) { setEtat('Erreur : ' + (error?.message || '')); return }
    setFactures(fs => fs.map(x => (x.id === f.id ? data : x)))
    setEtat('Facture ' + numero + ' créée')
    telecharger(data)
  }
  const renouveler = async (o: any) => {
    const { data, error } = await createClient().from('ordonnances').insert({
      praticien_id: uid, patient_id: id, cabinet_id: o.cabinet_id, modele_id: o.modele_id, date_ordonnance: iso(new Date()),
      format: o.format, lignes: o.lignes, lignes_hors: o.lignes_hors || [], mentions: o.mentions,
    }).select('id').single()
    if (error || !data) { setEtat('Erreur : ' + (error?.message || '')); return }
    router.push('/dashboard/ordonnances/' + data.id)
  }
  const resumeOrdo = (o: any) => {
    const t = (o.lignes || []).map((l: any) => (l.produit || l.posologie || '').trim()).filter(Boolean).join(', ')
    return t.length > 90 ? t.slice(0, 90) + '…' : t || 'Ordonnance'
  }
  const resumeBilan = (b: any) => {
    const t = b.format === 2 ? (b.donnees?.motif?.texte || b.donnees?.synthese || '') : (b.remarques || '')
    return String(t).length > 110 ? String(t).slice(0, 110) + '…' : String(t) || (b.format === 2 ? 'Bilan podologique' : 'Bilan (ancien format)')
  }

  const pastille = (type: string) => <span className="fp-type" style={{ background: TYPES[type].fond, color: TYPES[type].texte }}>{TYPES[type].lib}</span>
  const ONGLETS: [string, string][] = [['suivi', 'Suivi'], ['factures', 'Factures (' + factures.length + ')'], ['bilans', 'Bilans (' + bilans.length + ')'], ['ordonnances', 'Ordonnances (' + ordos.length + ')'], ['devis', 'Devis (' + devis.length + ')'], ['photos', 'Photos (' + photos.length + ')']]

  return (
    <div className="fp">
      <style>{`
        .fp{padding:24px 32px 60px;max-width:1360px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box;font-size:13.5px}
        .fp *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .fp-retour{font-size:13px;color:var(--fg-3);text-decoration:none}
        .fp-tete{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap}
        .fp-ident{display:flex;gap:16px;align-items:center;min-width:0}
        .fp-avatar{width:58px;height:58px;border-radius:10px;background:var(--dark);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:22px;flex-shrink:0}
        .fp-nom{font-family:var(--font-display);font-weight:400;font-size:30px;margin:0;line-height:1.15}
        .fp-infos{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:6px;color:var(--fg-2);font-size:13.5px}
        .fp-infos a{color:var(--fg-2)}
        .fp-actions{display:flex;gap:8px;flex-wrap:wrap}
        .fp-btn{font:inherit;font-size:13.5px;padding:9px 13px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--fg);text-decoration:none;cursor:pointer;white-space:nowrap}
        .fp-btn:hover{border-color:var(--accent)}
        .fp-btn-p{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
        .fp-btn-a{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);font-weight:600}
        .fp-chiffres{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:var(--surface);border:1px solid var(--line);border-radius:10px}
        .fp-chiffres>div{padding:13px 18px;border-right:1px solid var(--line-2);min-width:0}
        .fp-chiffres>div:last-child{border-right:none}
        .fp-chiffres span{display:block;font-size:12px;color:var(--fg-3)}
        .fp-chiffres b{display:block;font-size:20px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fp-chiffres small{display:block;font-size:12px;color:var(--fg-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .fp-grille{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:18px;align-items:start}
        .fp-carte{background:var(--surface);border:1px solid var(--line);border-radius:10px}
        .fp-onglets{display:flex;gap:2px;border-bottom:1px solid var(--line);padding:0 10px;overflow-x:auto}
        .fp-onglets button{font:inherit;font-size:13.5px;border:none;background:none;padding:12px 12px 10px;color:var(--fg-3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
        .fp-onglets button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
        .fp-corps{padding:6px 18px 14px}
        .fp-vide{padding:30px 0;text-align:center;color:var(--fg-3)}
        .fp-ev{display:grid;grid-template-columns:96px 16px minmax(0,1fr);gap:12px;padding:12px 0}
        .fp-ev-date{font-size:12.5px;color:var(--fg-3);padding-top:2px;text-align:right}
        .fp-ev-trait{position:relative;display:flex;justify-content:center}
        .fp-ev-trait::before{content:'';position:absolute;top:0;bottom:-24px;width:1px;background:var(--line)}
        .fp-ev:last-child .fp-ev-trait::before{bottom:auto;height:10px}
        .fp-ev-trait i{position:relative;width:9px;height:9px;border-radius:50%;margin-top:5px;border:2px solid var(--surface)}
        .fp-ev-titre{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .fp-ev-texte{margin-top:4px;color:var(--fg-2);white-space:pre-wrap;line-height:1.5}
        .fp-type{font-size:11.5px;font-weight:600;border-radius:5px;padding:2px 7px}
        .fp-lien{font:inherit;font-size:13px;color:var(--fg-2);text-decoration:underline;text-underline-offset:2px;background:none;border:none;padding:0;cursor:pointer;white-space:nowrap}
        .fp-lien:hover{color:var(--fg)}
        .fp-table{width:100%;border-collapse:collapse}
        .fp-table th{text-align:left;font-size:12px;font-weight:500;color:var(--fg-3);padding:10px 8px;border-bottom:1px solid var(--line)}
        .fp-table td{padding:10px 8px;border-bottom:1px solid var(--line-2);vertical-align:middle}
        .fp-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
        .fp-ligne{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--line-2)}
        .fp-ligne:last-child{border-bottom:none}
        .fp-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding-top:10px}
        .fp-photos a{display:block;aspect-ratio:1;border-radius:8px;overflow:hidden;background:var(--surface-2);border:1px solid var(--line)}
        .fp-photos img{width:100%;height:100%;object-fit:cover}
        .fp-cote{display:flex;flex-direction:column;gap:18px}
        .fp-bloc{padding:16px 18px;display:flex;flex-direction:column;gap:10px}
        .fp-bloc h2{margin:0;font-size:14px;font-weight:600}
        .fp-zone{font:inherit;font-size:14px;width:100%;box-sizing:border-box;min-height:84px;resize:vertical;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg);line-height:1.5}
        .fp-note{border:1px solid var(--line-2);border-radius:8px;padding:10px 12px;background:var(--surface-2)}
        .fp-note[data-epinglee=true]{background:#fdf6e3;border-color:#f0dca8}
        .fp-note p{margin:0;white-space:pre-wrap;line-height:1.5}
        .fp-note-pied{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--fg-3)}
        .fp-note-pied span:last-child{display:flex;gap:10px}
        .fp-champ{display:grid;grid-template-columns:128px minmax(0,1fr);align-items:center;gap:8px}
        .fp-champ label{font-size:12.5px;color:var(--fg-3)}
        .fp-champ input,.fp-champ select{font:inherit;font-size:13.5px;width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--fg)}
        .fp-champ input:hover,.fp-champ select:hover{border-color:var(--line);background:var(--surface)}
        .fp-champ input:focus,.fp-champ select:focus{outline:none;border-color:var(--accent);background:var(--surface)}
        .fp-champ input::placeholder{color:var(--fg-3);opacity:.7}
        @media (max-width:1150px){.fp-grille{grid-template-columns:1fr}.fp-chiffres{grid-template-columns:repeat(3,minmax(0,1fr))}.fp-chiffres>div:nth-child(3){border-right:none}.fp-chiffres>div:nth-child(n+4){border-top:1px solid var(--line-2)}}
        @media (max-width:640px){.fp{padding:16px 12px 90px}.fp-nom{font-size:24px}.fp-chiffres{grid-template-columns:repeat(2,minmax(0,1fr))}.fp-chiffres>div{border-right:none;border-top:1px solid var(--line-2)}.fp-ev{grid-template-columns:70px 14px minmax(0,1fr)}.fp-table .fp-cache{display:none}}
      `}</style>

      <Link href="/dashboard/patients" className="fp-retour">← Patients</Link>

      <header className="fp-tete">
        <div className="fp-ident">
          <div className="fp-avatar" aria-hidden="true">{initiales}</div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fp-nom">{[civ, p.nom, p.prenom].filter(Boolean).join(' ')}</h1>
            <div className="fp-infos">
              {age !== null && <span>{age} ans, {p.sexe === 'M' ? 'né' : 'née'} le {jour(p.date_naissance)}</span>}
              {p.telephone && <a href={'tel:' + String(p.telephone).replace(/\s/g, '')}>{p.telephone}</a>}
              {p.email && <a href={'mailto:' + p.email}>{p.email}</a>}
              {p.mutuelle && <span>{p.mutuelle}</span>}
              {!age && !p.telephone && !p.email && <span>Fiche à compléter dans les informations à droite</span>}
            </div>
          </div>
        </div>
        <div className="fp-actions">
          <Link className="fp-btn fp-btn-p" href={'/dashboard/bilans/nouveau?patient=' + id}>Nouveau bilan</Link>
          <Link className="fp-btn" href={'/dashboard/ordonnances/nouvelle?patient=' + id}>Ordonnance</Link>
          <Link className="fp-btn fp-btn-a" href={'/dashboard/factures/new?patient=' + id}>Facture</Link>
          <Link className="fp-btn" href={'/dashboard/devis/nouveau?patient=' + id}>Devis</Link>
          <Link className="fp-btn" href={'/dashboard/patients/' + id + '/photos'}>Photos</Link>
        </div>
      </header>

      <section className="fp-chiffres" aria-label="Chiffres du patient">
        <div><span>Visites</span><b>{factures.length}</b></div>
        <div><span>Total facturé</span><b>{eurRond(total)}</b></div>
        <div><span>Dernière visite</span><b>{derniere ? jour(derniere.date_facture) : 'Aucune'}</b><small>{derniere ? actes(derniere) : ''}</small></div>
        <div><span>Patient depuis</span><b>{premiere ? jour(premiere.date_facture) : jour(p.created_at)}</b></div>
        <div><span>À facturer</span><b style={{ color: aFacturer ? '#b45309' : undefined }}>{aFacturer}</b><small>{aFacturer ? 'recette' + (aFacturer > 1 ? 's' : '') + ' importée' + (aFacturer > 1 ? 's' : '') : 'tout est facturé'}</small></div>
      </section>

      {etat && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-3)' }} aria-live="polite">{etat}</p>}

      <div className="fp-grille">
        <section className="fp-carte">
          <div className="fp-onglets" role="tablist">
            {ONGLETS.map(([k, l]) => <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)}>{l}</button>)}
          </div>
          <div className="fp-corps">
            {onglet === 'suivi' && (evenements.length === 0 ? <p className="fp-vide">Rien pour le moment. Ajoute une note à droite, ou crée un bilan.</p> : evenements.map(e => (
              <div key={e.cle} className="fp-ev">
                <div className="fp-ev-date">{jour(e.date)}</div>
                <div className="fp-ev-trait"><i style={{ background: TYPES[e.type].texte }} /></div>
                <div style={{ minWidth: 0 }}>
                  {e.type === 'note' && (<>
                    <div className="fp-ev-titre">{pastille('note')}{e.n.epinglee && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>épinglée</span>}</div>
                    <p className="fp-ev-texte">{e.n.contenu}</p>
                  </>)}
                  {(e.type === 'facture' || e.type === 'recette') && (
                    <div className="fp-ev-titre">
                      {pastille(e.type)}
                      <span>{actes(e.f) || 'Consultation'}</span>
                      <b className="fp-num">{eur(e.f.total)}</b>
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        {estFacturee(e.f)
                          ? <button className="fp-lien" onClick={() => telecharger(e.f)}>{e.f.numero}</button>
                          : <button className="fp-lien" disabled={occupe === e.f.id} onClick={() => facturer(e.f)}>{occupe === e.f.id ? 'Création…' : 'Facturer'}</button>}
                      </span>
                    </div>
                  )}
                  {e.type === 'bilan' && (<>
                    <div className="fp-ev-titre">
                      {pastille('bilan')}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        <Link className="fp-lien" href={'/dashboard/bilans/' + e.b.id}>Ouvrir</Link>
                        {e.b.format === 2 && <a className="fp-lien" href={'/dashboard/bilans/' + e.b.id + '/document'} target="_blank" rel="noopener">Compte rendu</a>}
                      </span>
                    </div>
                    <p className="fp-ev-texte">{resumeBilan(e.b)}</p>
                  </>)}
                  {e.type === 'ordonnance' && (<>
                    <div className="fp-ev-titre">
                      {pastille('ordonnance')}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        <a className="fp-lien" href={'/dashboard/ordonnances/' + e.o.id + '/document'} target="_blank" rel="noopener">Imprimer</a>
                        <button className="fp-lien" onClick={() => renouveler(e.o)}>Renouveler</button>
                      </span>
                    </div>
                    <p className="fp-ev-texte">{resumeOrdo(e.o)}</p>
                  </>)}
                  {e.type === 'devis' && (
                    <div className="fp-ev-titre">
                      {pastille('devis')}
                      <span>{e.d.numero}, {STATUTS_DEVIS[e.d.statut] || e.d.statut}</span>
                      <b className="fp-num">{eur(e.d.total)}</b>
                      <Link className="fp-lien" style={{ marginLeft: 'auto' }} href={'/dashboard/devis/' + e.d.id}>Ouvrir</Link>
                    </div>
                  )}
                </div>
              </div>
            )))}

            {onglet === 'factures' && (factures.length === 0 ? <p className="fp-vide">Aucune facture pour ce patient.</p> : (
              <table className="fp-table">
                <thead><tr><th>Date</th><th>Numéro</th><th className="fp-cache">Actes</th><th className="fp-cache">Paiement</th><th className="fp-num">Montant</th><th /></tr></thead>
                <tbody>
                  {factures.map(f => (
                    <tr key={f.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{jour(f.date_facture)}</td>
                      <td>{estFacturee(f) ? f.numero : pastille('recette')}</td>
                      <td className="fp-cache" style={{ color: 'var(--fg-2)' }}>{actes(f)}</td>
                      <td className="fp-cache" style={{ color: 'var(--fg-2)' }}>{f.mode_paiement}</td>
                      <td className="fp-num"><b>{eur(f.total)}</b></td>
                      <td className="fp-num">
                        {estFacturee(f)
                          ? <button className="fp-lien" onClick={() => telecharger(f)}>{IMPRESSION ? 'Imprimer' : 'PDF'}</button>
                          : <button className="fp-lien" disabled={occupe === f.id} onClick={() => facturer(f)}>{occupe === f.id ? 'Création…' : 'Facturer'}</button>}
                      </td>
                    </tr>
                  ))}
                  <tr><td colSpan={4} className="fp-cache" style={{ color: 'var(--fg-3)', borderBottom: 'none' }}>Total</td><td className="fp-num" style={{ borderBottom: 'none' }}><b>{eur(total)}</b></td><td style={{ borderBottom: 'none' }} /></tr>
                </tbody>
              </table>
            ))}

            {onglet === 'bilans' && (bilans.length === 0 ? <p className="fp-vide">Aucun bilan. <Link className="fp-lien" href={'/dashboard/bilans/nouveau?patient=' + id}>Faire un bilan</Link></p> : bilans.map(b => (
              <div key={b.id} className="fp-ligne">
                <div style={{ minWidth: 0 }}><b>{jour(b.date_bilan)}</b><div style={{ color: 'var(--fg-2)', marginTop: 3 }}>{resumeBilan(b)}</div></div>
                <span style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <Link className="fp-lien" href={'/dashboard/bilans/' + b.id}>Ouvrir</Link>
                  {b.format === 2 && <a className="fp-lien" href={'/dashboard/bilans/' + b.id + '/document'} target="_blank" rel="noopener">Compte rendu</a>}
                  <Link className="fp-lien" href={'/dashboard/devis/nouveau?patient=' + id + '&bilan=' + b.id}>Devis</Link>
                </span>
              </div>
            )))}

            {onglet === 'ordonnances' && (ordos.length === 0 ? <p className="fp-vide">Aucune ordonnance. <Link className="fp-lien" href={'/dashboard/ordonnances/nouvelle?patient=' + id}>En faire une</Link></p> : ordos.map(o => (
              <div key={o.id} className="fp-ligne">
                <div style={{ minWidth: 0 }}><b>{jour(o.date_ordonnance)}</b><div style={{ color: 'var(--fg-2)', marginTop: 3 }}>{resumeOrdo(o)}</div></div>
                <span style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  <Link className="fp-lien" href={'/dashboard/ordonnances/' + o.id}>Modifier</Link>
                  <a className="fp-lien" href={'/dashboard/ordonnances/' + o.id + '/document'} target="_blank" rel="noopener">Imprimer</a>
                  <button className="fp-lien" onClick={() => renouveler(o)}>Renouveler</button>
                </span>
              </div>
            )))}

            {onglet === 'devis' && (devis.length === 0 ? <p className="fp-vide">Aucun devis. <Link className="fp-lien" href={'/dashboard/devis/nouveau?patient=' + id}>En faire un</Link></p> : devis.map(d => (
              <div key={d.id} className="fp-ligne">
                <div><b>{d.numero}</b><div style={{ color: 'var(--fg-2)', marginTop: 3 }}>{jour(d.date_devis)}, {STATUTS_DEVIS[d.statut] || d.statut}</div></div>
                <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}><b className="fp-num">{eur(d.total)}</b><Link className="fp-lien" href={'/dashboard/devis/' + d.id}>Ouvrir</Link></span>
              </div>
            )))}

            {onglet === 'photos' && (photos.length === 0 ? <p className="fp-vide">Aucune photo. <Link className="fp-lien" href={'/dashboard/patients/' + id + '/photos'}>En ajouter depuis le téléphone</Link></p> : (
              <>
                <div className="fp-photos">
                  {photos.map(ph => (
                    <a key={ph.id} href={urls[ph.chemin] || '#'} target="_blank" rel="noopener" title={ph.legende || jour(ph.created_at)}>
                      {urls[ph.chemin] && <img src={urls[ph.chemin]} alt={ph.legende || 'Photo du ' + jour(ph.created_at)} />}
                    </a>
                  ))}
                </div>
                <p style={{ margin: '12px 0 0' }}><Link className="fp-lien" href={'/dashboard/patients/' + id + '/photos'}>Gérer les photos</Link></p>
              </>
            ))}
          </div>
        </section>

        <aside className="fp-cote">
          <section className="fp-carte fp-bloc" aria-label="Notes">
            <h2>Notes</h2>
            {!notesOk ? <p style={{ margin: 0, color: 'var(--fg-3)' }}>Les notes seront disponibles dès que la table des notes aura été créée dans Supabase.</p> : (<>
              <textarea className="fp-zone" value={note} onChange={e => setNote(e.target.value)} placeholder="Ajouter une note sur ce patient…"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); ajouterNote() } }} aria-label="Nouvelle note" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Cmd + Entrée pour enregistrer</span>
                <button className="fp-btn fp-btn-p" style={{ padding: '7px 12px' }} disabled={!note.trim()} onClick={ajouterNote}>Enregistrer</button>
              </div>
              {notesTriees.map(n => (
                <div key={n.id} className="fp-note" data-epinglee={n.epinglee}>
                  {edition === n.id ? (<>
                    <textarea className="fp-zone" value={texteEdition} onChange={e => setTexteEdition(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enregistrerEdition(n) } if (e.key === 'Escape') setEdition(null) }} />
                    <div className="fp-note-pied"><span /><span><button className="fp-lien" onClick={() => setEdition(null)}>Annuler</button><button className="fp-lien" onClick={() => enregistrerEdition(n)}>Enregistrer</button></span></div>
                  </>) : (<>
                    <p>{n.contenu}</p>
                    <div className="fp-note-pied">
                      <span>{heure(n.created_at)}</span>
                      <span>
                        <button className="fp-lien" onClick={() => epingler(n)}>{n.epinglee ? 'Désépingler' : 'Épingler'}</button>
                        <button className="fp-lien" onClick={() => { setEdition(n.id); setTexteEdition(n.contenu) }}>Modifier</button>
                        <button className="fp-lien" onClick={() => supprimerNote(n)}>Supprimer</button>
                      </span>
                    </div>
                  </>)}
                </div>
              ))}
            </>)}
          </section>

          <section className="fp-carte fp-bloc" aria-label="Informations">
            <h2>Informations</h2>
            {CHAMPS.map(([champ, lib, type]) => (
              <div key={champ} className="fp-champ">
                <label htmlFor={'fp-' + champ}>{lib}</label>
                {type === 'sexe' ? (
                  <select id={'fp-' + champ} value={p.sexe || ''} onChange={e => majChamp('sexe', e.target.value)}>
                    <option value="">Non précisé</option><option value="F">Femme</option><option value="M">Homme</option>
                  </select>
                ) : (
                  <input id={'fp-' + champ} key={champ + (p[champ] ?? '')} type={type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
                    defaultValue={type === 'date' ? String(p[champ] || '').slice(0, 10) : p[champ] || ''} placeholder="À compléter"
                    onBlur={e => majChamp(champ, e.target.value)} />
                )}
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}
