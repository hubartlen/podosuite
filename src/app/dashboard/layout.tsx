'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'

const svg = (d: React.ReactNode, taille = 18) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)
const IC = {
  tableau: svg(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  patients: svg(<><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0112 0v1M16 4a4 4 0 010 8M22 21v-1a5 5 0 00-4-4.9" /></>),
  agenda: svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>),
  bilans: svg(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>),
  recettes: svg(<><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>),
  journal: svg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 4v16" /></>),
  charges: svg(<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />),
  reglages: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.8 1.2V21a2 2 0 01-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.7 1.7 0 003.2 14H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.7 1.7 0 009 4.6V3a2 2 0 014 0v.1a1.7 1.7 0 002.8 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></>),
  recherche: svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, 16),
  plus: svg(<path d="M12 5v14M5 12h14" />, 18),
  fermer: svg(<path d="M6 6l12 12M18 6L6 18" />, 20),
  sortie: svg(<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />, 16),
  gauche: svg(<path d="M15 6l-6 6 6 6" />, 16),
  droite: svg(<path d="M9 6l6 6-6 6" />, 16),
  points: svg(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>, 22),
  facture: svg(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>, 16),
  patient: svg(<><circle cx="10" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0112 0v1M19 8v6M16 11h6" /></>, 16),
}

type Lien = { href: string; label: string; icon: React.ReactNode; exact?: boolean; badge?: boolean }
const NAV_CABINET: Lien[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: IC.tableau, exact: true },
  { href: '/dashboard/patients', label: 'Patients', icon: IC.patients },
  { href: '/dashboard/calendrier', label: 'Agenda', icon: IC.agenda },
  { href: '/dashboard/bilans', label: 'Bilans', icon: IC.bilans, badge: true },
  { href: '/dashboard/ordonnances', label: 'Ordonnances', icon: svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h6M9 15h6M12 8v6" /></>) },
]
const NAV_GESTION: Lien[] = [
  { href: '/dashboard/devis', label: 'Devis', icon: svg(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></>) },
  { href: '/dashboard/comptabilite', label: 'Recettes', icon: IC.recettes, exact: true },
  { href: '/dashboard/comptabilite/journal', label: 'Journal', icon: IC.journal },
  { href: '/dashboard/comptabilite/charges', label: 'Charges', icon: IC.charges },
]
const REGLAGES: Lien = { href: '/dashboard/settings', label: 'Réglages', icon: IC.reglages }
const CREER = [
  { href: '/dashboard/bilans/nouveau', label: 'Bilan podologique', touche: 'b', fond: '#dde8f6', texte: '#1d4a80', icon: svg(<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></>, 16) },
  { href: '/dashboard/ordonnances/nouvelle', label: 'Ordonnance', touche: 'o', fond: '#e9eaf2', texte: '#1c1f3f', icon: svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h6M9 15h6M12 8v6" /></>, 16) },
  { href: '/dashboard/factures/new', label: 'Facture', touche: 'f', fond: '#e3f1e7', texte: '#23633a', icon: IC.facture },
  { href: '/dashboard/devis/nouveau', label: 'Devis', touche: 'd', fond: '#fdebd6', texte: '#9a4a0b', icon: IC.facture },
  { href: '/dashboard/patients/new', label: 'Patient', touche: 'p', fond: '#efe4f4', texte: '#6a3f7c', icon: IC.patient },
  { href: '/dashboard/comptabilite/charges', label: 'Charge', touche: 'c', fond: '#fbe3d8', texte: '#9a3b16', icon: svg(<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />, 16) },
]

const CSS = `
.nvg-barre{width:240px;background:var(--dark);color:var(--on-dark);display:flex;flex-direction:column;gap:12px;padding:18px 14px;box-sizing:border-box;position:sticky;top:0;height:100vh;flex-shrink:0;z-index:40;font-family:Inter,sans-serif}
.nvg-replie{width:72px;align-items:center}
.nvg-barre *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.nvg-tete{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:34px;width:100%}
.nvg-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}
.nvg-replie .nvg-logo{margin:0 auto}
.nvg-p{width:34px;height:34px;border-radius:6px;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:17px;flex-shrink:0}
.nvg-nom{font-family:var(--font-display);font-size:20px}
.nvg-plier{width:30px;height:30px;border-radius:8px;border:none;background:rgba(255,255,255,.07);color:inherit;opacity:.7;cursor:pointer;display:flex;align-items:center;justify-content:center}
.nvg-plier:hover{opacity:1}
.nvg-zone{position:relative;width:100%}
.nvg-nouveau{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:42px;font:inherit;font-size:14px;font-weight:600;color:var(--accent-fg);background:var(--accent);border:none;border-radius:6px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.nvg-replie .nvg-nouveau{width:44px;height:44px;margin:0 auto}
.nvg-voile{position:fixed;inset:0;z-index:55}
.nvg-menu{position:absolute;left:calc(100% + 14px);top:0;width:272px;background:var(--surface);color:var(--fg);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.25);padding:8px;display:flex;flex-direction:column;gap:2px;z-index:60}
.nvg-mi{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;color:var(--fg);text-decoration:none;font-size:14px}
.nvg-mi:hover,.nvg-mi:focus-visible{background:var(--surface-2);outline:none}
.nvg-mi-ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.nvg-mi kbd{margin-left:auto;font:inherit;font-size:11.5px;color:var(--fg-3);text-transform:uppercase}
.nvg-menu-bas{border-top:1px solid var(--line-2);margin:4px 6px 0;padding:10px 6px 4px;font-size:12.5px;color:var(--fg-3);text-decoration:none}
.nvg-menu-bas:hover{color:var(--fg)}
.nvg-recherche{display:flex;align-items:center;gap:10px;width:100%;font:inherit;font-size:13px;color:inherit;opacity:.8;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:9px 12px;cursor:pointer;text-align:left}
.nvg-recherche:hover{opacity:1}
.nvg-recherche span{flex:1}
.nvg-recherche kbd{font:inherit;font-size:11px;border:1px solid rgba(255,255,255,.22);border-radius:5px;padding:1px 5px}
.nvg-replie .nvg-recherche{width:44px;height:44px;justify-content:center;padding:0;margin:0 auto}
.nvg-nav{display:flex;flex-direction:column;gap:2px;width:100%}
.nvg-groupe{font-size:11.5px;opacity:.5;padding:10px 12px 4px}
.nvg-sep{width:28px;height:1px;background:rgba(255,255,255,.14);margin:8px auto}
.nvg-lien{position:relative;display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:6px;color:inherit;opacity:.72;text-decoration:none;font:inherit;font-size:14px;background:none;border:none;cursor:pointer;width:100%;box-sizing:border-box;text-align:left}
.nvg-lien:hover{background:rgba(255,255,255,.07);opacity:1}
.nvg-on{background:rgba(255,255,255,.11);opacity:1;box-shadow:inset 3px 0 0 var(--accent);font-weight:500}
.nvg-replie .nvg-lien{width:44px;height:44px;padding:0;justify-content:center;margin:0 auto}
.nvg-replie .nvg-lien:hover::after{content:attr(data-tip);position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);background:var(--dark);color:var(--on-dark);font-size:13px;font-weight:500;padding:6px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.25);z-index:70;opacity:1}
.nvg-texte{flex:1}
.nvg-badge{font-size:11.5px;font-weight:700;background:var(--accent);color:var(--accent-fg);border-radius:6px;padding:1px 8px}
.nvg-point{position:absolute;top:8px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.nvg-pied{margin-top:auto;display:flex;flex-direction:column;gap:6px;width:100%}
.nvg-profil{display:flex;align-items:center;gap:10px;padding:12px 6px 2px;border-top:1px solid rgba(255,255,255,.1)}
.nvg-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
.nvg-qui{flex:1;display:flex;flex-direction:column;min-width:0}
.nvg-qui b{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nvg-qui small{font-size:11.5px;opacity:.55}
.nvg-sortie{border:none;background:none;color:inherit;opacity:.55;cursor:pointer;padding:6px}
.nvg-sortie:hover{opacity:1}
.nvg-rvoile{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;justify-content:center;align-items:flex-start;padding:12vh 16px 16px;font-family:Inter,sans-serif}
.nvg-rboite{width:560px;max-width:100%;background:var(--surface);border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden}
.nvg-rchamp{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line);color:var(--fg-3)}
.nvg-rchamp input{flex:1;border:none!important;outline:none!important;box-shadow:none!important;font:inherit;font-size:17px;background:transparent;color:var(--fg)}
.nvg-res{display:flex;justify-content:space-between;gap:10px;padding:12px 18px;color:var(--fg);text-decoration:none;font-size:14.5px}
.nvg-res[data-sel=true]{background:var(--surface-2)}
.nvg-res small{color:var(--fg-3)}
.nvg-rvide{padding:18px;color:var(--fg-3);font-size:14px;margin:0}
.nvg-mtete{height:56px;background:var(--dark);color:var(--on-dark);display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 16px;position:sticky;top:0;z-index:40;flex-shrink:0;font-family:Inter,sans-serif}
.nvg-mbouton{width:44px;height:44px;border:none;background:none;color:inherit;display:flex;align-items:center;justify-content:center;cursor:pointer}
.nvg-mbas{position:fixed;left:0;right:0;bottom:0;background:var(--dark);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));align-items:center;padding:6px 4px max(10px, env(safe-area-inset-bottom));z-index:45;font-family:Inter,sans-serif}
.nvg-mb{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--on-dark);opacity:.6;text-decoration:none;font:inherit;font-size:10.5px;background:none;border:none;padding:6px 0;cursor:pointer}
.nvg-mb[aria-current=page]{opacity:1;color:var(--accent);font-weight:600}
.nvg-mplus{justify-self:center;width:52px;height:52px;border-radius:8px;border:none;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;margin-top:-20px;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer}
.nvg-sheet-voile{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:43}
.nvg-sheet{position:fixed;left:0;right:0;bottom:66px;background:var(--surface);color:var(--fg);border-radius:6px 6px 0 0;padding:12px 16px 18px;z-index:44;font-family:Inter,sans-serif;max-height:70vh;overflow:auto}
.nvg-sheet h2{font-family:var(--font-display);font-weight:400;font-size:22px;margin:4px 4px 4px}
.nvg-poignee{width:40px;height:5px;border-radius:5px;background:var(--line);margin:0 auto 6px}
.nvg-op{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:8px;background:var(--surface-2);color:var(--fg);text-decoration:none;font:inherit;font-size:16px;font-weight:500;border:none;width:100%;margin-top:8px;cursor:pointer;text-align:left;box-sizing:border-box}
.nvg-op-ic{width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--surface-3);color:var(--fg-2)}
`

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)
  const [replie, setReplie] = useState(false)
  const [menu, setMenu] = useState(false)
  const [plus, setPlus] = useState(false)
  const [recherche, setRecherche] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [patients, setPatients] = useState<any[]>([])
  const [uid, setUid] = useState('')
  const [prat, setPrat] = useState<any>(null)
  const [nbBilans, setNbBilans] = useState(0)
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    try {
      const t = localStorage.getItem('podian-theme'); if (t) document.documentElement.dataset.theme = t
      setReplie(localStorage.getItem('podian-nav-repliee') === '1')
    } catch {}
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUid(session.user.id)
      const { data: p } = await supabase.from('praticiens').select('prenom, nom, theme').eq('id', session.user.id).single()
      if (p?.theme) {
        document.documentElement.dataset.theme = p.theme
        try { localStorage.setItem('podian-theme', p.theme) } catch {}
      }
      setPrat(p)
    })()
  }, [])

  useEffect(() => {
    setMenu(false); setPlus(false); setRecherche(false)
    if (!uid) return
    ;(async () => {
      const { data } = await createClient().from('bilans').select('id, donnees').eq('praticien_id', uid).eq('format', 2)
      setNbBilans((data || []).filter((x: any) => !String(x.donnees?.synthese || '').trim()).length)
    })()
  }, [pathname, uid])

  const ouvrirRecherche = async () => {
    setRecherche(true); setQ(''); setSel(0); setMenu(false); setPlus(false)
    setTimeout(() => champ.current?.focus(), 30)
    if (!patients.length && uid) {
      const { data } = await createClient().from('patients').select('id, nom, prenom, date_naissance').eq('praticien_id', uid).order('nom').range(0, 4999)
      setPatients(data || [])
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrirRecherche(); return }
      if (e.key === 'Escape') { setMenu(false); setPlus(false); setRecherche(false); return }
      if (menu && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const c = CREER.find(x => x.touche === e.key.toLowerCase())
        if (c) { e.preventDefault(); router.push(c.href) }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const basculer = () => {
    const n = !replie
    setReplie(n)
    try { localStorage.setItem('podian-nav-repliee', n ? '1' : '0') } catch {}
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  const estActif = (l: Lien) => (l.exact ? pathname === l.href : pathname.startsWith(l.href))
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const cherche = norm(q.trim())
  const resultats = cherche
    ? patients.filter(p => norm((p.nom || '') + ' ' + (p.prenom || '')).includes(cherche) || norm((p.prenom || '') + ' ' + (p.nom || '')).includes(cherche)).slice(0, 8)
    : []
  const nomComplet = [prat?.prenom, prat?.nom].filter(Boolean).join(' ')
  const initiales = ((prat?.prenom || ' ')[0] + (prat?.nom || ' ')[0]).toUpperCase().trim()

  const lien = (l: Lien) => {
    const actif = estActif(l)
    return (
      <Link key={l.href} href={l.href} className={'nvg-lien' + (actif ? ' nvg-on' : '')} data-tip={l.label}
        aria-label={replie ? l.label : undefined} aria-current={actif ? 'page' : undefined}>
        {l.icon}
        {!replie && <span className="nvg-texte">{l.label}</span>}
        {l.badge && nbBilans > 0 && (replie ? <span className="nvg-point" /> : <span className="nvg-badge">{nbBilans}</span>)}
      </Link>
    )
  }

  const modaleRecherche = recherche && (
    <div className="nvg-rvoile" onClick={() => setRecherche(false)}>
      <div className="nvg-rboite" role="dialog" aria-label="Rechercher un patient" onClick={e => e.stopPropagation()}>
        <div className="nvg-rchamp">
          {IC.recherche}
          <input ref={champ} value={q} placeholder="Nom ou prénom du patient…" aria-label="Nom ou prénom du patient"
            onChange={e => { setQ(e.target.value); setSel(0) }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, Math.max(0, resultats.length - 1))) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
              if (e.key === 'Enter' && resultats[sel]) router.push('/dashboard/patients/' + resultats[sel].id)
            }} />
        </div>
        {cherche && resultats.length === 0 && <p className="nvg-rvide">{patients.length ? 'Aucun patient trouvé.' : 'Chargement…'}</p>}
        {!cherche && <p className="nvg-rvide">Tape quelques lettres, puis Entrée pour ouvrir le dossier.</p>}
        {resultats.map((p, i) => (
          <Link key={p.id} href={'/dashboard/patients/' + p.id} className="nvg-res" data-sel={i === sel} onMouseEnter={() => setSel(i)}>
            <span>{p.nom} {p.prenom}</span>
            <small>{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : ''}</small>
          </Link>
        ))}
      </div>
    </div>
  )

  if (isMobile) {
    const actifM = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <style>{CSS}</style>
        <header className="nvg-mtete">
          <Link href="/dashboard" className="nvg-logo"><span className="nvg-p" style={{ width: 30, height: 30, fontSize: 15 }}>P</span><span className="nvg-nom" style={{ fontSize: 19 }}>PODian</span></Link>
          <button className="nvg-mbouton" onClick={ouvrirRecherche} aria-label="Rechercher un patient">{svg(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>, 20)}</button>
        </header>
        <main style={{ flex: 1, overflow: 'auto', paddingBottom: 84 }}>{children}</main>

        {(menu || plus) && <div className="nvg-sheet-voile" onClick={() => { setMenu(false); setPlus(false) }} />}
        {menu && (
          <div className="nvg-sheet" role="dialog" aria-label="Créer">
            <div className="nvg-poignee" />
            <h2>Créer</h2>
            {CREER.map(c => (
              <Link key={c.href} href={c.href} className="nvg-op"><span className="nvg-op-ic" style={{ background: c.fond, color: c.texte }}>{c.icon}</span>{c.label === 'Charge' ? 'Charge, depuis une photo' : c.label}</Link>
            ))}
          </div>
        )}
        {plus && (
          <div className="nvg-sheet" role="dialog" aria-label="Plus">
            <div className="nvg-poignee" />
            <h2>Plus</h2>
            {[{ href: '/dashboard/calendrier', label: 'Agenda', icon: IC.agenda }, { href: '/dashboard/bilans', label: 'Bilans', icon: IC.bilans }, { href: '/dashboard/devis', label: 'Devis', icon: IC.facture }, { href: '/dashboard/ordonnances', label: 'Ordonnances', icon: IC.facture },
              { href: '/dashboard/comptabilite/journal', label: 'Journal', icon: IC.journal }, { href: '/dashboard/comptabilite/charges', label: 'Charges', icon: IC.charges },
              REGLAGES].map(l => (
              <Link key={l.href} href={l.href} className="nvg-op"><span className="nvg-op-ic">{l.icon}</span>{l.label}</Link>
            ))}
            <button className="nvg-op" onClick={handleLogout}><span className="nvg-op-ic">{IC.sortie}</span>Se déconnecter</button>
          </div>
        )}

        <nav className="nvg-mbas" aria-label="Navigation">
          <Link href="/dashboard" className="nvg-mb" aria-current={actifM('/dashboard', true) ? 'page' : undefined}>{svg(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>, 22)}Accueil</Link>
          <Link href="/dashboard/patients" className="nvg-mb" aria-current={actifM('/dashboard/patients') ? 'page' : undefined}>{svg(<><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0112 0v1" /></>, 22)}Patients</Link>
          <button className="nvg-mplus" aria-label={menu ? 'Fermer le menu Créer' : 'Créer'} aria-expanded={menu} onClick={() => { setPlus(false); setMenu(m => !m) }}>{menu ? IC.fermer : svg(<path d="M12 5v14M5 12h14" />, 24)}</button>
          <Link href="/dashboard/comptabilite" className="nvg-mb" aria-current={actifM('/dashboard/comptabilite') ? 'page' : undefined}>{svg(<><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>, 22)}Compta</Link>
          <button className="nvg-mb" aria-expanded={plus} onClick={() => { setMenu(false); setPlus(p => !p) }}>{IC.points}Plus</button>
        </nav>
        {modaleRecherche}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{CSS}</style>
      <aside className={'nvg-barre' + (replie ? ' nvg-replie' : '')}>
        <div className="nvg-tete">
          <Link href="/dashboard" className="nvg-logo" aria-label="PODian, tableau de bord"><span className="nvg-p">P</span>{!replie && <span className="nvg-nom">PODian</span>}</Link>
          {!replie && <button className="nvg-plier" onClick={basculer} aria-label="Replier la barre" title="Replier la barre">{IC.gauche}</button>}
        </div>

        <div className="nvg-zone">
          <button className="nvg-nouveau" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="Nouveau">{IC.plus}{!replie && 'Nouveau'}</button>
          {menu && (
            <>
              <div className="nvg-voile" onClick={() => setMenu(false)} />
              <div className="nvg-menu" role="menu">
                {CREER.map(c => (
                  <Link key={c.href} href={c.href} className="nvg-mi" role="menuitem">
                    <span className="nvg-mi-ic" style={{ background: c.fond, color: c.texte }}>{c.icon}</span>
                    <span>{c.label}</span><kbd>{c.touche}</kbd>
                  </Link>
                ))}
                <Link href="/dashboard/comptabilite" className="nvg-menu-bas" role="menuitem">Importer la journée Doctolib</Link>
              </div>
            </>
          )}
        </div>

        <button className="nvg-recherche" onClick={ouvrirRecherche} aria-label="Rechercher un patient" title="Rechercher un patient (⌘K)">
          {IC.recherche}{!replie && <><span>Rechercher un patient</span><kbd>⌘K</kbd></>}
        </button>

        <nav className="nvg-nav" aria-label="Navigation principale">
          {!replie && <div className="nvg-groupe">Au cabinet</div>}
          {NAV_CABINET.map(lien)}
          {replie ? <div className="nvg-sep" /> : <div className="nvg-groupe">Gestion</div>}
          {NAV_GESTION.map(lien)}
        </nav>

        <div className="nvg-pied">
          {lien(REGLAGES)}
          {replie ? (
            <>
              <button className="nvg-lien" data-tip="Déplier la barre" aria-label="Déplier la barre" onClick={basculer}>{IC.droite}</button>
              <button className="nvg-lien" data-tip="Se déconnecter" aria-label="Se déconnecter" onClick={handleLogout}>{IC.sortie}</button>
            </>
          ) : (
            <div className="nvg-profil">
              <span className="nvg-avatar">{initiales || 'P'}</span>
              <span className="nvg-qui"><b>{nomComplet || 'Mon compte'}</b><small>Pédicure-podologue</small></span>
              <button className="nvg-sortie" onClick={handleLogout} aria-label="Se déconnecter" title="Se déconnecter">{IC.sortie}</button>
            </div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </main>
      {modaleRecherche}
    </div>
  )
}
