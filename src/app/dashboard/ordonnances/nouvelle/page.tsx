'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CSS_OR } from '@/app/dashboard/ordonnances/editeur-lignes'

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

function Nouvelle() {
  const router = useRouter()
  const sp = useSearchParams()
  const [uid, setUid] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [modeles, setModeles] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [patientId, setPatientId] = useState(sp.get('patient') || '')
  const [cabinetId, setCabinetId] = useState('')
  const [q, setQ] = useState('')
  const [creation, setCreation] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const [{ data: p }, { data: m }, { data: c }] = await Promise.all([
        supabase.from('patients').select('id, nom, prenom, date_naissance').eq('praticien_id', session.user.id).order('nom').range(0, 4999),
        supabase.from('ordonnance_modeles').select('*').eq('praticien_id', session.user.id).order('categorie').order('ordre'),
        supabase.from('cabinets').select('id, nom').eq('praticien_id', session.user.id).order('created_at'),
      ])
      setPatients(p || []); setModeles(m || []); setCabinets(c || [])
      if (c && c.length) setCabinetId(c[0].id)
    })()
  }, [])

  const choisi = patients.find(p => p.id === patientId)
  const filtres = q.trim() ? patients.filter(p => norm(p.nom + ' ' + p.prenom).includes(norm(q.trim())) || norm(p.prenom + ' ' + p.nom).includes(norm(q.trim()))).slice(0, 30) : []
  const categories = Array.from(new Set(modeles.map(m => m.categorie)))

  const creer = async (m: any | null) => {
    if (!patientId) { alert("Choisis d'abord le patient"); return }
    setCreation(true)
    const { data, error } = await createClient().from('ordonnances').insert({
      praticien_id: uid, patient_id: patientId, cabinet_id: cabinetId || null, modele_id: m?.id || null, date_ordonnance: iso(new Date()),
      format: m?.format || 'simple', lignes: m?.lignes?.length ? m.lignes : [{ produit: '', posologie: '' }], lignes_hors: [], mentions: m?.mentions || '',
    }).select('id').single()
    if (error || !data) { alert('Erreur : ' + (error?.message || '')); setCreation(false); return }
    router.push('/dashboard/ordonnances/' + data.id)
  }

  return (
    <div className="or" style={{ padding: '30px 36px 60px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{CSS_OR + `
        .or-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
        .or-choix{text-align:left;font:inherit;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;cursor:pointer;display:flex;flex-direction:column;gap:6px;color:var(--fg)}
        .or-choix:hover:not(:disabled){border-color:var(--accent);box-shadow:0 4px 14px rgba(0,0,0,.06)}
        .or-choix:disabled{opacity:.45;cursor:default}
      `}</style>
      <div>
        <Link href="/dashboard/ordonnances" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Ordonnances</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, margin: '6px 0 0' }}>Nouvelle ordonnance</h1>
      </div>
      <section className="or-carte">
        <label className="or-champ">Patient
          {choisi ? (
            <div className="or-mini" style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
              <b>{choisi.nom} {choisi.prenom}</b>
              <button type="button" onClick={() => { setPatientId(''); setQ('') }} style={{ border: 'none', background: 'none', color: 'var(--fg-2)', cursor: 'pointer', font: 'inherit', fontSize: 13 }}>Changer</button>
            </div>
          ) : <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tape le nom du patient…" />}
        </label>
        {!choisi && filtres.length > 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, maxHeight: 240, overflow: 'auto' }}>
            {filtres.map(p => (
              <button key={p.id} type="button" onClick={() => setPatientId(p.id)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--line-2)', background: 'var(--surface)', font: 'inherit', fontSize: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--fg)' }}>
                <span>{p.nom} {p.prenom}</span><span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : ''}</span>
              </button>
            ))}
          </div>
        )}
        {cabinets.length > 1 && (
          <div className="or-champ">Cabinet
            <div className="or-seg">{cabinets.map(c => <button key={c.id} type="button" aria-pressed={cabinetId === c.id} onClick={() => setCabinetId(c.id)}>{c.nom}</button>)}</div>
          </div>
        )}
      </section>

      <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>{choisi ? 'Clique sur le modèle à utiliser :' : 'Choisis le patient, puis clique sur un modèle.'}</p>
      <button className="or-choix" disabled={!patientId || creation} onClick={() => creer(null)} style={{ maxWidth: 260 }}>
        <strong>Ordonnance vierge</strong><span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>Écrire librement</span>
      </button>
      {categories.map(c => (
        <section key={c} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20, margin: 0 }}>{c}</h2>
          <div className="or-grille">
            {modeles.filter(m => m.categorie === c).map(m => (
              <button key={m.id} className="or-choix" disabled={!patientId || creation} onClick={() => creer(m)}>
                <strong style={{ fontSize: 14.5 }}>{m.titre}</strong>
                <span style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.45 }}>{(m.lignes || []).map((l: any) => l.produit || l.posologie).filter(Boolean).join(', ').slice(0, 110)}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function Page() {
  return <Suspense><Nouvelle /></Suspense>
}
