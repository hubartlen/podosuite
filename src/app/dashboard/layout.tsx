'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href:'/dashboard', label:'Accueil', exact:true, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href:'/dashboard/patients', label:'Patients', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { href:'/dashboard/bilans/new', label:'Nouveau bilan', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg> },
  { href:'/dashboard/factures/new', label:'Nouvelle facture', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
  { href:'/dashboard/calendrier', label:'Calendrier', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { href:'/dashboard/comptabilite', label:'Comptabilité', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { href:'/dashboard/settings', label:'Réglages', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
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
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <aside style={{
        width:64, background:'var(--dark)', borderRight:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'16px 0', gap:6, position:'sticky', top:0, height:'100vh', flexShrink:0
      }}>
        <div style={{ width:38, height:38, borderRadius:11, background:'var(--accent)', color:'var(--dark)', display:'grid', placeItems:'center', fontWeight:700, fontSize:16, marginBottom:14, fontFamily:'var(--font-display)' }}>P</div>

        {NAV.map(({ href, label, icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div style={{
                position:'relative', width:40, height:40, borderRadius:10,
                display:'grid', placeItems:'center',
                background: active ? 'rgba(200,184,154,0.15)' : 'transparent',
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                transition:'background .12s, color .12s',
              }}
                onMouseEnter={e => {
                  const tip = e.currentTarget.querySelector('.tip') as HTMLElement
                  if (tip) tip.style.opacity = '1'
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'
                }}
                onMouseLeave={e => {
                  const tip = e.currentTarget.querySelector('.tip') as HTMLElement
                  if (tip) tip.style.opacity = '0'
                  if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'
                }}>
                {icon}
                <span className="tip" style={{
                  position:'absolute', left:'calc(100% + 12px)', top:'50%', transform:'translateY(-50%)',
                  background:'var(--dark)', color:'var(--accent)', fontSize:12, fontWeight:500,
                  padding:'5px 10px', borderRadius:8, whiteSpace:'nowrap',
                  border:'1px solid rgba(200,184,154,0.2)',
                  opacity:0, pointerEvents:'none', transition:'opacity .12s', zIndex:100
                }}>{label}</span>
              </div>
            </Link>
          )
        })}

        <div style={{ flex:1 }} />

        <button onClick={handleLogout} style={{
          width:40, height:40, borderRadius:10, display:'grid', placeItems:'center',
          color:'rgba(255,255,255,0.3)', background:'transparent', border:'none', cursor:'pointer', marginBottom:8,
          transition:'color .12s',
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </aside>

      <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', minWidth:0 }}>
        {children}
      </main>
    </div>
  )
}
