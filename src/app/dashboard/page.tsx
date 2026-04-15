import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, FileText, Receipt, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: nbPatients },
    { count: nbBilans },
    { count: nbFactures },
    { data: recentPatients },
    { data: recentBilans },
  ] = await Promise.all([
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('praticien_id', user?.id),
    supabase.from('bilans').select('*', { count: 'exact', head: true }).eq('praticien_id', user?.id),
    supabase.from('factures').select('*', { count: 'exact', head: true }).eq('praticien_id', user?.id),
    supabase.from('patients').select('*').eq('praticien_id', user?.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('bilans').select('*, patient:patients(nom, prenom)').eq('praticien_id', user?.id).order('created_at', { ascending: false }).limit(4),
  ])

  const stats = [
    { label: 'Patients', value: nbPatients ?? 0, icon: Users, href: '/dashboard/patients', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Bilans', value: nbBilans ?? 0, icon: FileText, href: '/dashboard/bilans/new', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Factures', value: nbFactures ?? 0, icon: Receipt, href: '/dashboard/factures/new', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">Bonjour, Arthur</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors group">
            <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-4`}>
              <Icon size={18} />
            </div>
            <p className="text-3xl font-semibold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Link href="/dashboard/bilans/new"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 transition-colors flex items-center justify-between">
          <div>
            <FileText size={22} className="mb-3 opacity-80" />
            <p className="font-medium text-lg">Nouveau bilan</p>
            <p className="text-blue-200 text-sm mt-0.5">Générer et archiver en PDF</p>
          </div>
          <ArrowRight size={20} className="opacity-60" />
        </Link>
        <Link href="/dashboard/factures/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-6 transition-colors flex items-center justify-between">
          <div>
            <Receipt size={22} className="mb-3 opacity-80" />
            <p className="font-medium text-lg">Nouvelle facture</p>
            <p className="text-emerald-200 text-sm mt-0.5">Facturer et archiver</p>
          </div>
          <ArrowRight size={20} className="opacity-60" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Patients récents</p>
            <Link href="/dashboard/patients" className="text-xs text-blue-600 hover:text-blue-800">Voir tout</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPatients?.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Aucun patient</p>
            ) : recentPatients?.map(p => (
              <Link key={p.id} href={`/dashboard/patients/${p.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                  {p.prenom[0]}{p.nom[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.nom} {p.prenom}</p>
                  <p className="text-xs text-slate-400">
                    {p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : 'DDN non renseignée'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="font-medium text-slate-800 text-sm">Bilans récents</p>
          </div>
          <div className="divide-y divide-slate-50">
            {recentBilans?.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">Aucun bilan</p>
            ) : recentBilans?.map((b: any) => (
              <div key={b.id} className="px-5 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {b.patient?.nom} {b.patient?.prenom}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(b.date_bilan).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
