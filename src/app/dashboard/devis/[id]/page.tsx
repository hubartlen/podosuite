'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DocumentDevis, { eur2 } from '@/app/dashboard/devis/document-devis'

const STATUTS: [string, string][] = [['brouillon', 'Brouillon'], ['envoye', 'Envoyé'], ['accepte', 'Accepté'], ['refuse', 'Refusé']]
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

export default function EditeurDevis() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [d, setD] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [praticien, setPraticien] = useState<any>(null)
  const [cabinets, setCabinets] = useState<any[]>([])
  const [uid, setUid] = useState('')
  const [etat, setEtat] = useState('')
  const [facture, setFacture] = useState<any>(null)
  const [transfo, setTransfo] = useState(false)
  const pret = useRef(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const { data: dv } = await supabase.from('devis').select('*, patient:patients(*)').eq('id', id).eq('praticien_id', session.user.id).single()
      if (!dv) { router.push('/dashboard/devis'); return }
      const [{ data: prat }, { data: cabs }] = await Promise.all([
        supabase.from('praticiens').select('*').eq('id', session.user.id).single(),
        supabase.from('cabinets').select('id, nom, adresse, tarifs(designation, prix, ordre)').eq('praticien_id', session.user.id).order('created_at'),
      ])
      if (dv.facture_id) {
        const { data: f } = await supabase.from('factures').select('*').eq('id', dv.facture_id).single()
        setFacture(f)
      }
      const { patient: p, ...reste } = dv
      setPatient(Array.isArray(p) ? p[0] : p)
      setPraticien(prat)
      setCabinets((cabs || []).map((c: any) => ({ ...c, tarifs: (c.tarifs || []).sort((a: any, b: any) => a.ordre - b.ordre) })))
      setD({ ...reste, lignes: reste.lignes || [] })
    })()
  }, [id])

  useEffect(() => {
    if (!d) return
    if (!pret.current) { pret.current = true; return }
    setEtat('Modifications en cours…')
    const t = setTimeout(async () => {
      const { error } = await createClient().from('devis').update({
        date_devis: d.date_devis, cabinet_id: d.cabinet_id, validite_jours: d.validite_jours, lignes: d.lignes,
        total: d.total, statut: d.statut, note: d.note, mention_mutuelle: d.mention_mutuelle, updated_at: new Date().toISOString(),
      }).eq('id', id)
      setEtat(error ? 'Erreur : ' + error.message : 'Enregistré')
    }, 600)
    return () => clearTimeout(t)
  }, [d])

  if (!d) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Chargement du devis…</div>

  const cabinet = cabinets.find(c => c.id === d.cabinet_id)
  const maj = (champs: any) => setD((p: any) => ({ ...p, ...champs }))
  const avecTotal = (lignes: any[]) => ({ lignes, total: lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0), 0) })
  const majLigne = (i: number, champ: string, v: any) => maj(avecTotal(d.lignes.map((l: any, j: number) => (j === i ? { ...l, [champ]: v } : l))))
  const ajouterLigne = (l: any) => maj(avecTotal([...d.lignes, l]))
  const retirerLigne = (i: number) => maj(avecTotal(d.lignes.filter((_: any, j: number) => j !== i)))

  const transformer = async () => {
    if (!patient) { alert("Ce devis n'a pas de patient."); return }
    const mode = prompt('Mode de paiement (Carte bancaire, Espèces, Chèque, Virement, Tiers payant)', 'Carte bancaire')
    if (mode === null) return
    setTransfo(true)
    try {
      const supabase = createClient()
      const { prochainNumero, trouverPatient } = await import('@/lib/factures')
      const jour = iso(new Date())
      const numero = await prochainNumero(supabase, uid, jour.slice(0, 4))
      const actes = d.lignes.filter((l: any) => (l.designation || '').trim()).map((l: any) => ({ designation: l.designation, quantite: Number(l.quantite) || 1, prix_unitaire: Number(l.prix_unitaire) || 0 }))
      const champs = { numero, patient_id: d.patient_id, date_facture: jour, actes, mode_paiement: mode || 'Carte bancaire', total: Number(d.total) || 0, cabinet: cabinet?.nom || null, statut: 'payee' }
      const { data: memeJour } = await supabase.from('factures').select('id, numero, patient_id, patient_nom').eq('praticien_id', uid).eq('date_facture', jour).or('statut.is.null,statut.neq.annulee')
      const existante: any = (memeJour || []).find((f: any) => !String(f.numero).startsWith('FAC-') && (f.patient_id === d.patient_id || trouverPatient([patient], f.patient_nom || '')))
      const res = existante
        ? await supabase.from('factures').update(champs).eq('id', existante.id).select().single()
        : await supabase.from('factures').insert({ ...champs, praticien_id: uid, source: 'devis' }).select().single()
      if (res.error || !res.data) throw new Error(res.error?.message || 'facture impossible')
      await supabase.from('devis').update({ statut: 'facture', facture_id: res.data.id }).eq('id', id)
      pret.current = false
      setD((p: any) => ({ ...p, statut: 'facture', facture_id: res.data.id }))
      setFacture(res.data)
      const { genererPDFFacture } = await import('@/lib/pdf-facture')
      genererPDFFacture(res.data, patient, praticien).save('Facture_' + res.data.numero + '_' + (patient.nom || '') + '.pdf')
      setEtat('Facture ' + res.data.numero + ' créée' + (existante ? ' à partir de la recette du jour' : ''))
    } catch (e: any) { alert('Erreur : ' + (e?.message || '')) }
    setTransfo(false)
  }

  const telechargerFacture = async () => {
    if (!facture) return
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    genererPDFFacture(facture, patient, praticien).save('Facture_' + facture.numero + '.pdf')
  }

  return (
    <div className="de">
      <style>{`
        .de{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;padding:28px 32px 60px;max-width:1400px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);box-sizing:border-box}
        .de *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .de-col{display:flex;flex-direction:column;gap:16px;min-width:0}
        .de-carte{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
        .de-grille{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
        .de-champ{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--fg-3)}
        .de-champ input,.de-champ select,.de-champ textarea,.de-mini{font:inherit;font-size:14px;color:var(--fg);padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);box-sizing:border-box;width:100%}
        .de-champ textarea{resize:vertical;min-height:70px}
        .de-ligne{display:grid;grid-template-columns:minmax(0,1fr) 70px 110px 100px 32px;gap:8px;align-items:center}
        .de-num{text-align:right;font-variant-numeric:tabular-nums}
        .de-x{border:1px solid var(--line);background:none;width:32px;height:32px;border-radius:8px;cursor:pointer;color:var(--fg-2)}
        .de-bouton{font:inherit;font-size:13.5px;padding:10px 15px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
        .de-bouton:hover{border-color:var(--accent)}
        .de-principal{font:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;border-radius:10px;border:none;background:var(--accent);color:var(--accent-fg);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
        .de-principal:disabled{opacity:.5;cursor:default}
        .de-seg{display:flex;gap:6px;flex-wrap:wrap}
        .de-seg button{font:inherit;font-size:13px;padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
        .de-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
        .de-apercu{position:sticky;top:16px;align-self:start;background:var(--surface-3);border-radius:16px;padding:16px;max-height:calc(100vh - 32px);overflow:auto}
        .de-apercu>.podian-doc{zoom:.46;box-shadow:0 2px 10px rgba(0,0,0,.15)}
        @media (max-width:1150px){.de{grid-template-columns:1fr}.de-apercu{display:none}}
        @media (max-width:640px){.de{padding:18px 14px 90px}.de-grille{grid-template-columns:1fr}.de-ligne{grid-template-columns:1fr 60px 90px 32px}.de-ligne>.de-num:nth-child(4){display:none}}
      `}</style>

      <div className="de-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Link href="/dashboard/devis" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Tous les devis</Link>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 30, margin: '4px 0 2px' }}>{d.numero}, {patient ? patient.prenom + ' ' + patient.nom : ''}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }} aria-live="polite">{etat || 'Enregistrement automatique'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="de-bouton" href={'/dashboard/devis/' + id + '/document'} target="_blank" rel="noopener">Ouvrir le document</a>
            {facture
              ? <button className="de-bouton" onClick={telechargerFacture}>Facture {facture.numero}</button>
              : <button className="de-principal" onClick={transformer} disabled={transfo || !d.lignes.length}>{transfo ? 'Création…' : 'Transformer en facture'}</button>}
          </div>
        </div>

        {d.statut === 'facture' && (
          <div style={{ background: '#efe4f4', color: '#6a3f7c', borderRadius: 12, padding: '12px 16px', fontSize: 14 }}>
            Ce devis a été facturé{facture ? ' (' + facture.numero + ')' : ''}. Tu peux encore le consulter ou l'imprimer.
          </div>
        )}

        <section className="de-carte">
          <div className="de-grille">
            <label className="de-champ">Date du devis<input type="date" value={d.date_devis || ''} onChange={e => maj({ date_devis: e.target.value })} /></label>
            <label className="de-champ">Cabinet
              <select value={d.cabinet_id || ''} onChange={e => maj({ cabinet_id: e.target.value || null })}>
                <option value="">Non précisé</option>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <label className="de-champ">Validité
              <select value={d.validite_jours} onChange={e => maj({ validite_jours: parseInt(e.target.value) })}>
                {[30, 60, 90, 180].map(v => <option key={v} value={v}>{v} jours</option>)}
              </select>
            </label>
          </div>
          {d.statut !== 'facture' && (
            <div className="de-champ">Statut
              <div className="de-seg">
                {STATUTS.map(([k, l]) => <button key={k} type="button" aria-pressed={d.statut === k} onClick={() => maj({ statut: k })}>{l}</button>)}
              </div>
            </div>
          )}
        </section>

        <section className="de-carte">
          <strong style={{ fontSize: 15 }}>Prestations</strong>
          {d.lignes.length > 0 && (
            <div className="de-ligne" style={{ fontSize: 12, color: 'var(--fg-3)' }}><span>Désignation</span><span className="de-num">Qté</span><span className="de-num">Prix unitaire</span><span className="de-num">Montant</span><span /></div>
          )}
          {d.lignes.map((l: any, i: number) => (
            <div key={i} className="de-ligne">
              <input className="de-mini" value={l.designation} onChange={e => majLigne(i, 'designation', e.target.value)} aria-label="Désignation" />
              <input className="de-mini de-num" type="number" min={1} value={l.quantite} onChange={e => majLigne(i, 'quantite', parseInt(e.target.value) || 1)} aria-label="Quantité" />
              <input className="de-mini de-num" type="number" step="0.01" min={0} value={l.prix_unitaire} onChange={e => majLigne(i, 'prix_unitaire', parseFloat(e.target.value) || 0)} aria-label="Prix unitaire" />
              <span className="de-num" style={{ fontWeight: 600 }}>{eur2((Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0))}</span>
              <button className="de-x" type="button" aria-label="Retirer la ligne" onClick={() => retirerLigne(i)}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="de-mini" style={{ width: 'auto', maxWidth: '100%' }} value="" onChange={e => {
              const t = cabinet?.tarifs.find((x: any) => x.designation === e.target.value)
              if (t) ajouterLigne({ designation: t.designation, quantite: 1, prix_unitaire: Number(t.prix) || 0 })
            }}>
              <option value="">+ Ajouter un acte du cabinet…</option>
              {(cabinet?.tarifs || []).map((t: any) => <option key={t.designation} value={t.designation}>{t.designation}, {t.prix} €</option>)}
            </select>
            <button className="de-bouton" type="button" onClick={() => ajouterLigne({ designation: '', quantite: 1, prix_unitaire: 0 })}>+ Ligne libre</button>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 24 }}>{eur2(d.total)}</span>
          </div>
        </section>

        <section className="de-carte">
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!d.mention_mutuelle} onChange={e => maj({ mention_mutuelle: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
            Devis destiné à la mutuelle (mention et numéro de sécurité sociale sur le document)
          </label>
          <label className="de-champ">Précisions sur le document (facultatif)
            <textarea value={d.note || ''} onChange={e => maj({ note: e.target.value })} placeholder="Ex. : orthèses plantaires sur mesure, pointure 39, réalisation sous 15 jours" />
          </label>
        </section>
      </div>

      <aside className="de-apercu" aria-label="Aperçu du document">
        <DocumentDevis devis={d} patient={patient} praticien={praticien} cabinet={cabinet} />
      </aside>
    </div>
  )
}
