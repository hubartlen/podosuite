'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DocumentOrdonnance from '@/app/dashboard/ordonnances/document-ordonnance'
import { CSS_OR, EditeurLignes, Mentions } from '@/app/dashboard/ordonnances/editeur-lignes'

export default function EditeurModele() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [m, setM] = useState<any>(null)
  const [praticien, setPraticien] = useState<any>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [etat, setEtat] = useState('')
  const pret = useRef(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const [{ data: mo }, { data: prat }, { data: tous }] = await Promise.all([
        supabase.from('ordonnance_modeles').select('*').eq('id', id).eq('praticien_id', session.user.id).single(),
        supabase.from('praticiens').select('*').eq('id', session.user.id).single(),
        supabase.from('ordonnance_modeles').select('categorie').eq('praticien_id', session.user.id),
      ])
      if (!mo) { router.push('/dashboard/ordonnances?onglet=modeles'); return }
      setM({ ...mo, lignes: mo.lignes || [] }); setPraticien(prat)
      setCategories(Array.from(new Set((tous || []).map((x: any) => x.categorie))))
    })()
  }, [id])

  useEffect(() => {
    if (!m) return
    if (!pret.current) { pret.current = true; return }
    setEtat('Modifications en cours…')
    const t = setTimeout(async () => {
      const { error } = await createClient().from('ordonnance_modeles').update({
        titre: m.titre, categorie: m.categorie, format: m.format, lignes: m.lignes, mentions: m.mentions, note_interne: m.note_interne,
      }).eq('id', id)
      setEtat(error ? 'Erreur : ' + error.message : 'Enregistré')
    }, 600)
    return () => clearTimeout(t)
  }, [m])

  if (!m) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Chargement…</div>
  const maj = (c: any) => setM((p: any) => ({ ...p, ...c }))
  const exemple = { date_ordonnance: new Date().toISOString().slice(0, 10), format: m.format, lignes: m.lignes, lignes_hors: [], mentions: m.mentions }

  return (
    <div className="or" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', gap: 24, padding: '28px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{CSS_OR + `
        .or-apercu{position:sticky;top:16px;align-self:start;background:var(--surface-3);border-radius:16px;padding:16px;max-height:calc(100vh - 32px);overflow:auto}
        .or-apercu>.podian-doc{zoom:.46;box-shadow:0 2px 10px rgba(0,0,0,.15)}
        @media (max-width:1150px){.or{grid-template-columns:1fr!important}.or-apercu{display:none}}
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div>
          <Link href="/dashboard/ordonnances?onglet=modeles" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Modèles</Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 30, margin: '4px 0 2px' }}>Modèle d'ordonnance</h1>
          <div style={{ fontSize: 12.5, color: 'var(--fg-3)' }} aria-live="polite">{etat || 'Enregistrement automatique'}</div>
        </div>
        <section className="or-carte">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label className="or-champ">Nom du modèle<input value={m.titre} onChange={e => maj({ titre: e.target.value })} /></label>
            <label className="or-champ">Catégorie
              <input list="or-categories" value={m.categorie} onChange={e => maj({ categorie: e.target.value })} />
              <datalist id="or-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </label>
            <div className="or-champ">Format
              <div className="or-seg">
                <button type="button" aria-pressed={m.format !== 'ald'} onClick={() => maj({ format: 'simple' })}>Simple</button>
                <button type="button" aria-pressed={m.format === 'ald'} onClick={() => maj({ format: 'ald' })}>ALD, deux zones</button>
              </div>
            </div>
          </div>
        </section>
        <section className="or-carte"><EditeurLignes titre="Prescription" lignes={m.lignes} onChange={l => maj({ lignes: l })} /></section>
        <section className="or-carte"><Mentions valeur={m.mentions || ''} onChange={v => maj({ mentions: v })} /></section>
        <section className="or-carte">
          <label className="or-champ">Rappel pour toi (n'apparaît pas sur l'ordonnance)
            <textarea value={m.note_interne || ''} onChange={e => maj({ note_interne: e.target.value })} placeholder="Ex. : adapter le grade de risque" />
          </label>
        </section>
      </div>
      <aside className="or-apercu" aria-label="Aperçu"><DocumentOrdonnance o={exemple} patient={null} praticien={praticien} cabinet={null} /></aside>
    </div>
  )
}
