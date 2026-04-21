'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const nav = [
  { href: '/dashboard', label: 'Accueil', exact: true },
  { href: '/dashboard/patients', label: 'Patients' },
  { href: '/dashboard/bilans/new', label: 'Nouveau bilan' },
  { href: '/dashboard/factures/new', label: 'Nouvelle facture' },
  { href: '/dashboard/comptabilite', label: 'Comptabilité' },
  { href: '/dashboard/settings', label: 'Réglages' },
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f2ee', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', background: '#1a1410', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #2a2018' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', background: '#c8b89a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#1a1410', fontWeight: '500', flexShrink: 0 }}>P</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#f5f2ee', fontWeight: '400', letterSpacing: '0.01em' }}>PODian</div>
              <div style={{ fontSize: '10px', color: '#9b8f7e', marginTop: '1px' }}>Le Neué A.</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {nav.map(({ href, label, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href} style={{
                display: 'block', padding: '9px 12px', borderRadius: '10px', marginBottom: '2px',
                fontSize: '13px', textDecoration: 'none', fontWeight: active ? '500' : '400',
                background: active ? '#2a2018' : 'transparent',
                color: active ? '#c8b89a' : '#9b8f7e',
                transition: 'all 0.15s',
              }}>{label}</Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid #2a2018' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '9px 12px', borderRadius: '10px', border: 'none',
            background: 'transparent', color: '#9b8f7e', fontSize: '13px', cursor: 'pointer',
            textAlign: 'left', fontFamily: 'Inter, sans-serif',
          }}>Déconnexion</button>
        </div>
      </aside>

      {/* Contenu */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
