'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DocumentOrdonnance from '@/app/dashboard/ordonnances/document-ordonnance'
import { CSS_OR, EditeurLignes, Mentions } from '@/app/dashboard/ordonnances/editeur-lignes'

export default function EditeurOrdonnance() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [o, setO] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [praticien, setPraticien] = useState<any>(null)
  const [cabinets, setCabinets] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [etat, setEtat] = useState('')
  const [uid, setUid] = useState('')
  const pret = useRef(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const { data: od } = await supabase.from('ordonnances').select('*, patient:patients(*)').eq('id', id).eq('praticien_id', session.user.id).single()
      if (!od) { router.push('/dashboard/ordonnances'); return }
      const [{ data: prat }, { data: cabs }] = await Promise.all([
        supabase.from('praticiens').select('*').eq('id', session.user.id).single(),
        supabase.from('cabinets').select('id, nom, adresse').eq('praticien_id', session.user.id).order('created_at'),
      ])
      if (od.modele_id) {
        const { data: m } = await supabase.from('ordonnance_modeles').select('note_interne').eq('id', od.modele_id).single()
        setNote(m?.note_interne || '')
      }
      const { patient: p, ...reste } = od
      setPatient(Array.isArray(p) ? p[0] : p)
      setPraticien(prat); setCabinets(cabs || [])
      setO({ ...reste, lignes: reste.lignes || [], lignes_hors: reste.lignes_hors || [] })
    })()
  }, [id])

  useEffect(() => {
    if (!o) return
    if (!pret.current) { pret.current = true; return }
    setEtat('Modifications en cours…')
    const t = setTimeout(async () => {
      const { error } = await createClient().from('ordonnances').update({
        date_ordonnance: o.date_ordonnance, cabinet_id: o.cabinet_id, format: o.format, lignes: o.lignes,
        lignes_hors: o.lignes_hors, mentions: o.mentions, updated_at: new Date().toISOString(),
      }).eq('id', id)
      setEtat(error ? 'Erreur : ' + error.message : 'Enregistré')
    }, 600)
    return () => clearTimeout(t)
  }, [o])

  if (!o) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Chargement…</div>
  const maj = (c: any) => setO((p: any) => ({ ...p, ...c }))
  const cabinet = cabinets.find(c => c.id === o.cabinet_id)

  const enModele = async () => {
    const titre = prompt('Nom du nouveau modèle', '')
    if (!titre || !titre.trim()) return
    const categorie = prompt('Catégorie (ex. Mycose des ongles, Soins…)', 'Autres') || 'Autres'
    const { error } = await createClient().from('ordonnance_modeles').insert({ praticien_id: uid, titre: titre.trim(), categorie: categorie.trim(), format: o.format, lignes: o.lignes, mentions: o.mentions })
    setEtat(error ? 'Erreur : ' + error.message : 'Modèle « ' + titre.trim() + ' » enregistré')
  }
  const supprimer = async () => {
    if (!confirm('Supprimer définitivement cette ordonnance ?')) return
    await createClient().from('ordonnances').delete().eq('id', id)
    router.push('/dashboard/ordonnances')
  }

  return (
    <div className="or" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', gap: 24, padding: '28px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{CSS_OR + `
        .or-apercu{position:sticky;top:16px;align-self:start;background:var(--surface-3);border-radius:16px;padding:16px;max-height:calc(100vh - 32px);overflow:auto}
        .or-apercu>.podian-doc{zoom:.46;box-shadow:0 2px 10px rgba(0,0,0,.15)}
        @media (max-width:1150px){.or{grid-template-columns:1fr!important}.or-apercu{display:none}}
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <Link href="/dashboard/ordonnances" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Ordonnances</Link>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 30, margin: '4px 0 2px' }}>Ordonnance, {patient ? patient.prenom + ' ' + patient.nom : ''}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }} aria-live="polite">{etat || 'Enregistrement automatique'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="or-bouton" onClick={enModele}>Enregistrer comme modèle</button>
            <a className="or-principal" href={'/dashboard/ordonnances/' + id + '/document'} target="_blank" rel="noopener">Imprimer</a>
          </div>
        </div>
        {note && <div className="or-note">{note}</div>}
        <section className="or-carte">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label className="or-champ">Date<input type="date" value={o.date_ordonnance} onChange={e => maj({ date_ordonnance: e.target.value })} /></label>
            <label className="or-champ">Cabinet
              <select value={o.cabinet_id || ''} onChange={e => maj({ cabinet_id: e.target.value || null })}>
                <option value="">Adresse principale</option>
                {cabinets.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </label>
            <div className="or-champ">Format
              <div className="or-seg">
                <button type="button" aria-pressed={o.format !== 'ald'} onClick={() => maj({ format: 'simple' })}>Simple</button>
                <button type="button" aria-pressed={o.format === 'ald'} onClick={() => maj({ format: 'ald' })}>ALD, deux zones</button>
              </div>
            </div>
          </div>
        </section>
        <section className="or-carte">
          <EditeurLignes titre={o.format === 'ald' ? 'Zone ALD (affection exonérante)' : 'Prescription'} lignes={o.lignes} onChange={l => maj({ lignes: l })} />
          {o.format === 'ald' && <EditeurLignes titre="Zone hors ALD (maladies intercurrentes)" lignes={o.lignes_hors} onChange={l => maj({ lignes_hors: l })} />}
        </section>
        <section className="or-carte">
          <Mentions valeur={o.mentions || ''} onChange={v => maj({ mentions: v })} />
        </section>
        <button className="or-bouton" style={{ alignSelf: 'flex-start', color: '#9a3b16' }} onClick={supprimer}>Supprimer cette ordonnance</button>
      </div>
      <aside className="or-apercu" aria-label="Aperçu"><DocumentOrdonnance o={o} patient={patient} praticien={praticien} cabinet={cabinet} /></aside>
    </div>
  )
}
