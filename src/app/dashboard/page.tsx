'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MOIS_COURTS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const eur = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'

function couleurActe(nom: string) {
  const n = nom.toLowerCase()
  if (n.includes('pod')) return { fond: '#efe4f4', texte: '#6a3f7c', barre: '#8a5a9e' }
  if (n.includes('ortho')) return { fond: '#fbe3d8', texte: '#9a3b16', barre: '#d0663c' }
  if (n.includes('bilan') || n.includes('semelle')) return { fond: '#dde8f6', texte: '#1d4a80', barre: '#2f64a8' }
  if (n.includes('soin')) return { fond: '#e3f1e7', texte: '#23633a', barre: '#3f8f5a' }
  return { fond: 'var(--surface-3)', texte: 'var(--fg-2)', barre: 'var(--accent)' }
}

const CSS = `
.tb{padding:30px 36px 48px;max-width:1360px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
.tb *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tb-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.tb-titre{font-family:var(--font-display);font-weight:400;font-size:36px;margin:2px 0 0;line-height:1.1}
.tb-petit{font-size:12.5px;color:var(--fg-3)}
.tb-fort{color:var(--fg)}
.tb-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.tb-seg{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:3px}
.tb-seg button{font:inherit;font-size:13px;border:none;background:none;padding:7px 12px;border-radius:8px;color:var(--fg-2);cursor:pointer}
.tb-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark)}
.tb-principal{font-size:13.5px;font-weight:600;padding:11px 16px;border-radius:6px;background:var(--accent);color:var(--accent-fg);text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.tb-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}
.tb-hero{grid-column:span 2;background:var(--dark);color:var(--on-dark);border-radius:8px;padding:20px 22px;display:flex;flex-direction:column;gap:10px}
.tb-ligne{display:flex;justify-content:space-between;align-items:center;gap:12px}
.tb-hero-label{font-size:13px;opacity:.75}
.tb-badge{font-size:12px;font-weight:600;background:var(--accent);color:var(--accent-fg);border-radius:6px;padding:4px 10px;white-space:nowrap}
.tb-hero-chiffre{font-family:var(--font-display);font-size:50px;line-height:1.05;font-variant-numeric:tabular-nums}
.tb-jauge{height:8px;background:rgba(255,255,255,.15);border-radius:8px;overflow:hidden}
.tb-jauge i{display:block;height:100%;background:var(--accent);border-radius:8px}
.tb-hero-bas{font-size:12.5px;opacity:.8}
.tb-carte{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:18px 20px;display:flex;flex-direction:column;gap:10px;min-width:0;box-sizing:border-box}
.tb-kpi{gap:6px;text-align:left;font:inherit;color:inherit}
.tb-kpi b{font-family:var(--font-display);font-weight:400;font-size:32px;font-variant-numeric:tabular-nums}
.tb-objectif{background:var(--accent-soft);border-color:transparent;cursor:pointer}
.tb-milieu{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px}
.tb-bas{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr);gap:14px}
.tb-h2{font-family:var(--font-display);font-weight:400;font-size:21px;margin:0}
.tb-graph{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;align-items:end;height:200px;margin-top:6px}
.tb-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%}
.tb-barre{width:100%;border-radius:6px}
.tb-val{font-size:11px;color:var(--fg-2)}
.tb-val-on{color:var(--fg);font-weight:700}
.tb-mois{font-size:11.5px;color:var(--fg-3)}
.tb-mois-on{color:var(--fg);font-weight:700}
.tb-cab{display:flex;flex-direction:column;gap:6px;font-size:13.5px}
.tb-point-nom{display:flex;align-items:center;gap:8px}
.tb-point{width:10px;height:10px;border-radius:3px}
.tb-piste{height:10px;background:var(--line-2);border-radius:6px;overflow:hidden}
.tb-piste i{display:block;height:100%;border-radius:6px}
.tb-pied{margin-top:auto;padding-top:12px;border-top:1px solid var(--line-2);font-size:13px}
.tb-vert{font-size:13px;font-weight:700;color:#23633a}
.tb-rdv{display:grid;grid-template-columns:minmax(0,1fr) auto 70px;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line-2);font-size:13.5px}
.tb-rdv b{text-align:right;font-variant-numeric:tabular-nums}
.tb-rdv-nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tb-chip{font-size:12px;font-weight:600;border-radius:6px;padding:3px 9px;white-space:nowrap}
.tb-lien{margin-top:auto;font-size:13px;font-weight:600;color:var(--dark);text-decoration:underline;text-underline-offset:3px}
.tb-tache{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--line-2);color:var(--fg);text-decoration:none;font-size:13.5px}
.tb-compte{font-size:12px;font-weight:700;border-radius:6px;padding:3px 9px;background:var(--surface-3);color:var(--fg-3)}
.tb-compte[data-alerte=true]{background:#fdecd3;color:#8a4f00}
.tb-sous{font-size:12.5px;color:var(--fg-2);text-decoration:none;padding:2px 0 4px 12px}
.tb-sous:hover{color:var(--fg);text-decoration:underline}
@media (max-width:1150px){.tb-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.tb-milieu,.tb-bas{grid-template-columns:1fr}}
@media (max-width:640px){.tb{padding:18px 14px 90px}.tb-hero{grid-column:1/-1}.tb-hero-chiffre{font-size:40px}.tb-graph{gap:4px}.tb-val{display:none}.tb-titre{font-size:30px}}
`

export default function TableauDeBord() {
  const router = useRouter()
  const [charge, setCharge] = useState(false)
  const [uid, setUid] = useState('')
  const [factures, setFactures] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [prat, setPrat] = useState<any>(null)
  const [bilans, setBilans] = useState<any[]>([])
  const [periode, setPeriode] = useState<'semaine' | 'mois' | 'annee'>('mois')
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const id = session.user.id
      setUid(id)
      const debut = `${new Date().getFullYear() - 1}-01-01`
      const [f, c, p, b] = await Promise.all([
        supabase.from('factures').select('id, numero, date_facture, total, statut, cabinet, actes, patient_nom').eq('praticien_id', id).gte('date_facture', debut).order('date_facture').range(0, 4999),
        supabase.from('cabinets').select('id, nom, retrocession').eq('praticien_id', id).order('created_at'),
        supabase.from('praticiens').select('prenom, retrocession, objectif_mensuel').eq('id', id).single(),
        supabase.from('bilans').select('id, date_bilan, donnees, patient:patients(nom, prenom)').eq('praticien_id', id).eq('format', 2),
      ])
      setFactures(f.data || []); setCabinets(c.data || []); setPrat(p.data); setBilans(b.data || [])
      setCharge(true)
    })()
  }, [router])

  if (!charge) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Chargement de ton activité…</div>

  const maintenant = new Date()
  const auj = iso(maintenant)
  const y = maintenant.getFullYear(), m = maintenant.getMonth(), jourMois = maintenant.getDate()
  const partDefaut = prat?.retrocession ?? 100
  const partDe = (f: any) => cabinets.find(c => c.nom === f.cabinet)?.retrocession ?? partDefaut
  const actives = factures.filter(f => f.statut !== 'annulee' && (filtre === 'tous' || f.cabinet === filtre))
  const somme = (l: any[]) => l.reduce((s, f) => s + Number(f.total || 0), 0)
  const entre = (a: Date, b: Date) => actives.filter(f => f.date_facture >= iso(a) && f.date_facture <= iso(b))
  const pat = (b: any) => (Array.isArray(b.patient) ? b.patient[0] : b.patient)

  let debut: Date, fin: Date, debutPrec: Date, finPrec: Date, libelle: string, libellePrec: string
  if (periode === 'mois') {
    debut = new Date(y, m, 1); fin = new Date(y, m + 1, 0); debutPrec = new Date(y, m - 1, 1); finPrec = new Date(y, m, 0)
    libelle = MOIS[m].toLowerCase(); libellePrec = MOIS[(m + 11) % 12].toLowerCase()
  } else if (periode === 'semaine') {
    const j = (maintenant.getDay() + 6) % 7
    debut = new Date(y, m, jourMois - j); fin = new Date(y, m, jourMois - j + 6)
    debutPrec = new Date(y, m, jourMois - j - 7); finPrec = new Date(y, m, jourMois - j - 1)
    libelle = 'cette semaine'; libellePrec = 'la semaine dernière'
  } else {
    debut = new Date(y, 0, 1); fin = new Date(y, 11, 31); debutPrec = new Date(y - 1, 0, 1); finPrec = new Date(y - 1, 11, 31)
    libelle = String(y); libellePrec = String(y - 1)
  }

  const periodeF = entre(debut, fin)
  const ca = somme(periodeF)
  const caPrec = somme(entre(debutPrec, finPrec))
  const evolution = caPrec > 0 ? Math.round((ca - caPrec) / caPrec * 100) : null
  const part = periodeF.reduce((s, f) => s + Number(f.total || 0) * partDe(f) / 100, 0)
  const panier = periodeF.length ? ca / periodeF.length : 0
  const joursTravailles = new Set(periodeF.filter(f => Number(f.total || 0) > 0).map(f => f.date_facture)).size
  const moyenneJour = joursTravailles ? ca / joursTravailles : 0

  const parMois = MOIS_COURTS.map((_, i) => somme(actives.filter(f => f.date_facture.startsWith(`${y}-${String(i + 1).padStart(2, '0')}`))))
  const maxMois = Math.max(1, ...parMois)
  const caAnnee = parMois.reduce((a, b) => a + b, 0)
  const partAnnee = actives.filter(f => f.date_facture.startsWith(String(y))).reduce((s, f) => s + Number(f.total || 0) * partDe(f) / 100, 0)
  const meilleurMois = periode === 'mois' && parMois[m] > 0 && parMois[m] === maxMois

  const objectif = Number(prat?.objectif_mensuel || 0)
  const caMois = parMois[m]
  const progression = objectif ? Math.min(100, Math.round(caMois / objectif * 100)) : 0
  let joursRestants = 0
  for (let d = jourMois + 1; d <= new Date(y, m + 1, 0).getDate(); d++) { const w = new Date(y, m, d).getDay(); if (w !== 0 && w !== 6) joursRestants++ }
  const reste = Math.max(0, objectif - caMois)
  const parJourRestant = joursRestants ? reste / joursRestants : reste

  const parCabinet = cabinets
    .filter(c => filtre === 'tous' || c.nom === filtre)
    .map(c => { const l = periodeF.filter(f => f.cabinet === c.nom); return { nom: c.nom, ca: somme(l), actes: l.length, part: c.retrocession ?? partDefaut } })
  const sansCab = periodeF.filter(f => !cabinets.some(c => c.nom === f.cabinet))
  if (filtre === 'tous' && sansCab.length) parCabinet.push({ nom: 'Non précisé', ca: somme(sansCab), actes: sansCab.length, part: partDefaut })
  const maxCab = Math.max(1, ...parCabinet.map(c => c.ca))

  const duJour = factures.filter(f => f.date_facture === auj && f.statut !== 'annulee' && (filtre === 'tous' || f.cabinet === filtre))
  const totalJour = somme(duJour)

  const actesMap: Record<string, { n: number; total: number }> = {}
  periodeF.forEach(f => {
    const a = f.actes?.[0]?.designation || 'Sans acte'
    actesMap[a] = actesMap[a] || { n: 0, total: 0 }
    actesMap[a].n++; actesMap[a].total += Number(f.total || 0)
  })
  const actesListe = Object.entries(actesMap).sort((a, b) => b[1].total - a[1].total)

  const zeros = actives.filter(f => f.date_facture >= iso(new Date(y, m, 1)) && f.date_facture <= auj && Number(f.total || 0) === 0).length
  const sansSynthese = bilans.filter(b => !String(b.donnees?.synthese || '').trim())
  const dans14 = iso(new Date(y, m, jourMois + 14))
  const controles = bilans
    .filter(b => { const c = b.donnees?.semelles?.controle; return c && c >= auj && c <= dans14 })
    .sort((a, b) => String(a.donnees.semelles.controle).localeCompare(String(b.donnees.semelles.controle)))

  const dateTexte = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLongue = dateTexte.charAt(0).toUpperCase() + dateTexte.slice(1)

  const definirObjectif = async () => {
    const v = prompt("Objectif de chiffre d'affaires mensuel (en €)", objectif ? String(objectif) : '')
    if (v === null) return
    const n = parseFloat(v.replace(',', '.').replace(/\s/g, ''))
    if (isNaN(n) || n < 0) { alert('Montant invalide'); return }
    const { error } = await createClient().from('praticiens').update({ objectif_mensuel: n }).eq('id', uid)
    if (error) { alert('Erreur : ' + error.message); return }
    setPrat((p: any) => ({ ...p, objectif_mensuel: n }))
  }

  return (
    <div className="tb">
      <style>{CSS}</style>

      <header className="tb-tete">
        <div>
          <div className="tb-petit">{dateLongue}, bonjour {prat?.prenom || ''}</div>
          <h1 className="tb-titre">Ton activité</h1>
        </div>
        <div className="tb-actions">
          <div className="tb-seg" role="group" aria-label="Période">
            {(['semaine', 'mois', 'annee'] as const).map(p => (
              <button key={p} aria-pressed={periode === p} onClick={() => setPeriode(p)}>{p === 'annee' ? 'Année' : p === 'mois' ? 'Mois' : 'Semaine'}</button>
            ))}
          </div>
          {cabinets.length > 1 && (
            <div className="tb-seg" role="group" aria-label="Cabinet">
              <button aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>Les deux</button>
              {cabinets.map(c => <button key={c.id} aria-pressed={filtre === c.nom} onClick={() => setFiltre(c.nom)}>{c.nom}</button>)}
            </div>
          )}
          <Link href="/dashboard/bilans/nouveau" className="tb-principal">Nouveau bilan</Link>
        </div>
      </header>

      <section className="tb-kpis">
        <div className="tb-hero">
          <div className="tb-ligne">
            <span className="tb-hero-label">Chiffre d'affaires, {libelle}</span>
            {meilleurMois && <span className="tb-badge">Meilleur mois de l'année</span>}
          </div>
          <div className="tb-hero-chiffre">{eur(ca)}</div>
          {periode === 'mois' && objectif > 0 && <div className="tb-jauge"><i style={{ width: progression + '%' }} /></div>}
          <div className="tb-ligne tb-hero-bas">
            <span>{periode === 'mois' && objectif > 0 ? `${progression} % de l'objectif de ${eur(objectif)}` : `${periodeF.length} actes`}</span>
            {evolution !== null && <span>{evolution >= 0 ? '+' : ''}{evolution} % vs {libellePrec}</span>}
          </div>
        </div>
        <div className="tb-carte tb-kpi"><span className="tb-petit">Ma part nette</span><b>{eur(part)}</b><span className="tb-petit">après rétrocession</span></div>
        <div className="tb-carte tb-kpi"><span className="tb-petit">Panier moyen</span><b>{eur(panier)}</b><span className="tb-petit">{periodeF.length} actes</span></div>
        <button className="tb-carte tb-kpi tb-objectif" onClick={definirObjectif} title="Modifier l'objectif mensuel">
          {!objectif ? (
            <><span className="tb-petit">Objectif mensuel</span><b>Définir</b><span className="tb-petit">pour suivre ta progression</span></>
          ) : reste > 0 ? (
            <><span className="tb-petit">Pour atteindre l'objectif</span><b>{eur(parJourRestant)}</b><span className="tb-petit">{joursRestants ? `par jour, sur ${joursRestants} jour${joursRestants > 1 ? 's' : ''} ouvré${joursRestants > 1 ? 's' : ''}` : "à faire aujourd'hui"}</span></>
          ) : (
            <><span className="tb-petit">Objectif de {MOIS[m].toLowerCase()}</span><b>Atteint</b><span className="tb-petit">{eur(caMois - objectif)} au-delà</span></>
          )}
        </button>
      </section>

      <section className="tb-milieu">
        <div className="tb-carte">
          <div className="tb-ligne" style={{ flexWrap: 'wrap' }}>
            <h2 className="tb-h2">Chiffre d'affaires {y}</h2>
            <div className="tb-petit">Total <b className="tb-fort">{eur(caAnnee)}</b>, ma part <b className="tb-fort">{eur(partAnnee)}</b></div>
          </div>
          <div className="tb-graph">
            {parMois.map((v, i) => (
              <div key={i} className="tb-col" title={`${MOIS[i]} : ${eur(v)}`}>
                {v > 0 && <span className={i === m ? 'tb-val tb-val-on' : 'tb-val'}>{Math.round(v).toLocaleString('fr-FR')}</span>}
                <div className="tb-barre" style={{ height: v > 0 ? Math.max(4, Math.round(v / maxMois * 150)) : 3, background: i === m ? 'var(--accent)' : v > 0 ? 'var(--dark)' : 'var(--line)' }} />
                <span className={i === m ? 'tb-mois tb-mois-on' : 'tb-mois'}>{MOIS_COURTS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="tb-carte">
          <h2 className="tb-h2">Par cabinet</h2>
          {parCabinet.length === 0 && <p className="tb-petit">Aucune recette sur la période.</p>}
          {parCabinet.map((c, i) => (
            <div key={c.nom} className="tb-cab">
              <div className="tb-ligne">
                <span className="tb-point-nom"><span className="tb-point" style={{ background: i % 2 === 0 ? 'var(--dark)' : 'var(--accent)' }} />{c.nom}</span>
                <b>{eur(c.ca)}</b>
              </div>
              <div className="tb-piste"><i style={{ width: Math.round(c.ca / maxCab * 100) + '%', background: i % 2 === 0 ? 'var(--dark)' : 'var(--accent)' }} /></div>
              <div className="tb-petit">part {c.part} %, {c.actes} actes</div>
            </div>
          ))}
          <div className="tb-ligne tb-pied"><span className="tb-petit">Moyenne par jour travaillé</span><b>{eur(moyenneJour)}</b></div>
        </div>
      </section>

      <section className="tb-bas">
        <div className="tb-carte">
          <div className="tb-ligne"><h2 className="tb-h2">Aujourd'hui</h2><span className="tb-vert">{eur(totalJour)} encaissés</span></div>
          {duJour.length === 0 && <p className="tb-petit" style={{ margin: 0 }}>Aucune recette pour l'instant. Importe ta journée depuis la page Compta.</p>}
          {duJour.slice(0, 7).map(f => {
            const a = f.actes?.[0]?.designation || 'Sans acte'
            const c = couleurActe(a)
            return (
              <div key={f.id} className="tb-rdv">
                <span className="tb-rdv-nom">{f.patient_nom || f.numero}</span>
                <span className="tb-chip" style={{ background: c.fond, color: c.texte }}>{a}</span>
                <b>{eur(Number(f.total || 0))}</b>
              </div>
            )
          })}
          {duJour.length > 7 && <div className="tb-petit">et {duJour.length - 7} autres</div>}
          <Link href="/dashboard/comptabilite/journal" className="tb-lien">Ouvrir le journal</Link>
        </div>

        <div className="tb-carte">
          <h2 className="tb-h2">Actes, {libelle}</h2>
          {actesListe.length === 0 && <p className="tb-petit" style={{ margin: 0 }}>Aucun acte sur la période.</p>}
          {actesListe.slice(0, 6).map(([a, v]) => {
            const c = couleurActe(a)
            return (
              <div key={a} className="tb-cab">
                <div className="tb-ligne"><span>{a} <span className="tb-petit">({v.n})</span></span><b>{eur(v.total)}</b></div>
                <div className="tb-piste"><i style={{ width: Math.round(v.total / Math.max(1, ca) * 100) + '%', background: c.barre }} /></div>
              </div>
            )
          })}
        </div>

        <div className="tb-carte" style={{ gap: 0 }}>
          <h2 className="tb-h2" style={{ marginBottom: 8 }}>À traiter</h2>
          <Link href="/dashboard/comptabilite/journal" className="tb-tache"><span>Recettes à 0 € ce mois</span><span className="tb-compte" data-alerte={zeros > 0}>{zeros}</span></Link>
          <Link href="/dashboard/bilans/nouveau" className="tb-tache"><span>Bilans sans synthèse</span><span className="tb-compte" data-alerte={sansSynthese.length > 0}>{sansSynthese.length}</span></Link>
          {sansSynthese.slice(0, 3).map(b => { const p = pat(b); return <Link key={b.id} href={`/dashboard/bilans/${b.id}/saisie`} className="tb-sous">{p?.prenom} {p?.nom}</Link> })}
          <div className="tb-tache"><span>Contrôles semelles sous 14 jours</span><span className="tb-compte" data-alerte={controles.length > 0}>{controles.length}</span></div>
          {controles.slice(0, 3).map(b => { const p = pat(b); return <Link key={b.id} href={`/dashboard/bilans/${b.id}/saisie`} className="tb-sous">{p?.prenom} {p?.nom}, le {new Date(`${b.donnees.semelles.controle}T12:00:00`).toLocaleDateString('fr-FR')}</Link> })}
        </div>
      </section>
    </div>
  )
}
