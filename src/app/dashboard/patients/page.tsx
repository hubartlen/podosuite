'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const IMPRESSION = false

const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const eur = (n: number) => (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'
const eur2 = (n: number) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const dateFr = (d?: string | null) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR') : '')
const ageDe = (d?: string | null) => {
  if (!d) return null
  const n = new Date(String(d).slice(0, 10) + 'T12:00:00')
  return isNaN(n.getTime()) ? null : Math.floor((Date.now() - n.getTime()) / (365.25 * 24 * 3600 * 1000))
}
const acteDe = (f: any) => (f?.actes && f.actes[0]?.designation) || ''
const grouper = (liste: any[]) => {
  const m = new Map<string, any[]>()
  for (const x of liste) { if (!x.patient_id) continue; if (!m.has(x.patient_id)) m.set(x.patient_id, []); m.get(x.patient_id)!.push(x) }
  return m
}
const STATUTS_DEVIS: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', facture: 'Facturé' }

export default function Patients() {
  const [uid, setUid] = useState('')
  const [praticien, setPraticien] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])
  const [factures, setFactures] = useState<any[]>([])
  const [bilans, setBilans] = useState<any[]>([])
  const [ordos, setOrdos] = useState<any[]>([])
  const [devis, setDevis] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'mois' | 'relancer'>('tous')
  const [tri, setTri] = useState<'recent' | 'nom'>('recent')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [limite, setLimite] = useState(60)
  const [plan, setPlan] = useState<any>(null)
  const [liaison, setLiaison] = useState(false)
  const [etat, setEtat] = useState('')
  const [pret, setPret] = useState(false)

  const charger = async (id: string) => {
    const supabase = createClient()
    const { toutCharger, relierRecettes } = await import('@/lib/factures')
    const [pts, fac, bil, ord, dev, pho, prat] = await Promise.all([
      toutCharger((a, b) => supabase.from('patients').select('id, nom, prenom, date_naissance, sexe, telephone, email, created_at').eq('praticien_id', id).range(a, b)),
      toutCharger((a, b) => supabase.from('factures').select('id, patient_id, date_facture, numero, total, statut, actes').eq('praticien_id', id).not('patient_id', 'is', null).range(a, b)),
      toutCharger((a, b) => supabase.from('bilans').select('id, patient_id, date_bilan, format').eq('praticien_id', id).range(a, b)),
      toutCharger((a, b) => supabase.from('ordonnances').select('id, patient_id, date_ordonnance, lignes').eq('praticien_id', id).range(a, b)),
      toutCharger((a, b) => supabase.from('devis').select('id, patient_id, numero, statut, date_devis, total').eq('praticien_id', id).range(a, b)),
      toutCharger((a, b) => supabase.from('photos').select('id, patient_id').eq('praticien_id', id).range(a, b)),
      supabase.from('praticiens').select('*').eq('id', id).single(),
    ])
    setPatients(pts); setFactures(fac.filter((f: any) => f.statut !== 'annulee')); setBilans(bil); setOrdos(ord); setDevis(dev); setPhotos(pho)
    setPraticien((prat as any).data)
    setPret(true)
    setPlan(await relierRecettes(supabase, id, false))
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      setUid(session.user.id)
      charger(session.user.id)
    })()
  }, [])

  const relier = async () => {
    setLiaison(true); setEtat('Liaison des recettes en cours, cela peut prendre une minute…')
    const { relierRecettes } = await import('@/lib/factures')
    const res = await relierRecettes(createClient(), uid, true)
    setEtat(res.recettes + ' recette' + (res.recettes > 1 ? 's reliées' : ' reliée') + (res.crees ? ', ' + res.crees + ' nouvelle' + (res.crees > 1 ? 's fiches créées' : ' fiche créée') : '') + (res.ambigus ? '. ' + res.ambigus + ' recette' + (res.ambigus > 1 ? 's restent' : ' reste') + ' à vérifier (homonymes).' : '.'))
    setLiaison(false)
    charger(uid)
  }

  const lignes = useMemo(() => {
    const f = grouper(factures), b = grouper(bilans), o = grouper(ordos), d = grouper(devis), ph = grouper(photos)
    return patients.map(p => {
      const fp = (f.get(p.id) || []).sort((x: any, y: any) => String(y.date_facture).localeCompare(String(x.date_facture)))
      return {
        p, factures: fp,
        bilans: (b.get(p.id) || []).sort((x: any, y: any) => String(y.date_bilan).localeCompare(String(x.date_bilan))),
        ordos: (o.get(p.id) || []).sort((x: any, y: any) => String(y.date_ordonnance).localeCompare(String(x.date_ordonnance))),
        devis: (d.get(p.id) || []).sort((x: any, y: any) => String(y.date_devis).localeCompare(String(x.date_devis))),
        photos: (ph.get(p.id) || []).length,
        derniere: fp[0]?.date_facture || null,
        dernierActe: acteDe(fp[0]),
        ca: fp.reduce((t: number, x: any) => t + Number(x.total || 0), 0),
      }
    })
  }, [patients, factures, bilans, ordos, devis, photos])

  const debutMois = iso(new Date()).slice(0, 7) + '-01'
  const il6mois = iso(new Date(Date.now() - 182 * 24 * 3600 * 1000))
  const recherche = norm(q.trim())
  const chiffres = recherche.replace(/\D/g, '')
  const liste = lignes
    .filter(l => filtre === 'tous' || (filtre === 'mois' ? (l.derniere || '') >= debutMois : !!l.derniere && l.derniere < il6mois))
    .filter(l => {
      if (!recherche) return true
      const nom = norm(l.p.nom + ' ' + l.p.prenom), nom2 = norm(l.p.prenom + ' ' + l.p.nom)
      if (nom.includes(recherche) || nom2.includes(recherche)) return true
      if (chiffres.length >= 3 && String(l.p.telephone || '').replace(/\D/g, '').includes(chiffres)) return true
      return !!l.p.date_naissance && dateFr(l.p.date_naissance).includes(q.trim())
    })
    .sort((a, b) => (tri === 'nom' ? norm(a.p.nom + a.p.prenom).localeCompare(norm(b.p.nom + b.p.prenom)) : String(b.derniere || '').localeCompare(String(a.derniere || '')) || norm(a.p.nom).localeCompare(norm(b.p.nom))))
  const vusCeMois = lignes.filter(l => (l.derniere || '') >= debutMois).length

  const pdfFacture = async (f: any, p: any) => {
    const supabase = createClient()
    const { data: complete } = await supabase.from('factures').select('*').eq('id', f.id).single()
    if (!complete) return
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    genererPDFFacture(complete, p, praticien).save('Facture_' + complete.numero + '_' + (p.nom || '') + '.pdf')
  }

  const resumeOrdo = (o: any) => {
    const t = (o.lignes || []).map((l: any) => (l.produit || l.posologie || '').trim()).filter(Boolean).join(', ')
    return t.length > 48 ? t.slice(0, 48) + '…' : t || 'Ordonnance'
  }

  return (
    <div className="pa">
      <style>{`
        .pa{padding:28px 32px 60px;max-width:1280px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:16px;box-sizing:border-box;font-size:13.5px}
        .pa *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .pa-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap}
        .pa-titre{font-family:var(--font-display);font-size:30px;font-weight:400;margin:0}
        .pa-petit{font-size:12.5px;color:var(--fg-3)}
        .pa-principal{font:inherit;font-size:13.5px;font-weight:600;padding:9px 14px;border-radius:6px;border:none;background:var(--accent);color:var(--accent-fg);text-decoration:none;cursor:pointer;white-space:nowrap}
        .pa-principal:disabled{opacity:.6;cursor:default}
        .pa-barre{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .pa-recherche{font:inherit;font-size:14px;padding:9px 12px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);width:320px;max-width:100%;box-sizing:border-box}
        .pa-seg{display:flex;border:1px solid var(--line);border-radius:6px;overflow:hidden;background:var(--surface)}
        .pa-seg button{font:inherit;font-size:13px;padding:8px 12px;border:none;background:none;color:var(--fg-2);cursor:pointer;border-right:1px solid var(--line)}
        .pa-seg button:last-child{border-right:none}
        .pa-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark)}
        .pa-select{font:inherit;font-size:13px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg-2)}
        .pa-bandeau{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;background:var(--accent-soft);border:1px solid var(--line);border-radius:8px;padding:12px 16px}
        .pa-table{background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden}
        .pa-rang{display:grid;grid-template-columns:34px minmax(0,1.5fr) 150px 120px minmax(0,2.4fr);gap:12px;align-items:center;padding:9px 14px 9px 8px;border-bottom:1px solid var(--line-2)}
        .pa-rang:hover{background:var(--surface-2)}
        .pa-th{font-size:12px;color:var(--fg-3);background:var(--surface-2);padding-top:8px;padding-bottom:8px}
        .pa-th:hover{background:var(--surface-2)}
        .pa-ouvrir{width:28px;height:28px;border:none;background:none;border-radius:6px;cursor:pointer;color:var(--fg-3);display:flex;align-items:center;justify-content:center}
        .pa-ouvrir:hover{background:var(--surface-3)}
        .pa-ouvrir svg{transition:transform .15s}
        .pa-ouvrir[aria-expanded=true] svg{transform:rotate(90deg)}
        .pa-deux{display:flex;flex-direction:column;min-width:0}
        .pa-deux>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .pa-nom{font-weight:600;color:var(--fg);text-decoration:none}
        .pa-nom:hover{text-decoration:underline}
        .pa-acces{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
        .pa-puce{font:inherit;font-size:12.5px;padding:4px 9px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--fg-2);cursor:pointer;white-space:nowrap}
        .pa-puce b{color:var(--fg);font-weight:600;margin-left:3px}
        .pa-puce[data-vide=true]{opacity:.45}
        .pa-puce:hover{border-color:var(--accent)}
        .pa-detail{padding:14px 16px 18px 50px;background:var(--surface-2);border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:14px}
        .pa-actions{display:flex;gap:8px;flex-wrap:wrap}
        .pa-action{font-size:13px;padding:7px 11px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);text-decoration:none;white-space:nowrap}
        .pa-action:hover{border-color:var(--accent)}
        .pa-colonnes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .pa-bloc{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;min-width:0}
        .pa-bloc h3{margin:0 0 2px;font-size:13px;font-weight:600}
        .pa-item{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;min-width:0}
        .pa-item>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .pa-lien{color:var(--fg-2);text-decoration:underline;text-underline-offset:2px;white-space:nowrap;background:none;border:none;font:inherit;font-size:12.5px;cursor:pointer;padding:0}
        .pa-vide{padding:30px 0;text-align:center;color:var(--fg-3)}
        @media (max-width:1000px){.pa-colonnes{grid-template-columns:repeat(2,minmax(0,1fr))}.pa-rang{grid-template-columns:34px minmax(0,1fr) minmax(0,1.4fr)}.pa-cache{display:none}}
        @media (max-width:640px){.pa{padding:18px 12px 90px}.pa-rang{grid-template-columns:30px minmax(0,1fr)}.pa-acces{grid-column:2;justify-content:flex-start}.pa-detail{padding-left:14px}.pa-colonnes{grid-template-columns:1fr}}
      `}</style>

      <header className="pa-tete">
        <div>
          <h1 className="pa-titre">Patients</h1>
          <p className="pa-petit" style={{ margin: '4px 0 0' }}>{pret ? patients.length + ' patients, ' + vusCeMois + ' vus ce mois-ci' : 'Chargement…'}</p>
        </div>
        <Link href="/dashboard/patients/new" className="pa-principal">Nouveau patient</Link>
      </header>

      {plan && plan.recettes > 0 && (
        <div className="pa-bandeau">
          <span>
            <b>{plan.recettes} recette{plan.recettes > 1 ? 's' : ''} importée{plan.recettes > 1 ? 's' : ''}</b> ne {plan.recettes > 1 ? 'sont reliées' : 'est reliée'} à aucune fiche : {plan.aRelier} à rattacher à des fiches existantes, {plan.aCreer} nouvelle{plan.aCreer > 1 ? 's fiches' : ' fiche'} à créer{plan.ambigus ? ', ' + plan.ambigus + ' à vérifier (homonymes)' : ''}.
          </span>
          <button className="pa-principal" onClick={relier} disabled={liaison}>{liaison ? 'Liaison…' : 'Relier maintenant'}</button>
        </div>
      )}
      {etat && <p className="pa-petit" aria-live="polite" style={{ margin: 0 }}>{etat}</p>}

      <div className="pa-barre">
        <input className="pa-recherche" value={q} onChange={e => { setQ(e.target.value); setLimite(60) }} placeholder="Nom, téléphone ou date de naissance" aria-label="Rechercher un patient" />
        <div className="pa-seg" role="group" aria-label="Filtrer">
          {([['tous', 'Tous'], ['mois', 'Vus ce mois-ci'], ['relancer', 'À relancer']] as const).map(([k, l]) => (
            <button key={k} aria-pressed={filtre === k} onClick={() => { setFiltre(k); setLimite(60) }}>{l}</button>
          ))}
        </div>
        <select className="pa-select" value={tri} onChange={e => setTri(e.target.value as any)} aria-label="Trier">
          <option value="recent">Dernière visite</option>
          <option value="nom">Nom</option>
        </select>
        <span className="pa-petit" style={{ marginLeft: 'auto' }}>{liste.length} résultat{liste.length > 1 ? 's' : ''}</span>
      </div>

      <section className="pa-table">
        <div className="pa-rang pa-th"><span /><span>Patient</span><span className="pa-cache">Dernière visite</span><span className="pa-cache">Visites</span><span style={{ textAlign: 'right' }}>Dossier</span></div>
        {!pret && <p className="pa-vide">Chargement des patients…</p>}
        {pret && liste.length === 0 && <p className="pa-vide">Aucun patient ne correspond.</p>}
        {liste.slice(0, limite).map(l => {
          const p = l.p
          const age = ageDe(p.date_naissance)
          const est = ouvert === p.id
          return (
            <div key={p.id}>
              <div className="pa-rang">
                <button className="pa-ouvrir" aria-expanded={est} aria-label={(est ? 'Replier' : 'Afficher') + ' le dossier de ' + p.nom} onClick={() => setOuvert(est ? null : p.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                <div className="pa-deux">
                  <Link href={'/dashboard/patients/' + p.id} className="pa-nom">{p.nom} {p.prenom}</Link>
                  <span className="pa-petit">{[age !== null ? age + ' ans' : '', p.telephone].filter(Boolean).join(', ') || 'Fiche à compléter'}</span>
                </div>
                <div className="pa-deux pa-cache">
                  <span>{l.derniere ? dateFr(l.derniere) : 'Pas encore venu'}</span>
                  <span className="pa-petit">{l.dernierActe}</span>
                </div>
                <div className="pa-deux pa-cache">
                  <span>{l.factures.length} visite{l.factures.length > 1 ? 's' : ''}</span>
                  <span className="pa-petit">{eur(l.ca)}</span>
                </div>
                <div className="pa-acces">
                  {([['Bilans', l.bilans.length], ['Factures', l.factures.length], ['Ordonnances', l.ordos.length], ['Devis', l.devis.length], ['Photos', l.photos]] as [string, number][]).map(([lib, n]) => (
                    <button key={lib} className="pa-puce" data-vide={n === 0} onClick={() => setOuvert(p.id)}>{lib}<b>{n}</b></button>
                  ))}
                </div>
              </div>
              {est && (
                <div className="pa-detail">
                  <div className="pa-actions">
                    <Link className="pa-action" href={'/dashboard/patients/' + p.id}>Fiche patient</Link>
                    <Link className="pa-action" href={'/dashboard/bilans/nouveau?patient=' + p.id}>+ Bilan</Link>
                    <Link className="pa-action" href={'/dashboard/ordonnances/nouvelle?patient=' + p.id}>+ Ordonnance</Link>
                    <Link className="pa-action" href={'/dashboard/factures/new?patient=' + p.id}>+ Facture</Link>
                    <Link className="pa-action" href={'/dashboard/devis/nouveau?patient=' + p.id}>+ Devis</Link>
                    <Link className="pa-action" href={'/dashboard/patients/' + p.id + '/photos'}>Photos ({l.photos})</Link>
                  </div>
                  <div className="pa-colonnes">
                    <div className="pa-bloc">
                      <h3>Bilans ({l.bilans.length})</h3>
                      {l.bilans.length === 0 && <span className="pa-petit">Aucun bilan</span>}
                      {l.bilans.slice(0, 5).map((b: any) => (
                        <div key={b.id} className="pa-item">
                          <span>{dateFr(b.date_bilan)}</span>
                          <span style={{ display: 'flex', gap: 8 }}>
                            <Link className="pa-lien" href={'/dashboard/bilans/' + b.id}>Ouvrir</Link>
                            {b.format === 2 && <a className="pa-lien" href={'/dashboard/bilans/' + b.id + '/document'} target="_blank" rel="noopener">Compte rendu</a>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pa-bloc">
                      <h3>Factures ({l.factures.length})</h3>
                      {l.factures.length === 0 && <span className="pa-petit">Aucune facture</span>}
                      {l.factures.slice(0, 5).map((f: any) => (
                        <div key={f.id} className="pa-item">
                          <span>{dateFr(f.date_facture)}, {eur2(f.total)}</span>
                          {String(f.numero).startsWith('FAC-')
                            ? (IMPRESSION
                              ? <a className="pa-lien" href={'/impression/facture/' + f.id} target="_blank" rel="noopener">{f.numero.replace(/^FAC-\d{4}-/, 'n° ')}</a>
                              : <button className="pa-lien" onClick={() => pdfFacture(f, p)}>{f.numero.replace(/^FAC-\d{4}-/, 'n° ')}</button>)
                            : <Link className="pa-lien" href="/dashboard/comptabilite/journal">À facturer</Link>}
                        </div>
                      ))}
                    </div>
                    <div className="pa-bloc">
                      <h3>Ordonnances ({l.ordos.length})</h3>
                      {l.ordos.length === 0 && <span className="pa-petit">Aucune ordonnance</span>}
                      {l.ordos.slice(0, 5).map((o: any) => (
                        <div key={o.id} className="pa-item">
                          <span title={resumeOrdo(o)}>{dateFr(o.date_ordonnance)}, {resumeOrdo(o)}</span>
                          <a className="pa-lien" href={'/dashboard/ordonnances/' + o.id + '/document'} target="_blank" rel="noopener">Imprimer</a>
                        </div>
                      ))}
                    </div>
                    <div className="pa-bloc">
                      <h3>Devis ({l.devis.length})</h3>
                      {l.devis.length === 0 && <span className="pa-petit">Aucun devis</span>}
                      {l.devis.slice(0, 5).map((d: any) => (
                        <div key={d.id} className="pa-item">
                          <span>{d.numero}, {STATUTS_DEVIS[d.statut] || d.statut}</span>
                          <Link className="pa-lien" href={'/dashboard/devis/' + d.id}>Ouvrir</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {liste.length > limite && (
          <div style={{ padding: 12, textAlign: 'center' }}>
            <button className="pa-action" style={{ cursor: 'pointer' }} onClick={() => setLimite(n => n + 60)}>Afficher 60 patients de plus</button>
          </div>
        )}
      </section>
    </div>
  )
}
