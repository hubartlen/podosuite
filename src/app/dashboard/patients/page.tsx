'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Search, Upload } from 'lucide-react'

const COLORS = ['bg-blue-100 text-blue-600','bg-purple-100 text-purple-600','bg-emerald-100 text-emerald-600','bg-amber-100 text-amber-600','bg-pink-100 text-pink-600']

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
    setFiltered(patients.filter(p =>
      p.nom.toLowerCase().includes(s) || p.prenom.toLowerCase().includes(s)
    ))
  }, [search, patients])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Chargement...</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Patients</h1>
          <p className="text-xs text-slate-400 mt-0.5">{patients.length} patient(s)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/patients/import"
            className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium">
            <Upload size={15} /> Import
          </Link>
          <Link href="/dashboard/patients/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium">
            <Plus size={15} /> Nouveau
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un patient..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Search size={28} className="opacity-40" />
            <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun patient'}</p>
            {!search && (
              <Link href="/dashboard/patients/new" className="text-sm text-blue-600 font-medium">
                Créer le premier patient
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p, i) => (
              <Link key={p.id} href={`/dashboard/patients/${p.id}`}
                className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${COLORS[i % COLORS.length]}`}>
                  {p.prenom?.[0]}{p.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{p.nom} {p.prenom}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : 'DDN non renseignée'}
                    {p.telephone ? ` · ${p.telephone}` : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
