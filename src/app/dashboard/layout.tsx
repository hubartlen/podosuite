'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, FileText, Receipt, LayoutDashboard, LogOut, Settings } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Accueil', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/patients', label: 'Patients', icon: Users },
  { href: '/dashboard/bilans/new', label: 'Bilan', icon: FileText },
  { href: '/dashboard/factures/new', label: 'Facture', icon: Receipt },
  { href: '/dashboard/settings', label: 'Réglages', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header mobile */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between md:hidden sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-slate-800 text-sm">PODian</span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">
          <LogOut size={18} />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-56 bg-white border-r border-slate-200 flex-col shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm leading-tight">PODian</p>
                <p className="text-xs text-slate-500">Le Neué A.</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5">
            {nav.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  <Icon size={15} />{label}
                </Link>
              )
            })}
          </nav>
          <div className="p-3 border-t border-slate-200">
            <button onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 w-full transition-colors">
              <LogOut size={15} /> Déconnexion
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Navigation bas mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10 safe-area-pb">
        <div className="flex">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center py-2.5 gap-1 text-xs transition-colors ${
                  active ? 'text-blue-600' : 'text-slate-400'
                }`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px]">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
