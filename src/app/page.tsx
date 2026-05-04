'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#1a1410', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .fade1 { animation: fadeUp 0.6s ease forwards; }
        .fade2 { animation: fadeUp 0.6s ease 0.15s forwards; opacity:0; }
        .fade3 { animation: fadeUp 0.6s ease 0.3s forwards; opacity:0; }
        .fade4 { animation: fadeUp 0.6s ease 0.45s forwards; opacity:0; }
        .btn-primary:hover { background: #b8a485 !important; }
        .btn-secondary:hover { background: rgba(200,184,154,0.1) !important; }
        .feature-card:hover { border-color: rgba(200,184,154,0.3) !important; transform: translateY(-2px); }
        .feature-card { transition: all 0.2s ease; }
      `}</style>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 40px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'#f5f2ee', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <span style={{ fontFamily:'Playfair Display, serif', fontSize:20, color:'#1a1410', fontWeight:400 }}>P</span>
            <div style={{ position:'absolute', top:-4, right:-4, width:10, height:10, borderRadius:'50%', background:'#c8b89a' }}/>
          </div>
          <span style={{ fontFamily:'Playfair Display, serif', fontSize:20, color:'#f5f2ee', fontWeight:400, letterSpacing:'-0.01em' }}>PODian</span>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <Link href="/auth/login" className="btn-secondary" style={{ padding:'9px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', color:'#f5f2ee', textDecoration:'none', fontSize:13, fontWeight:500 }}>
            Se connecter
          </Link>
          <Link href="/auth/register" className="btn-primary" style={{ padding:'9px 18px', borderRadius:10, background:'#c8b89a', color:'#1a1410', textDecoration:'none', fontSize:13, fontWeight:500 }}>
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center', padding:'100px 24px 80px' }}>
        <div className="fade1" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(200,184,154,0.1)', border:'1px solid rgba(200,184,154,0.2)', borderRadius:999, padding:'6px 16px', marginBottom:32 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#c8b89a' }}/>
          <span style={{ fontSize:12, color:'#c8b89a', fontWeight:500, letterSpacing:'0.05em' }}>GESTION DE CABINET PODOLOGIQUE</span>
        </div>
        <h1 className="fade2" style={{ fontFamily:'Playfair Display, serif', fontSize:'clamp(40px, 6vw, 68px)', fontWeight:400, color:'#f5f2ee', lineHeight:1.1, letterSpacing:'-0.02em', margin:'0 0 24px' }}>
          Votre cabinet,<br/>
          <span style={{ color:'#c8b89a', fontStyle:'italic' }}>enfin organisé.</span>
        </h1>
        <p className="fade3" style={{ fontSize:18, color:'#9b8f7e', lineHeight:1.6, margin:'0 0 48px', maxWidth:520, marginLeft:'auto', marginRight:'auto' }}>
          Bilans podologiques, facturation, patients, calendrier — tout en un. Conçu par un podologue, pour les podologues.
        </p>
        <div className="fade4" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/auth/register" className="btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12, background:'#c8b89a', color:'#1a1410', textDecoration:'none', fontSize:15, fontWeight:600 }}>
            Commencer gratuitement →
          </Link>
          <Link href="/auth/login" className="btn-secondary" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', color:'#f5f2ee', textDecoration:'none', fontSize:15, fontWeight:500 }}>
            J'ai déjà un compte
          </Link>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'0 24px 80px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          {[
            { icon:'📋', title:'Bilans podologiques', desc:'Formulaire complet avec export PDF professionnel. Envoi direct par email au patient.' },
            { icon:'🧾', title:'Facturation', desc:'Créez et envoyez vos factures en quelques secondes. Export comptabilité CSV/PDF.' },
            { icon:'👥', title:'Gestion des patients', desc:'Fiche patient complète, historique bilans et factures, import depuis Doctolib.' },
            { icon:'📅', title:'Calendrier', desc:'Import automatique depuis Doctolib. Vue semaine et mois, gestion des RDV.' },
            { icon:'📊', title:'Comptabilité', desc:'Tableau de bord financier, rétrocession automatique, statistiques mensuelles.' },
            { icon:'📱', title:'Application mobile', desc:'Installable sur iPhone et Android. Interface optimisée pour travailler partout.' },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24 }}>
              <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontFamily:'Playfair Display, serif', fontSize:18, fontWeight:400, color:'#f5f2ee', margin:'0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize:14, color:'#9b8f7e', lineHeight:1.6, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'60px 24px', textAlign:'center' }}>
        <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:36, fontWeight:400, color:'#f5f2ee', margin:'0 0 12px', letterSpacing:'-0.01em' }}>
          Prêt à simplifier votre cabinet ?
        </h2>
        <p style={{ fontSize:15, color:'#9b8f7e', margin:'0 0 32px' }}>Gratuit · Sans engagement · Données sécurisées</p>
        <Link href="/auth/register" className="btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', borderRadius:12, background:'#c8b89a', color:'#1a1410', textDecoration:'none', fontSize:15, fontWeight:600 }}>
          Créer mon compte gratuitement →
        </Link>
      </div>

      {/* Footer */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'24px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <span style={{ fontFamily:'Playfair Display, serif', fontSize:16, color:'#4a3f35' }}>PODian</span>
        <span style={{ fontSize:12, color:'#4a3f35' }}>Conçu par Arthur Le Neué — Pédicure Podologue DE</span>
      </div>
    </div>
  )
}
