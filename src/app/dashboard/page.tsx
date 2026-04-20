'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, FileText, Receipt, ChevronRight, Plus } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({ patients: 0, bilans: 0, factures: 0 })
  const [recentPatients, setRecentPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const uid = session.user.id
      const [p, b, f, rp] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('praticien_id', uid),
        supabase.from('bilans').select('*', { count: 'exact', head: true }).eq('praticien_id', uid),
        supabase.from('factures').select('*', { count: 'exact', head: true }).eq('praticien_id', uid),
        supabase.from('patients').select('*').eq('praticien_id', uid).order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ patients: p.count ?? 0, bilans: b.count ?? 0, factures: f.count ?? 0 })
      setRecentPatients(rp.data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Chargement...</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-4">

      {/* Bonjour */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Bonjour, Arthur 👋</h1>
        <p className="text-sm text-slate-400 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/dashboard/bilans/new"
          className="bg-blue-600 text-white rounded-2xl p-4 flex flex-col gap-2">
          <FileText size={22} className="opacity-80" />
          <p className="font-semibold text-sm">Nouveau bilan</p>
          <p className="text-blue-200 text-xs">Générer + PDF</p>
        </Link>
        <Link href="/dashboard/factures/new"
          className="bg-emerald-600 text-white rounded-2xl p-4 flex flex-col gap-2">
          <Receipt size={22} className="opacity-80" />
          <p className="font-semibold text-sm">Nouvelle facture</p>
          <p className="text-emerald-200 text-xs">Facturer</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.patients}</p>
          <p className="text-xs text-slate-400 mt-0.5">Patients</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.bilans}</p>
          <p className="text-xs text-slate-400 mt-0.5">Bilans</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{stats.factures}</p>
          <p className="text-xs text-slate-400 mt-0.5">Factures</p>
        </div>
      </div>

      {/* Patients récents */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Patients récents</p>
          <Link href="/dashboard/patients" className="text-xs text-blue-600 font-medium">Voir tout</Link>
        </div>
        {recentPatients.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400 mb-3">Aucun patient</p>
            <Link href="/dashboard/patients/new"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium">
              <Plus size={14} /> Créer un patient
            </Link>
          </div>
        ) : recentPatients.map((p: any) => (
          <Link key={p.id} href={`/dashboard/patients/${p.id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 active:bg-slate-50">
            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
              {p.prenom?.[0]}{p.nom?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{p.nom} {p.prenom}</p>
            </div>
            <ChevronRight size={15} className="text-slate-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
