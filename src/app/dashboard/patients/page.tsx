'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Search } from 'lucide-react'

const COLORS = ['bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700']

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      setPatients(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="p-8 text-sm text-slate-400">Chargement...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Patients</h1>
          <p className="text-slate-500 text-sm mt-0.5">{patients.length} patient(s)</p>
        </div>
        <Link href="/dashboard/patients/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Nouveau patient
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {patients.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Search size={32} className="opacity-40" />
            <p className="text-sm">Aucun patient</p>
            <Link href="/dashboard/patients/new" className="text-sm text-blue-600 font-medium">Créer le premier patient</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p, i) => (
              <Link key={p.id} href={`/dashboard/patients/${p.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${COLORS[i % COLORS.length]}`}>
                  {p.prenom?.[0]}{p.nom?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{p.nom} {p.prenom}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : 'DDN non renseignée'}
                    {p.telephone ? ` · ${p.telephone}` : ''}
                  </p>
                </div>
                {p.mutuelle && <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{p.mutuelle}</span>}
                <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
