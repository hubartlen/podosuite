'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { donneesVides } from '@/lib/bilan-v2'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function NouveauBilan() {
  const router = useRouter()
  const sp = useSearchParams()
  const [patients, setPatients] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [bilans, setBilans] = useState<any[]>([])
  const [recherche, setRecherche] = useState('')
  const [patientId, setPatientId] = useState(sp.get('patient') || '')
  const [date, setDate] = useState(iso(new Date()))
  const [cabinetId, setCabinetId] = useState('')
  const [uid, setUid] = useState('')
  const [creation, setCreation] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const [{ data: p }, { data: c }, { data: b }] = await Promise.all([
        supabase.from('patients').select('id, nom, prenom, date_naissance').eq('praticien_id', session.user.id).order('nom'),
        supabase.from('cabinets').select('id, nom').eq('praticien_id', session.user.id).order('created_at'),
        supabase.from('bilans').select('id, date_bilan, updated_at, patient:patients(nom, prenom)').eq('praticien_id', session.user.id).eq('format', 2).order('updated_at', { ascending: false }).limit(8),
      ])
      setPatients(p || []); setCabinets(c || []); setBilans(b || [])
      if (c && c.length) setCabinetId(c[0].id)
    })()
  }, [router])

  const choisi = patients.find(p => p.id === patientId)
  const q = recherche.trim().toLowerCase()
  const filtres = q ? patients.filter(p => `${p.nom} ${p.prenom}`.toLowerCase().includes(q)).slice(0, 30) : []

  const commencer = async () => {
    if (!patientId) { alert('Choisis un patient'); return }
    setCreation(true)
    const { data, error } = await createClient().from('bilans').insert({
      patient_id: patientId, praticien_id: uid, date_bilan: date, cabinet_id: cabinetId || null, format: 2, donnees: donneesVides(),
      infection_tegumentaire: 'aucune', hyperkeratose: 'aucune', ongles: 'normaux', deformations: 'aucune',
      valgus_calcaneen: 'absent', patellas: 'zenith', genou: 'normal', bassin: 'absent', ceinture_scapulaire: 'absent',
      semelles_hci: false, semelles_hce: false, semelles_barre: false, semelles_coins: false, talonnette_cote: 'aucune',
    }).select('id').single()
    if (error || !data) { alert('Erreur : ' + (error?.message || 'création impossible')); setCreation(false); return }
    router.push(`/dashboard/bilans/${data.id}/saisie`)
  }

  const carte: React.CSSProperties = { background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }
  const champ: React.CSSProperties = { font: 'inherit', fontSize: 14, padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff', color: 'var(--fg)', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const etiquette: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--fg-3)' }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100, fontFamily: 'Inter, sans-serif', color: 'var(--fg)' }}>
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 400, margin: '0 0 24px' }}>Nouveau bilan podologique</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        <div style={carte}>
          <label style={etiquette}>Patient
            {choisi ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...champ, background: 'var(--bg)' }}>
                <span style={{ fontWeight: 600 }}>{choisi.nom} {choisi.prenom}</span>
                <button type="button" onClick={() => { setPatientId(''); setRecherche('') }} style={{ border: 'none', background: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 13 }}>Changer</button>
              </div>
            ) : (
              <input autoFocus value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Tape le nom du patient…" style={champ} />
            )}
          </label>
          {!choisi && filtres.length > 0 && (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, maxHeight: 280, overflow: 'auto' }}>
              {filtres.map(p => (
                <button key={p.id} type="button" onClick={() => setPatientId(p.id)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--bg)', background: '#fff', font: 'inherit', fontSize: 14, cursor: 'pointer', textAlign: 'left', color: 'var(--fg)' }}>
                  <span>{p.nom} {p.prenom}</span>
                  <span style={{ color: 'var(--fg-3)', fontSize: 12.5 }}>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : ''}</span>
                </button>
              ))}
            </div>
          )}
          {!choisi && q && filtres.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>Aucun patient trouvé. <Link href="/dashboard/patients/new" style={{ color: 'var(--fg)' }}>Créer le patient</Link></p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={etiquette}>Date du bilan<input type="date" value={date} onChange={e => setDate(e.target.value)} style={champ} /></label>
            <div style={etiquette}>Cabinet
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {cabinets.map(c => (
                  <button key={c.id} type="button" onClick={() => setCabinetId(c.id)} aria-pressed={cabinetId === c.id} style={{ font: 'inherit', fontSize: 13, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${cabinetId === c.id ? 'var(--dark)' : 'var(--line)'}`, background: cabinetId === c.id ? 'var(--dark)' : '#fff', color: cabinetId === c.id ? 'var(--bg)' : 'var(--fg-2)' }}>{c.nom}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={commencer} disabled={!patientId || creation} style={{ alignSelf: 'flex-start', font: 'inherit', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 12, border: 'none', background: 'var(--dark)', color: 'var(--on-dark)', cursor: 'pointer', opacity: !patientId || creation ? 0.5 : 1 }}>
            {creation ? 'Création…' : 'Commencer le bilan'}
          </button>
        </div>

        <div style={carte}>
          <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Reprendre un bilan</div>
          {bilans.length === 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>Tes bilans apparaîtront ici.</p>}
          {bilans.map((b: any) => {
            const p = Array.isArray(b.patient) ? b.patient[0] : b.patient
            return (
              <Link key={b.id} href={`/dashboard/bilans/${b.id}/saisie`} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--surface-3)', textDecoration: 'none', color: 'var(--fg)' }}>
                <span style={{ fontWeight: 500 }}>{p?.nom} {p?.prenom}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Bilan du {new Date(`${b.date_bilan}T12:00:00`).toLocaleDateString('fr-FR')}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense><NouveauBilan /></Suspense>
}
