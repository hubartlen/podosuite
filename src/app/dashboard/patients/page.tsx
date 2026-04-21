'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      setPatients(data ?? [])
      setFiltered(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    const s = search.toLowerCase()
    setFiltered(patients.filter(p => p.nom.toLowerCase().includes(s) || p.prenom.toLowerCase().includes(s)))
  }, [search, patients])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid #e2dbd0', borderTopColor: '#c8b89a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '32px 36px', maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#1a1410', fontWeight: '400', letterSpacing: '-0.01em' }}>Patients</h1>
          <p style={{ fontSize: '13px', color: '#9b8f7e', marginTop: '4px' }}>{patients.length} patient(s) enregistré(s)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/patients/import" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: '#fff', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', color: '#4a3f35', textDecoration: 'none', fontWeight: '500' }}>
            ↑ Import Doctolib
          </Link>
          <Link href="/dashboard/patients/new" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: '#1a1410', borderRadius: '10px', fontSize: '13px', color: '#f5f2ee', textDecoration: 'none', fontWeight: '500' }}>
            + Nouveau patient
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input type="text" placeholder="Rechercher un patient..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '11px 16px', background: '#fff', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '14px', color: '#1a1410', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2dbd0', overflow: 'hidden' }}>
        {/* En-tête */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', padding: '12px 20px', borderBottom: '1px solid #f0ebe4', background: '#f9f7f4' }}>
          {['Nom', 'Date de naissance', 'Téléphone', 'Mutuelle', ''].map(h => (
            <span key={h} style={{ fontSize: '11px', color: '#9b8f7e', fontWeight: '500', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {/* Lignes */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9b8f7e', fontSize: '14px' }}>
            {search ? 'Aucun résultat' : 'Aucun patient — '}
            {!search && <Link href="/dashboard/patients/new" style={{ color: '#c8b89a', textDecoration: 'none' }}>créer le premier</Link>}
          </div>
        ) : filtered.map((p: any, i: number) => (
          <Link key={p.id} href={`/dashboard/patients/${p.id}`} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
            padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f5f2ee' : 'none',
            textDecoration: 'none', alignItems: 'center',
            background: 'transparent', transition: 'background 0.1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#faf8f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '34px', height: '34px', background: '#1a1410', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '12px', color: '#c8b89a', flexShrink: 0 }}>
                {p.prenom?.[0]}{p.nom?.[0]}
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1410' }}>{p.nom} {p.prenom}</span>
            </div>
            <span style={{ fontSize: '13px', color: '#4a3f35' }}>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : '—'}</span>
            <span style={{ fontSize: '13px', color: '#4a3f35' }}>{p.telephone || '—'}</span>
            <span style={{ fontSize: '13px', color: '#4a3f35' }}>{p.mutuelle || '—'}</span>
            <span style={{ color: '#c8b89a', fontSize: '16px' }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
