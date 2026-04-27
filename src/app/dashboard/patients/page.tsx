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
    setFiltered(patients.filter(p => p.nom?.toLowerCase().includes(s) || p.prenom?.toLowerCase().includes(s)))
  }, [search, patients])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div style={{width:'24px',height:'24px',border:'2px solid var(--line)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Base de données</div>
          <h1>Patients</h1>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/dashboard/patients/import" className="btn">↑ Import Doctolib</Link>
          <Link href="/dashboard/patients/new" className="btn primary">+ Nouveau patient</Link>
        </div>
      </div>

      {/* Recherche */}
      <div style={{marginBottom:16}}>
        <div className="input" style={{maxWidth:360}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="Rechercher un patient..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Date de naissance</th>
              <th>Téléphone</th>
              <th>Mutuelle</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',color:'var(--fg-3)',padding:'32px'}}>{search ? 'Aucun résultat' : 'Aucun patient'}</td></tr>
            ) : filtered.map((p: any) => (
              <tr key={p.id} onClick={() => router.push(`/dashboard/patients/${p.id}`)}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div className="avatar">{p.prenom?.[0]}{p.nom?.[0]}</div>
                    <span style={{fontWeight:500}}>{p.nom} {p.prenom}</span>
                  </div>
                </td>
                <td className="muted">{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="muted">{p.telephone || '—'}</td>
                <td>{p.mutuelle ? <span className="tag">{p.mutuelle}</span> : <span className="muted">—</span>}</td>
                <td style={{textAlign:'right',color:'var(--fg-4)'}}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
