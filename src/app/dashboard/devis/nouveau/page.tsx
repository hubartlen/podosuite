'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function NouveauDevis() {
  const router = useRouter()
  const sp = useSearchParams()
  const bilanId = sp.get('bilan') || ''
  const [uid, setUid] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [patientId, setPatientId] = useState(sp.get('patient') || '')
  const [cabinetId, setCabinetId] = useState(sp.get('cabinet') || '')
  const [choisis, setChoisis] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [creation, setCreation] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from('patients').select('id, nom, prenom, date_naissance').eq('praticien_id', session.user.id).order('nom').range(0, 4999),
        supabase.from('cabinets').select('id, nom, tarifs(designation, prix, ordre)').eq('praticien_id', session.user.id).order('created_at'),
      ])
      const cabs = (c || []).map((x: any) => ({ ...x, tarifs: (x.tarifs || []).sort((a: any, b: any) => a.ordre - b.ordre) }))
      setPatients(p || []); setCabinets(cabs)
      const cab = cabs.find((x: any) => x.id === cabinetId) || cabs[0]
      if (cab) {
        setCabinetId(cab.id)
        if (bilanId) setChoisis(cab.tarifs.filter((t: any) => /semelle/i.test(t.designation)).slice(0, 1).map((t: any) => t.designation))
      }
    })()
  }, [])

  const cabinet = cabinets.find(c => c.id === cabinetId)
  const choisi = patients.find(p => p.id === patientId)
  const filtres = q.trim() ? patients.filter(p => norm(p.nom + ' ' + p.prenom).includes(norm(q.trim())) || norm(p.prenom + ' ' + p.nom).includes(norm(q.trim()))).slice(0, 30) : []
  const basculer = (d: string) => setChoisis(c => (c.includes(d) ? c.filter(x => x !== d) : [...c, d]))

  const creer = async () => {
    if (!patientId) { alert('Choisis un patient'); return }
    setCreation(true)
    const supabase = createClient()
    const annee = iso(new Date()).slice(0, 4)
    const { data: der } = await supabase.from('devis').select('numero').eq('praticien_id', uid).like('numero', 'DEV-' + annee + '-%').order('numero', { ascending: false }).limit(1)
    const n = der && der[0] ? parseInt(String(der[0].numero).split('-')[2]) || 0 : 0
    const numero = 'DEV-' + annee + '-' + String(n + 1).padStart(4, '0')
    const lignes = (cabinet?.tarifs || []).filter((t: any) => choisis.includes(t.designation)).map((t: any) => ({ designation: t.designation, quantite: 1, prix_unitaire: Number(t.prix) || 0 }))
    const total = lignes.reduce((s: number, l: any) => s + l.quantite * l.prix_unitaire, 0)
    const { data, error } = await supabase.from('devis').insert({
      praticien_id: uid, patient_id: patientId, cabinet_id: cabinetId || null, bilan_id: bilanId || null,
      numero, date_devis: iso(new Date()), lignes, total, statut: 'brouillon', mention_mutuelle: true,
    }).select('id').single()
    if (error || !data) { alert('Erreur : ' + (error?.message || 'création impossible')); setCreation(false); return }
    router.push('/dashboard/devis/' + data.id)
  }

  const carte: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }
  const champ: React.CSSProperties = { font: 'inherit', fontSize: 14, padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', width: '100%', boxSizing: 'border-box' }
  const etiquette: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--fg-3)' }
  const pill = (actif: boolean): React.CSSProperties => ({ font: 'inherit', fontSize: 13, padding: '9px 13px', borderRadius: 10, cursor: 'pointer', border: '1px solid ' + (actif ? 'var(--dark)' : 'var(--line)'), background: actif ? 'var(--dark)' : 'var(--surface)', color: actif ? 'var(--on-dark)' : 'var(--fg-2)' })

  return (
    <div style={{ padding: '30px 36px 60px', maxWidth: 820, fontFamily: 'Inter, sans-serif', color: 'var(--fg)' }}>
      <Link href="/dashboard/devis" style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Tous les devis</Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, margin: '6px 0 22px' }}>Nouveau devis</h1>
      <div style={carte}>
        <label style={etiquette}>Patient
          {choisi ? (
            <div style={{ ...champ, display: 'flex', justifyContent: 'space-between', background: 'var(--surface-2)' }}>
              <span style={{ fontWeight: 600 }}>{choisi.nom} {choisi.prenom}</span>
              <button type="button" onClick={() => { setPatientId(''); setQ('') }} style={{ border: 'none', background: 'none', color: 'var(--fg-2)', cursor: 'pointer', font: 'inherit', fontSize: 13 }}>Changer</button>
            </div>
          ) : <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tape le nom du patient…" style={champ} />}
        </label>
        {!choisi && filtres.length > 0 && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 12, maxHeight: 260, overflow: 'auto' }}>
            {filtres.map(p => (
              <button key={p.id} type="button" onClick={() => setPatientId(p.id)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--line-2)', background: 'var(--surface)', font: 'inherit', fontSize: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--fg)' }}>
                <span>{p.nom} {p.prenom}</span><span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : ''}</span>
              </button>
            ))}
          </div>
        )}
        <div style={etiquette}>Cabinet
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cabinets.map(c => <button key={c.id} type="button" style={pill(cabinetId === c.id)} aria-pressed={cabinetId === c.id} onClick={() => { setCabinetId(c.id); setChoisis([]) }}>{c.nom}</button>)}
          </div>
        </div>
        <div style={etiquette}>Prestations (tu pourras tout ajuster ensuite)
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(cabinet?.tarifs || []).map((t: any) => (
              <button key={t.designation} type="button" style={pill(choisis.includes(t.designation))} aria-pressed={choisis.includes(t.designation)} onClick={() => basculer(t.designation)}>{t.designation}, {t.prix} €</button>
            ))}
          </div>
        </div>
        <button onClick={creer} disabled={!patientId || creation} style={{ alignSelf: 'flex-start', font: 'inherit', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'var(--accent-fg)', cursor: 'pointer', opacity: !patientId || creation ? 0.5 : 1 }}>
          {creation ? 'Création…' : 'Créer le devis'}
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense><NouveauDevis /></Suspense>
}
