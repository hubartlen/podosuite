'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const nav = [
  { href: '/dashboard', label: 'Accueil', exact: true, icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  )},
  { href: '/dashboard/patients', label: 'Patients', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
  )},
  { href: '/dashboard/bilans/new', label: 'Bilan', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg>
  )},
  { href: '/dashboard/factures/new', label: 'Facture', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
  )},
  { href: '/dashboard/settings', label: 'Réglages', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
  )},
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
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#f5f2ee'}}>
      {/* Header mobile */}
      <header style={{background:'#1a1410',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',background:'#c8b89a',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display, serif',fontSize:'15px',color:'#1a1410',fontWeight:'500'}}>P</div>
          <span style={{fontFamily:'Playfair Display, serif',fontSize:'17px',color:'#f5f2ee',fontWeight:'400',letterSpacing:'0.01em'}}>PODian</span>
        </div>
        <button onClick={handleLogout} style={{background:'none',border:'none',cursor:'pointer',color:'#9b8f7e',padding:'4px'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </header>

      {/* Contenu */}
      <main style={{flex:1,overflow:'auto',paddingBottom:'80px'}}>
        {children}
      </main>

      {/* Navigation bas */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#1a1410',display:'flex',zIndex:10,borderTop:'1px solid #2a2018'}}>
        {nav.map(({ href, label, icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link key={href} href={href} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0 6px',gap:'4px',textDecoration:'none',color:active?'#c8b89a':'#4a3f35',transition:'color 0.15s'}}>
              {icon}
              <span style={{fontSize:'9px',letterSpacing:'0.04em',fontFamily:'Inter, sans-serif'}}>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
