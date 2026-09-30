'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ApercuFacture from './apercu'
import { pdfFacture } from './pdf'

interface Acte { designation: string; quantite: number; prix_unitaire: number }
const MODES = ['Carte bancaire', 'Espèces', 'Chèque', 'Virement', 'Tiers payant']
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const eur = (n: any) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const ageDe = (d?: string | null) => {
  if (!d) return null
  const n = new Date(String(d).slice(0, 10) + 'T12:00:00')
  return isNaN(n.getTime()) ? null : Math.floor((Date.now() - n.getTime()) / (365.25 * 24 * 3600 * 1000))
}

export default function NewFactureClient() {
  const sp = useSearchParams()
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [praticien, setPraticien] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [patientId, setPatientId] = useState(sp.get('patient') || '')
  const [q, setQ] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [dateFact, setDateFact] = useState(iso(new Date()))
  const [mode, setMode] = useState('Carte bancaire')
  const [actes, setActes] = useState<Acte[]>([])
  const [mention, setMention] = useState('')
  const [numero, setNumero] = useState('')
  const [existante, setExistante] = useState<any>(null)
  const [enCours, setEnCours] = useState(false)
  const [saved, setSaved] = useState<any>(null)
  const [emailTo, setEmailTo] = useState('')
  const [envoi, setEnvoi] = useState<'' | 'envoi' | 'ok'>('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const u = session.user.id
      setUid(u)
      const tous: any[] = []
      for (let de = 0; de < 20000; de += 1000) {
        const { data } = await supabase.from('patients').select('id, nom, prenom, date_naissance, telephone, email, sexe').eq('praticien_id', u).order('nom').range(de, de + 999)
        if (!data) break
        tous.push(...data)
        if (data.length < 1000) break
      }
      const [{ data: prat }, { data: cabs }] = await Promise.all([
        supabase.from('praticiens').select('*').eq('id', u).single(),
        supabase.from('cabinets').select('id, nom, adresse, tarifs(designation, prix, ordre)').eq('praticien_id', u).order('created_at'),
      ])
      const c = (cabs || []).map((x: any) => ({ ...x, tarifs: (x.tarifs || []).sort((a: any, b: any) => a.ordre - b.ordre) }))
      setPatients(tous); setPraticien(prat); setCabinets(c)
      if (c.length) {
        setCabinetId(c[0].id)
        if (c[0].tarifs.length) setActes([{ designation: c[0].tarifs[0].designation, quantite: 1, prix_unitaire: Number(c[0].tarifs[0].prix) || 0 }])
      }
      const { prochainNumero } = await import('@/lib/factures')
      setNumero(await prochainNumero(supabase, u, iso(new Date()).slice(0, 4)))
    })()
  }, [])

  const patient = patients.find(p => p.id === patientId)
  const cabinet = cabinets.find(c => c.id === cabinetId)
  const lignes = actes.filter(a => a.designation.trim())
  const total = lignes.reduce((t, a) => t + (Number(a.quantite) || 0) * (Number(a.prix_unitaire) || 0), 0)

  useEffect(() => {
    if (!uid || !patient || saved) { setExistante(null); return }
    (async () => {
      const { trouverPatient } = await import('@/lib/factures')
      const { data } = await createClient().from('factures').select('id, numero, patient_id, patient_nom, total')
        .eq('praticien_id', uid).eq('date_facture', dateFact).or('statut.is.null,statut.neq.annulee')
      setExistante((data || []).find((f: any) => f.patient_id === patient.id || (!f.patient_id && trouverPatient([patient], f.patient_nom || ''))) || null)
    })()
  }, [uid, patientId, dateFact, saved])

  const resultats = q.trim().length < 1 ? [] : patients.filter(p => {
    const t = norm(q.trim())
    return norm(p.nom + ' ' + p.prenom).includes(t) || norm(p.prenom + ' ' + p.nom).includes(t) || String(p.telephone || '').replace(/\D/g, '').includes(t.replace(/\D/g, '') || '§')
  }).slice(0, 8)

  const creerPatient = async () => {
    const { patientDepuisNom } = await import('@/lib/factures')
    const d = patientDepuisNom(q.trim())
    const { data, error } = await createClient().from('patients').insert({ praticien_id: uid, nom: d.nom || q.trim(), prenom: d.prenom || '' }).select('id, nom, prenom, date_naissance, telephone, email, sexe').single()
    if (error || !data) { setMessage('Erreur : ' + (error?.message || '')); return }
    setPatients(ps => [...ps, data]); setPatientId(data.id); setQ('')
  }

  const changerCabinet = (id: string) => {
    setCabinetId(id)
    const c = cabinets.find(x => x.id === id)
    if (c && actes.length <= 1 && c.tarifs.length) setActes([{ designation: c.tarifs[0].designation, quantite: 1, prix_unitaire: Number(c.tarifs[0].prix) || 0 }])
  }
  const majActe = (i: number, champ: keyof Acte, v: any) => setActes(a => a.map((x, j) => (j === i ? { ...x, [champ]: v } : x)))

  const enregistrer = async (imprimer: boolean) => {
    if (!patient) { setMessage('Choisis d\'abord le patient.'); return }
    if (!lignes.length) { setMessage('Ajoute au moins un acte.'); return }
    if (!total && !confirm('Le total est de 0 €. Enregistrer quand même ?')) return
    setEnCours(true); setMessage('')
    try {
      const supabase = createClient()
      const { prochainNumero, trouverPatient } = await import('@/lib/factures')
      const num = await prochainNumero(supabase, uid, dateFact.slice(0, 4))
      const champs = { patient_id: patient.id, date_facture: dateFact, actes: lignes.map(a => ({ designation: a.designation.trim(), quantite: Number(a.quantite) || 1, prix_unitaire: Number(a.prix_unitaire) || 0 })), mode_paiement: mode, mention: mention.trim() || null, total, cabinet: cabinet?.nom || null }
      const { data: memeJour } = await supabase.from('factures').select('id, numero, patient_id, patient_nom').eq('praticien_id', uid).eq('date_facture', dateFact).or('statut.is.null,statut.neq.annulee')
      const ex: any = (memeJour || []).find((f: any) => f.patient_id === patient.id || (!f.patient_id && trouverPatient([patient], f.patient_nom || '')))
      let res: any
      if (ex && !String(ex.numero).startsWith('FAC-')) res = await supabase.from('factures').update({ ...champs, numero: num }).eq('id', ex.id).select('*').single()
      else {
        if (ex && !confirm('Une facture existe déjà pour ce patient ce jour-là (' + ex.numero + '). En créer une seconde ?')) { setEnCours(false); return }
        res = await supabase.from('factures').insert({ ...champs, praticien_id: uid, numero: num, statut: 'payee' }).select('*').single()
      }
      if (res.error || !res.data) throw new Error(res.error?.message || 'enregistrement impossible')
      setSaved(res.data); setEmailTo(patient.email || ''); setEnvoi('')
      if (imprimer) await telecharger(res.data)
    } catch (e: any) { setMessage('Erreur : ' + (e?.message || '')) }
    setEnCours(false)
  }

  const telecharger = async (f: any) => {
    const doc = await pdfFacture(f, patient, praticien, cabinet)
    doc.save('Facture_' + f.numero + '_' + (patient?.nom || '') + '.pdf')
  }
  const envoyer = async () => {
    if (!saved || !emailTo) return
    setEnvoi('envoi')
    try {
      const doc = await pdfFacture(saved, patient, praticien, cabinet)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch('/api/send-facture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: emailTo, facture: saved, patient, pdfBase64 }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).error || 'échec') }
      setEnvoi('ok')
    } catch (e: any) { setEnvoi(''); setMessage('Envoi impossible : ' + (e?.message || '')) }
  }
  const nouvelle = async () => {
    setSaved(null); setPatientId(''); setMention(''); setEnvoi(''); setMessage('')
    if (cabinet?.tarifs.length) setActes([{ designation: cabinet.tarifs[0].designation, quantite: 1, prix_unitaire: Number(cabinet.tarifs[0].prix) || 0 }])
    const { prochainNumero } = await import('@/lib/factures')
    setNumero(await prochainNumero(createClient(), uid, dateFact.slice(0, 4)))
  }

  const apercu = { numero: saved?.numero || numero || 'FAC-…', date_facture: dateFact, actes: lignes, total, mode_paiement: mode, mention: mention.trim() || null, cabinet: cabinet?.nom }
  const age = ageDe(patient?.date_naissance)

  return (
    <div className="nf">
      <style>{`
        .nf{padding:24px 32px 60px;max-width:1360px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box;font-size:13.5px}
        .nf *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .nf-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .nf-titre{font-family:var(--font-display);font-weight:400;font-size:30px;margin:0}
        .nf-numero{display:inline-block;margin-left:12px;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:var(--fg-2);background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:3px 8px;vertical-align:middle}
        .nf-btn{font:inherit;font-size:13.5px;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--fg);cursor:pointer;text-decoration:none;white-space:nowrap}
        .nf-btn:hover:not(:disabled){border-color:var(--accent)}
        .nf-btn:disabled{opacity:.55;cursor:default}
        .nf-btn-p{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
        .nf-btn-a{background:var(--accent);color:var(--accent-fg);border-color:var(--accent);font-weight:600}
        .nf-grille{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:20px;align-items:start}
        .nf-col{display:flex;flex-direction:column;gap:14px;min-width:0}
        .nf-carte{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
        .nf-carte h2{margin:0;font-size:14px;font-weight:600}
        .nf-petit{font-size:12.5px;color:var(--fg-3)}
        .nf-champ{font:inherit;font-size:14px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg);box-sizing:border-box;width:100%}
        .nf-champ:focus{outline:none;border-color:var(--accent)}
        .nf-resultats{border:1px solid var(--line);border-radius:8px;overflow:hidden}
        .nf-resultats button{display:flex;justify-content:space-between;gap:12px;width:100%;padding:10px 12px;border:none;border-bottom:1px solid var(--line-2);background:var(--surface);font:inherit;font-size:14px;color:var(--fg);cursor:pointer;text-align:left}
        .nf-resultats button:last-child{border-bottom:none}
        .nf-resultats button:hover{background:var(--surface-2)}
        .nf-patient{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
        .nf-seg{display:flex;flex-wrap:wrap;gap:6px}
        .nf-seg button{font:inherit;font-size:13px;padding:8px 12px;border-radius:7px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
        .nf-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
        .nf-deux{display:grid;grid-template-columns:200px minmax(0,1fr);gap:14px;align-items:start}
        .nf-tarifs{display:flex;flex-wrap:wrap;gap:6px}
        .nf-tarifs button{font:inherit;font-size:12.5px;padding:6px 10px;border-radius:6px;border:1px dashed var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
        .nf-tarifs button:hover{border-color:var(--accent);color:var(--fg)}
        .nf-ligne{display:grid;grid-template-columns:minmax(0,1fr) 70px 100px 100px 32px;gap:8px;align-items:center}
        .nf-ligne .nf-champ{padding:8px 9px;font-size:13.5px}
        .nf-num{text-align:right;font-variant-numeric:tabular-nums}
        .nf-x{width:32px;height:32px;border:1px solid var(--line);border-radius:6px;background:var(--surface);cursor:pointer;color:var(--fg-2)}
        .nf-total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--line-2);padding-top:12px}
        .nf-total b{font-family:var(--font-display);font-weight:400;font-size:26px;font-variant-numeric:tabular-nums}
        .nf-alerte{background:#fdf1d6;border:1px solid #f0dca8;color:#6b4a00;border-radius:8px;padding:10px 12px;font-size:13px}
        .nf-ok{background:#e3f1e7;border:1px solid #b9dcc4;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
        .nf-droite{position:sticky;top:16px;display:flex;flex-direction:column;gap:14px}
        .nf-apercu{background:var(--surface-3);border-radius:10px;padding:12px;max-height:calc(100vh - 200px);overflow:auto}
        .nf-apercu>.podian-doc{zoom:.52;box-shadow:0 2px 10px rgba(0,0,0,.15)}
        @media (max-width:1150px){.nf-grille{grid-template-columns:1fr}.nf-apercu{display:none}.nf-droite{position:static}}
        @media (max-width:640px){.nf{padding:16px 12px 90px}.nf-deux{grid-template-columns:1fr}.nf-ligne{grid-template-columns:minmax(0,1fr) 56px 84px 32px}.nf-ligne>.nf-num:nth-child(4){display:none}}
      `}</style>

      <div className="nf-tete">
        <div>
          <button className="nf-btn" style={{ padding: 0, border: 'none', background: 'none', color: 'var(--fg-3)', fontSize: 13 }} onClick={() => router.back()}>← Retour</button>
          <h1 className="nf-titre">Nouvelle facture<span className="nf-numero">{saved?.numero || numero || '…'}</span></h1>
        </div>
        {!saved && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="nf-btn" disabled={enCours} onClick={() => enregistrer(false)}>Enregistrer</button>
            <button className="nf-btn nf-btn-a" disabled={enCours} onClick={() => enregistrer(true)}>{enCours ? 'Enregistrement…' : 'Enregistrer et télécharger le PDF'}</button>
          </div>
        )}
      </div>
      {message && <p className="nf-alerte" role="alert" style={{ margin: 0 }}>{message}</p>}

      <div className="nf-grille">
        <div className="nf-col">
          <section className="nf-carte">
            <h2>Patient</h2>
            {patient ? (
              <div className="nf-patient">
                <div>
                  <b style={{ fontSize: 15 }}>{patient.nom} {patient.prenom}</b>
                  <div className="nf-petit">{[age !== null ? age + ' ans' : '', patient.telephone, patient.email].filter(Boolean).join(', ') || 'Fiche à compléter'}</div>
                </div>
                {!saved && <button className="nf-btn" style={{ padding: '6px 10px' }} onClick={() => { setPatientId(''); setQ('') }}>Changer</button>}
              </div>
            ) : (
              <>
                <input className="nf-champ" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tape le nom ou le téléphone du patient…" aria-label="Rechercher le patient" />
                {q.trim() && (
                  <div className="nf-resultats">
                    {resultats.map(p => (
                      <button key={p.id} onClick={() => { setPatientId(p.id); setQ('') }}>
                        <span>{p.nom} {p.prenom}</span>
                        <span className="nf-petit">{[ageDe(p.date_naissance) !== null ? ageDe(p.date_naissance) + ' ans' : '', p.telephone].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                    <button onClick={creerPatient}><span>+ Créer la fiche « {q.trim()} »</span><span className="nf-petit">nouveau patient</span></button>
                  </div>
                )}
              </>
            )}
            {existante && !saved && (
              <div className="nf-alerte">
                {String(existante.numero).startsWith('FAC-')
                  ? <>Ce patient a déjà une facture ce jour-là ({existante.numero}). Si tu enregistres, une seconde facture sera créée.</>
                  : <>Une recette importée de Doctolib existe déjà pour ce patient ce jour-là ({eur(existante.total)}). En enregistrant, c'est elle qui deviendra cette facture : pas de doublon dans tes recettes.</>}
              </div>
            )}
          </section>

          <section className="nf-carte">
            <h2>Cabinet et règlement</h2>
            {cabinets.length > 1 && (
              <div className="nf-seg" role="group" aria-label="Cabinet">
                {cabinets.map(c => <button key={c.id} aria-pressed={cabinetId === c.id} disabled={!!saved} onClick={() => changerCabinet(c.id)}>{c.nom}</button>)}
              </div>
            )}
            <div className="nf-deux">
              <label className="nf-petit" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Date
                <input type="date" className="nf-champ" value={dateFact} disabled={!!saved} onChange={e => setDateFact(e.target.value)} />
              </label>
              <div className="nf-petit" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Mode de paiement
                <div className="nf-seg" role="group" aria-label="Mode de paiement">
                  {MODES.map(m => <button key={m} aria-pressed={mode === m} disabled={!!saved} onClick={() => setMode(m)}>{m}</button>)}
                </div>
              </div>
            </div>
          </section>

          <section className="nf-carte">
            <h2>Actes</h2>
            {cabinet?.tarifs.length ? (
              <div className="nf-tarifs">
                {cabinet.tarifs.map((t: any) => (
                  <button key={t.designation} disabled={!!saved} onClick={() => setActes(a => [...a, { designation: t.designation, quantite: 1, prix_unitaire: Number(t.prix) || 0 }])}>+ {t.designation}, {t.prix} €</button>
                ))}
              </div>
            ) : <p className="nf-petit" style={{ margin: 0 }}>Aucun tarif pour ce cabinet : ajoute tes actes dans <Link href="/dashboard/settings">Réglages</Link>, ou saisis une ligne libre.</p>}
            {actes.length > 0 && (
              <div className="nf-ligne nf-petit"><span>Désignation</span><span className="nf-num">Qté</span><span className="nf-num">Prix</span><span className="nf-num">Total</span><span /></div>
            )}
            {actes.map((a, i) => (
              <div key={i} className="nf-ligne">
                <input className="nf-champ" value={a.designation} disabled={!!saved} onChange={e => majActe(i, 'designation', e.target.value)} aria-label="Désignation" placeholder="Désignation" />
                <input className="nf-champ nf-num" type="number" min={1} value={a.quantite} disabled={!!saved} onChange={e => majActe(i, 'quantite', parseInt(e.target.value) || 1)} aria-label="Quantité" />
                <input className="nf-champ nf-num" type="number" step="0.01" min={0} value={a.prix_unitaire} disabled={!!saved} onChange={e => majActe(i, 'prix_unitaire', parseFloat(e.target.value) || 0)} aria-label="Prix" />
                <b className="nf-num">{eur((Number(a.quantite) || 0) * (Number(a.prix_unitaire) || 0))}</b>
                <button className="nf-x" disabled={!!saved} aria-label="Retirer la ligne" onClick={() => setActes(x => x.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            {!saved && <button className="nf-btn" style={{ alignSelf: 'flex-start', padding: '7px 11px' }} onClick={() => setActes(a => [...a, { designation: '', quantite: 1, prix_unitaire: 0 }])}>+ Ligne libre</button>}
            <div className="nf-total"><span style={{ fontWeight: 600 }}>Total</span><b>{eur(total)}</b></div>
          </section>

          <section className="nf-carte">
            <h2>Mention sur la facture</h2>
            <textarea className="nf-champ" rows={2} value={mention} disabled={!!saved} onChange={e => setMention(e.target.value)} placeholder="Facultatif. Par défaut, la facture indique « Réglée ce jour par … »" style={{ resize: 'vertical' }} />
          </section>
        </div>

        <aside className="nf-droite">
          {saved && (
            <section className="nf-ok">
              <b style={{ fontSize: 15, color: '#1f5e37' }}>Facture {saved.numero} enregistrée</b>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="nf-btn nf-btn-a" onClick={() => telecharger(saved)}>Télécharger le PDF</button>
                <Link className="nf-btn" href={'/dashboard/patients/' + saved.patient_id}>Fiche du patient</Link>
                <button className="nf-btn" onClick={nouvelle}>Nouvelle facture</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="nf-champ" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email@patient.fr" aria-label="E-mail du patient" />
                <button className="nf-btn nf-btn-p" disabled={!emailTo || envoi !== ''} onClick={envoyer}>{envoi === 'ok' ? 'Envoyée' : envoi === 'envoi' ? 'Envoi…' : 'Envoyer'}</button>
              </div>
            </section>
          )}
          <div className="nf-apercu" aria-label="Aperçu de la facture">
            <ApercuFacture facture={apercu} patient={patient} praticien={praticien} cabinet={cabinet} />
          </div>
        </aside>
      </div>
    </div>
  )
}
