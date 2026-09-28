'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tarif = { designation: string; prix: number; ordre: number }
type Cabinet = { id: string; nom: string; retrocession: number | null; tarifs: Tarif[] }
type Acte = { designation: string; quantite: number; prix_unitaire: number }
type Facture = {
  id: string; numero: string; date_facture: string; patient_nom: string | null; mode_paiement: string | null
  total: number; cabinet: string | null; statut: string | null; source: string | null; actes: Acte[] | null; patient_id?: string | null
}

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
const JOURS_COURTS = ['Di','Lu','Ma','Me','Je','Ve','Sa']
const PAIEMENTS = ['Carte bancaire','Espèces','Chèque','Virement','Tiers payant']
const COLONNES = 'id, numero, date_facture, patient_nom, mode_paiement, total, cabinet, statut, source, actes, patient_id'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const euros = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const eurosRonds = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €'

export default function JournalRecettes() {
  const aujourdhui = iso(new Date())
  const [jour, setJour] = useState(aujourdhui)
  const [factures, setFactures] = useState<Facture[]>([])
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [partDefaut, setPartDefaut] = useState(100)
  const [filtre, setFiltre] = useState('tous')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [etat, setEtat] = useState('')
  const [patientsListe, setPatientsListe] = useState<any[]>([])
  const [praticienComplet, setPraticienComplet] = useState<any>(null)

  const d = new Date(`${jour}T12:00:00`)
  const annee = d.getFullYear()
  const mois = d.getMonth()
  const cleMois = jour.slice(0, 7)
  const nbJours = new Date(annee, mois + 1, 0).getDate()

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      setUserId(session.user.id)
      const [{ data: cabs }, { data: prat }] = await Promise.all([
        supabase.from('cabinets').select('id, nom, retrocession, tarifs(designation, prix, ordre)').eq('praticien_id', session.user.id).order('created_at'),
        supabase.from('praticiens').select('retrocession').eq('id', session.user.id).single(),
      ])
      setCabinets((cabs || []).map((c: any) => ({ ...c, tarifs: (c.tarifs || []).sort((a: Tarif, b: Tarif) => a.ordre - b.ordre) })))
      setPartDefaut(prat?.retrocession ?? 100)
      const [{ data: pts }, { data: prc }] = await Promise.all([
        supabase.from('patients').select('*').eq('praticien_id', session.user.id).range(0, 4999),
        supabase.from('praticiens').select('*').eq('id', session.user.id).single(),
      ])
      setPatientsListe(pts || []); setPraticienComplet(prc)
    })()
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const fin = iso(new Date(annee, mois + 1, 0))
      const { data } = await supabase.from('factures').select(COLONNES).eq('praticien_id', session.user.id)
        .gte('date_facture', `${cleMois}-01`).lte('date_facture', fin).order('created_at')
      setFactures((data || []) as Facture[])
      setLoading(false)
    })()
  }, [cleMois])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const n = new Date(`${jour}T12:00:00`)
      n.setDate(n.getDate() + (e.key === 'ArrowRight' ? 1 : -1))
      setJour(iso(n))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [jour])

  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`jr-${jour}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduit ? 'auto' : 'smooth' })
  }, [jour, loading])

  const dansFiltre = (f: Facture) => filtre === 'tous' || f.cabinet === filtre
  const cabinetDe = (f: Facture) => cabinets.find(c => c.nom === f.cabinet)
  const partDe = (f: Facture) => cabinetDe(f)?.retrocession ?? partDefaut

  const totauxJours = useMemo(() => {
    const t: Record<string, number> = {}
    for (const f of factures) {
      if (f.statut === 'annulee' || !(filtre === 'tous' || f.cabinet === filtre)) continue
      t[f.date_facture] = (t[f.date_facture] || 0) + Number(f.total || 0)
    }
    return t
  }, [factures, filtre])
  const maxJour = Math.max(1, ...Object.values(totauxJours))
  const totalMois = Object.values(totauxJours).reduce((a, b) => a + b, 0)
  const activesMois = factures.filter(f => f.statut !== 'annulee' && dansFiltre(f))
  const partMois = activesMois.reduce((s, f) => s + Number(f.total || 0) * partDe(f) / 100, 0)
  const joursTravailles = Object.values(totauxJours).filter(v => v > 0).length
  const moyenne = joursTravailles ? totalMois / joursTravailles : 0

  const lignesJour = factures.filter(f => f.date_facture === jour && dansFiltre(f))
  const actives = lignesJour.filter(f => f.statut !== 'annulee')
  const brut = actives.reduce((s, f) => s + Number(f.total || 0), 0)
  const part = actives.reduce((s, f) => s + Number(f.total || 0) * partDe(f) / 100, 0)
  const comptes: Record<string, number> = {}
  const paiementsJour: Record<string, number> = {}
  for (const f of actives) {
    if (!f.actes || f.actes.length === 0) comptes['Sans acte'] = (comptes['Sans acte'] || 0) + 1
    else for (const a of f.actes) comptes[a.designation] = (comptes[a.designation] || 0) + (a.quantite || 1)
    const m = f.mode_paiement || 'Non précisé'
    paiementsJour[m] = (paiementsJour[m] || 0) + Number(f.total || 0)
  }
  const nbActes = Object.values(comptes).reduce((a, b) => a + b, 0)

  const titre = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[mois].toLowerCase()}`
  const titreJour = titre.charAt(0).toUpperCase() + titre.slice(1)

  const modifierLocal = (id: string, champs: Partial<Facture>) => setFactures(fs => fs.map(f => f.id === id ? { ...f, ...champs } : f))

  const enregistrer = async (id: string, champs: Partial<Facture>) => {
    modifierLocal(id, champs)
    setEtat('Enregistrement…')
    const { error } = await createClient().from('factures').update(champs).eq('id', id)
    if (error) { setEtat('Erreur : ' + error.message); return }
    setEtat('Enregistré')
    setTimeout(() => setEtat(''), 1500)
  }

  const changerActe = (f: Facture, designation: string) => {
    const prix = cabinetDe(f)?.tarifs.find(t => t.designation === designation)?.prix ?? Number(f.total || 0)
    enregistrer(f.id, { actes: designation ? [{ designation, quantite: 1, prix_unitaire: prix }] : [], total: prix })
  }

  const changerCabinet = (f: Facture, nom: string) => {
    const cab = cabinets.find(c => c.nom === nom)
    const designation = f.actes?.length === 1 ? f.actes[0].designation : null
    const t = designation ? cab?.tarifs.find(x => x.designation === designation) : undefined
    enregistrer(f.id, t
      ? { cabinet: nom || null, total: t.prix, actes: [{ designation: designation!, quantite: 1, prix_unitaire: t.prix }] }
      : { cabinet: nom || null })
  }

  const enregistrerMontant = (f: Facture) => {
    const total = Number(f.total || 0)
    enregistrer(f.id, f.actes?.length === 1 ? { total, actes: [{ ...f.actes[0], prix_unitaire: total }] } : { total })
  }

  const ajouter = async () => {
    const cab = filtre !== 'tous' ? cabinets.find(c => c.nom === filtre) : cabinets[0]
    const t = cab?.tarifs[0]
    const row = {
      praticien_id: userId,
      numero: `MAN-${jour.replace(/-/g, '')}-${Date.now().toString().slice(-6)}`,
      date_facture: jour,
      patient_nom: '',
      mode_paiement: 'Carte bancaire',
      total: t?.prix ?? 0,
      cabinet: cab?.nom ?? null,
      actes: t ? [{ designation: t.designation, quantite: 1, prix_unitaire: t.prix }] : [],
      statut: 'payee',
      source: 'manuel',
    }
    const { data, error } = await createClient().from('factures').insert(row).select(COLONNES).single()
    if (error) { setEtat('Erreur : ' + error.message); return }
    setFactures(fs => [...fs, data as Facture])
  }

  const supprimer = async (f: Facture) => {
    if (!confirm(`Supprimer définitivement la recette de ${f.patient_nom || f.numero} ?`)) return
    const { error } = await createClient().from('factures').delete().eq('id', f.id)
    if (error) { setEtat('Erreur : ' + error.message); return }
    setFactures(fs => fs.filter(x => x.id !== f.id))
  }

  const facturer = async (liste: Facture[]) => {
    const aFaire = liste.filter(f => f.statut !== 'annulee')
    if (!aFaire.length) return
    setEtat('Préparation des factures…')
    const supabase = createClient()
    const { prochainNumero, trouverPatient, patientDepuisNom } = await import('@/lib/factures')
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    let doc: any = null
    let premier: any = null
    for (const f of aFaire) {
      let ligne: any = f
      const patient = (ligne.patient_id && patientsListe.find(p => p.id === ligne.patient_id)) || trouverPatient(patientsListe, ligne.patient_nom || '') || patientDepuisNom(ligne.patient_nom || '')
      if (!String(ligne.numero).startsWith('FAC-')) {
        const numero = await prochainNumero(supabase, userId, ligne.date_facture.slice(0, 4))
        const champs: any = { numero }
        if (patient && patient.id) champs.patient_id = patient.id
        const { error } = await supabase.from('factures').update(champs).eq('id', ligne.id)
        if (error) { setEtat('Erreur : ' + error.message); return }
        ligne = { ...ligne, ...champs }
        modifierLocal(ligne.id, champs)
      }
      if (!premier) premier = { ligne, patient }
      doc = genererPDFFacture(ligne, patient, praticienComplet, doc || undefined)
    }
    doc.save(aFaire.length === 1 ? 'Facture_' + premier.ligne.numero + '_' + (premier.patient.nom || '') + '.pdf' : 'Factures_' + jour + '.pdf')
    setEtat(aFaire.length + ' facture' + (aFaire.length > 1 ? 's prêtes' : ' prête'))
  }

  const changerMois = (delta: number) => setJour(iso(new Date(annee, mois + delta, 1)))

  return (
    <div className="jr">
      <style>{`
        .jr{--ink:var(--dark);--sable:var(--accent);--lin:var(--bg);--grege:var(--line);--taupe:var(--fg-3);--brun:var(--fg-2);--ambre:#b45309;
          padding:36px 40px 48px;max-width:1320px;margin:0 auto;font-family:Inter,sans-serif;color:var(--ink)}
        .jr *:focus-visible{outline:2px solid var(--sable);outline-offset:2px}
        .jr-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:28px}
        .jr-titre{font-family:'Playfair Display',serif;font-size:32px;font-weight:400;margin:0;letter-spacing:-.01em}
        .jr-sous{font-size:13px;color:var(--taupe);margin-top:6px}
        .jr-sous a{color:var(--brun);text-decoration:none;border-bottom:1px solid var(--grege)}
        .jr-controles{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .jr-mois{display:flex;align-items:center;background:#fff;border:1px solid var(--grege);border-radius:12px;padding:3px}
        .jr-mois button{border:none;background:none;width:32px;height:32px;border-radius:9px;cursor:pointer;color:var(--brun);font-size:17px}
        .jr-mois button:hover{background:var(--lin)}
        .jr-mois span{font-size:14px;min-width:130px;text-align:center}
        .jr-segment{display:flex;background:var(--lin);border:1px solid var(--grege);border-radius:12px;padding:3px}
        .jr-segment button{border:none;background:none;padding:8px 14px;border-radius:9px;font-size:13px;color:var(--brun);cursor:pointer;font-family:inherit}
        .jr-segment button[aria-pressed=true]{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(26,20,16,.08)}
        .jr-lien{border:1px solid var(--grege);background:#fff;border-radius:12px;padding:9px 14px;font-family:inherit;font-size:13px;color:var(--brun);cursor:pointer}
        .jr-lien:hover{border-color:var(--sable)}

        .jr-ruban{display:grid;grid-template-columns:repeat(var(--nb),minmax(40px,1fr));gap:5px;overflow-x:auto;padding:2px 2px 8px;margin-bottom:28px}
        .jr-jour{position:relative;overflow:hidden;border:1px solid var(--grege);background:#fff;border-radius:12px;height:104px;padding:10px 2px 8px;
          display:flex;flex-direction:column;align-items:center;cursor:pointer;font-family:inherit;color:var(--ink)}
        .jr-jour::before{content:'';position:absolute;left:0;right:0;bottom:0;height:var(--h);background:rgba(200,184,154,.32);transition:height .25s ease}
        .jr-jour > *{position:relative}
        .jr-jour:hover{border-color:var(--sable)}
        .jr-jour[data-weekend=true]{background:transparent;color:var(--taupe);border-style:dashed}
        .jr-jour[aria-current=date]{background:var(--ink);border-color:var(--ink);color:var(--lin)}
        .jr-jour[aria-current=date]::before{background:rgba(200,184,154,.28)}
        .jr-j{font-size:10px;opacity:.65}
        .jr-n{font-family:'Playfair Display',serif;font-size:21px;line-height:1.1;margin-top:2px}
        .jr-m{margin-top:auto;font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap}
        .jr-point{position:absolute;top:7px;right:7px;width:5px;height:5px;border-radius:50%;background:var(--sable)}
        @media (prefers-reduced-motion:reduce){.jr-jour::before{transition:none}}

        .jr-corps{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
        .jr-panneau{background:#fff;border:1px solid var(--grege);border-radius:18px;padding:26px 28px}
        .jr-entete{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px}
        .jr-date{font-family:'Playfair Display',serif;font-size:26px;font-weight:400;margin:0}
        .jr-etat{font-size:12px;color:var(--taupe);min-height:16px;margin-top:4px}
        .jr-principal{border:none;background:var(--ink);color:var(--lin);border-radius:12px;padding:11px 18px;font-family:inherit;font-size:13px;font-weight:500;cursor:pointer}
        .jr-principal:hover{background:var(--brun)}

        .jr-ligne{display:grid;grid-template-columns:minmax(150px,1.5fr) 130px minmax(160px,1.4fr) 140px 104px 92px;gap:6px;align-items:center;padding:5px 6px;border-radius:10px}
        .jr-ligne + .jr-ligne{margin-top:2px}
        .jr-ligne:not(.jr-titres):hover{background:var(--lin)}
        .jr-titres{font-size:12px;color:var(--taupe);padding-bottom:8px;border-bottom:1px solid var(--lin);border-radius:0;margin-bottom:6px}
        .jr-titres span{padding-left:10px}
        .jr-ligne[data-annulee=true]{opacity:.45}
        .jr-ligne[data-annulee=true] .jr-patient{text-decoration:line-through}
        .jr-champ{appearance:none;-webkit-appearance:none;width:100%;padding:9px 10px;border:1px solid transparent;border-radius:9px;background-color:transparent;
          font-family:inherit;font-size:14px;color:var(--ink);text-overflow:ellipsis}
        select.jr-champ{padding-right:26px;cursor:pointer;background-repeat:no-repeat;background-position:right 9px center;background-size:10px 10px}
        .jr-champ:hover{border-color:var(--grege);background-color:#fff}
        select.jr-champ:hover,select.jr-champ:focus{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' fill='none' stroke='%239b8f7e' stroke-width='1.4'/%3E%3C/svg%3E")}
        .jr-champ:focus{outline:none;border-color:var(--sable);background-color:#fff}
        .jr-patient{font-weight:500}
        .jr-euro{position:relative}
        .jr-euro span{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--taupe);pointer-events:none}
        .jr-montant{text-align:right;padding-right:24px;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
        .jr-montant::-webkit-outer-spin-button,.jr-montant::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .jr-ligne[data-zero=true] .jr-montant{color:var(--ambre);font-weight:600}
        .jr-multi{font-size:13px;color:var(--brun);padding:0 10px}
        .jr-actions{display:flex;gap:2px;justify-content:flex-end;opacity:.35}
        .jr-ligne:hover .jr-actions,.jr-actions:focus-within{opacity:1}
        .jr-icone{border:none;background:none;width:28px;height:28px;border-radius:8px;cursor:pointer;color:var(--brun);font-size:13px}
        .jr-icone:hover{background:#fff;color:var(--ink)}
        .jr-vide{padding:40px 0 24px;text-align:center;color:var(--taupe);font-size:14px;line-height:1.6}

        .jr-cote{display:flex;flex-direction:column;gap:16px;position:sticky;top:24px}
        .jr-carte{background:#fff;border:1px solid var(--grege);border-radius:18px;padding:22px}
        .jr-carte h3{font-size:13px;font-weight:500;color:var(--taupe);margin:0 0 14px}
        .jr-grand{font-family:'Playfair Display',serif;font-size:34px;font-weight:400;line-height:1.1;font-variant-numeric:tabular-nums}
        .jr-ligne-stat{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-top:1px solid var(--lin);font-size:14px}
        .jr-ligne-stat:first-of-type{border-top:none}
        .jr-ligne-stat b{font-weight:500;font-variant-numeric:tabular-nums}
        .jr-ligne-stat span{color:var(--brun)}
        .jr-actes{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 6px}
        .jr-actes span{font-size:12px;background:var(--lin);color:var(--brun);border-radius:20px;padding:5px 10px}
        .jr-sombre{background:var(--ink);border-color:var(--ink);color:var(--lin)}
        .jr-sombre h3{color:var(--sable)}
        .jr-sombre .jr-ligne-stat{border-top-color:rgba(245,242,238,.1)}
        .jr-sombre .jr-ligne-stat span{color:rgba(245,242,238,.7)}

        @media (max-width:1100px){
          .jr-corps{grid-template-columns:1fr}
          .jr-cote{position:static;display:grid;grid-template-columns:1fr 1fr}
        }
        @media (max-width:760px){
          .jr{padding:20px 16px 40px}
          .jr-ruban{grid-template-columns:repeat(var(--nb),52px)}
          .jr-cote{grid-template-columns:1fr}
          .jr-titres{display:none!important}
          .jr-panneau{padding:20px 16px}
          .jr-ligne{grid-template-columns:1fr 1fr;padding:12px 4px;border-bottom:1px solid var(--lin);border-radius:0}
          .jr-patient-cell,.jr-actions{grid-column:1/-1}
          .jr-actions{opacity:1}
        }
      `}</style>

      <header className="jr-tete">
        <div>
          <h1 className="jr-titre">Journal des recettes</h1>
          <p className="jr-sous"><a href="/dashboard/comptabilite">Retour à la compta</a> ; flèches ← → du clavier pour changer de jour.</p>
        </div>
        <div className="jr-controles">
          <div className="jr-mois">
            <button onClick={() => changerMois(-1)} aria-label="Mois précédent">‹</button>
            <span>{MOIS[mois]} {annee}</span>
            <button onClick={() => changerMois(1)} aria-label="Mois suivant">›</button>
          </div>
          <div className="jr-segment" role="group" aria-label="Cabinet">
            <button aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>Tous</button>
            {cabinets.map(c => <button key={c.id} aria-pressed={filtre === c.nom} onClick={() => setFiltre(c.nom)}>{c.nom}</button>)}
          </div>
          <button className="jr-lien" onClick={() => setJour(aujourdhui)}>Aujourd'hui</button>
        </div>
      </header>

      <div className="jr-ruban" style={{ ['--nb' as any]: nbJours }}>
        {Array.from({ length: nbJours }, (_, i) => {
          const date = `${cleMois}-${String(i + 1).padStart(2, '0')}`
          const jd = new Date(`${date}T12:00:00`)
          const total = totauxJours[date] || 0
          const weekend = jd.getDay() === 0 || jd.getDay() === 6
          return (
            <button key={date} id={`jr-${date}`} className="jr-jour" aria-current={date === jour ? 'date' : undefined}
              data-weekend={weekend && total === 0} style={{ ['--h' as any]: `${Math.round(total / maxJour * 100)}%` }}
              onClick={() => setJour(date)} aria-label={`${JOURS[jd.getDay()]} ${i + 1}, ${euros(total)}`}>
              {date === aujourdhui && <span className="jr-point" />}
              <span className="jr-j">{JOURS_COURTS[jd.getDay()]}</span>
              <span className="jr-n">{i + 1}</span>
              <span className="jr-m">{total ? eurosRonds(total) : ''}</span>
            </button>
          )
        })}
      </div>

      <div className="jr-corps">
        <section className="jr-panneau">
          <div className="jr-entete">
            <div>
              <h2 className="jr-date">{titreJour}</h2>
              <div className="jr-etat" aria-live="polite">{etat}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="jr-lien" onClick={() => facturer(lignesJour)} disabled={!lignesJour.length}>Factures du jour (PDF)</button><button className="jr-principal" onClick={ajouter} disabled={!userId}>+ Ajouter une recette</button></div>
          </div>

          {loading ? (
            <p className="jr-vide">Chargement…</p>
          ) : lignesJour.length === 0 ? (
            <p className="jr-vide">Aucune recette ce jour.<br />Importe ta capture Doctolib depuis la page Compta, ou ajoute une recette à la main.</p>
          ) : (
            <>
              <div className="jr-ligne jr-titres">
                <span>Patient</span><span>Cabinet</span><span>Acte</span><span>Paiement</span><span style={{ textAlign: 'right', paddingRight: 24 }}>Montant</span><span />
              </div>
              {lignesJour.map(f => {
                const cab = cabinetDe(f)
                const unActe = (f.actes?.length ?? 0) <= 1
                const designation = f.actes?.[0]?.designation ?? ''
                const options = [...(cab?.tarifs.map(t => t.designation) ?? [])]
                if (designation && !options.includes(designation)) options.unshift(designation)
                const mode = f.mode_paiement || ''
                const modes = !mode || PAIEMENTS.includes(mode) ? PAIEMENTS : [mode, ...PAIEMENTS]
                const annulee = f.statut === 'annulee'
                return (
                  <div key={f.id} className="jr-ligne" data-annulee={annulee} data-zero={!annulee && Number(f.total || 0) === 0}>
                    <div className="jr-patient-cell">
                      <input className="jr-champ jr-patient" value={f.patient_nom ?? ''} placeholder={f.numero} aria-label="Patient"
                        onChange={e => modifierLocal(f.id, { patient_nom: e.target.value })}
                        onBlur={e => enregistrer(f.id, { patient_nom: e.target.value })} />
                    </div>
                    <select className="jr-champ" value={f.cabinet ?? ''} onChange={e => changerCabinet(f, e.target.value)} aria-label="Cabinet">
                      <option value="">Non précisé</option>
                      {cabinets.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                    </select>
                    {unActe ? (
                      <select className="jr-champ" value={designation} onChange={e => changerActe(f, e.target.value)} aria-label="Acte">
                        <option value="">Choisir un acte</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <span className="jr-multi">{f.actes!.map(a => a.designation).join(', ')}</span>
                    )}
                    <select className="jr-champ" value={mode} onChange={e => enregistrer(f.id, { mode_paiement: e.target.value })} aria-label="Paiement">
                      {!mode && <option value="">Non précisé</option>}
                      {modes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="jr-euro">
                      <input className="jr-champ jr-montant" type="number" step="0.01" value={f.total ?? 0} aria-label="Montant en euros"
                        onChange={e => modifierLocal(f.id, { total: parseFloat(e.target.value) || 0 })}
                        onBlur={() => enregistrerMontant(f)} />
                      <span>€</span>
                    </div>
                    <div className="jr-actions">
                      <button className="jr-icone" title={String(f.numero).startsWith('FAC-') ? 'Facture ' + f.numero : 'Éditer la facture'} aria-label="Facture" onClick={() => facturer([f])}>📄</button>
                      <button className="jr-icone" title={annulee ? 'Rétablir' : 'Annuler'} aria-label={annulee ? 'Rétablir' : 'Annuler'}
                        onClick={() => enregistrer(f.id, { statut: annulee ? 'payee' : 'annulee' })}>{annulee ? '↺' : '⊘'}</button>
                      <button className="jr-icone" title="Supprimer" aria-label="Supprimer" onClick={() => supprimer(f)}>✕</button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </section>

        <aside className="jr-cote">
          <section className="jr-carte">
            <h3>Ce jour</h3>
            <div className="jr-grand">{euros(brut)}</div>
            <div className="jr-actes">
              {Object.entries(comptes).map(([k, v]) => <span key={k}>{k} × {v}</span>)}
            </div>
            <div className="jr-ligne-stat"><span>Ma part</span><b>{euros(part)}</b></div>
            <div className="jr-ligne-stat"><span>Actes</span><b>{nbActes}</b></div>
            {Object.entries(paiementsJour).sort((a, b) => b[1] - a[1]).map(([m, v]) => (
              <div key={m} className="jr-ligne-stat"><span>{m}</span><b>{euros(v)}</b></div>
            ))}
          </section>

          <section className="jr-carte jr-sombre">
            <h3>{MOIS[mois]} {annee}</h3>
            <div className="jr-grand">{eurosRonds(totalMois)}</div>
            <div style={{ height: 12 }} />
            <div className="jr-ligne-stat"><span>Ma part</span><b>{eurosRonds(partMois)}</b></div>
            <div className="jr-ligne-stat"><span>Jours travaillés</span><b>{joursTravailles}</b></div>
            <div className="jr-ligne-stat"><span>Moyenne par jour</span><b>{eurosRonds(moyenne)}</b></div>
          </section>
        </aside>
      </div>
    </div>
  )
}
