'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const uid = session.user.id
      const now = new Date()
      const som = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
      const last7 = Array.from({length:7},(_,i) => { const d=new Date(now); d.setDate(d.getDate()-(6-i)); return d })

      const [
        { count: totalPat },
        { count: newPat },
        { data: factMois },
        { data: factSem },
        { data: bilansMois },
        { data: recents },
        { data: prat },
      ] = await Promise.all([
        supabase.from('patients').select('*',{count:'exact',head:true}).eq('praticien_id',uid),
        supabase.from('patients').select('*',{count:'exact',head:true}).eq('praticien_id',uid).gte('created_at',som),
        supabase.from('factures').select('total,statut').eq('praticien_id',uid).gte('date_facture',som),
        supabase.from('factures').select('total,date_facture').eq('praticien_id',uid).gte('date_facture',last7[0].toISOString().slice(0,10)),
        supabase.from('bilans').select('id').eq('praticien_id',uid).gte('date_bilan',som),
        supabase.from('patients').select('id,nom,prenom').eq('praticien_id',uid).order('created_at',{ascending:false}).limit(5),
        supabase.from('praticiens').select('prenom,retrocession').eq('id',uid).single(),
      ])

      const bars = last7.map(d => ({
        label: ['D','L','M','M','J','V','S'][d.getDay()],
        total: Math.round((factSem||[]).filter((f:any)=>f.date_facture===d.toISOString().slice(0,10)).reduce((s:number,f:any)=>s+(f.total||0),0))
      }))
      const totalMois = Math.round((factMois||[]).filter((f:any)=>f.statut!=='annulee').reduce((s:number,f:any)=>s+(f.total||0),0))
      const retro = prat?.retrocession || 60

      setData({ prenom: prat?.prenom||'Arthur', totalPat, newPat, totalMois, nbFact:(factMois||[]).length, nbBilans:(bilansMois||[]).length, bars, retro, recents:recents||[] })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <div style={{width:'28px',height:'28px',border:'2px solid var(--line)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const maxBar = Math.max(...data.bars.map((b:any)=>b.total), 1)
  const totalSem = data.bars.reduce((s:number,b:any)=>s+b.total, 0)

  const S: React.CSSProperties = { fontFamily:'Inter,-apple-system,sans-serif' }

  return (
    <div style={{...S, padding:'32px 36px', background:'var(--bg)', minHeight:'100vh', overflowY:'auto'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:28}}>
        <div>
          <p style={{fontSize:11,fontWeight:500,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--fg-3)',marginBottom:6}}>{today}</p>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:400,fontSize:36,letterSpacing:'-0.015em',color:'var(--fg)',margin:0}}>Bonjour, {data.prenom}</h1>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/dashboard/patients/import" style={{display:'inline-flex',alignItems:'center',gap:6,height:36,padding:'0 14px',borderRadius:10,background:'var(--surface)',border:'1px solid var(--line)',fontSize:13,fontWeight:500,color:'var(--fg)',textDecoration:'none'}}>
            ↑ Import Doctolib
          </Link>
          <Link href="/dashboard/bilans/new" style={{display:'inline-flex',alignItems:'center',gap:6,height:36,padding:'0 14px',borderRadius:10,background:'var(--accent)',border:'none',fontSize:13,fontWeight:500,color:'white',textDecoration:'none'}}>
            + Nouveau bilan
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          { label:'Patients total', value:data.totalPat, sub:`+${data.newPat} ce mois` },
          { label:'Facturé ce mois', value:`${data.totalMois} €`, sub:`${data.nbFact} factures` },
          { label:`Ma part (${data.retro}%)`, value:`${Math.round(data.totalMois*data.retro/100)} €`, sub:'après rétrocession' },
          { label:'Bilans ce mois', value:data.nbBilans, sub:'rédigés' },
        ].map((k,i) => (
          <div key={i} style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,padding:'18px 20px',display:'flex',flexDirection:'column',gap:8,boxShadow:'var(--shadow-1)'}}>
            <span style={{fontSize:11,fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--fg-3)'}}>{k.label}</span>
            <span style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:400,letterSpacing:'-0.01em',color:'var(--accent)'}}>{k.value}</span>
            <span style={{fontSize:12,color:'var(--fg-3)'}}>{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Raccourcis */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          { href:'/dashboard/bilans/new',     label:'Nouveau bilan',    sub:'Générer en PDF' },
          { href:'/dashboard/factures/new',   label:'Nouvelle facture', sub:'Facturer un patient' },
          { href:'/dashboard/patients/import',label:'Import Doctolib',  sub:'Planning du jour' },
          { href:'/dashboard/patients/new',   label:'Nouveau patient',  sub:'Créer une fiche' },
        ].map((s,i) => (
          <Link key={i} href={s.href} style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,padding:14,display:'flex',alignItems:'center',gap:12,textDecoration:'none',boxShadow:'var(--shadow-1)'}}>
            <div style={{width:40,height:40,borderRadius:10,background:'var(--accent-soft)',color:'var(--accent)',display:'grid',placeItems:'center',flexShrink:0,fontSize:18,fontWeight:600}}>→</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--fg)'}}>{s.label}</div>
              <div style={{fontSize:12,color:'var(--fg-3)',marginTop:2}}>{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Grille principale */}
      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:14}}>

        {/* Facturation 7j */}
        <div style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-1)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--line-2)'}}>
            <h3 style={{fontSize:12,fontWeight:600,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--fg-3)',margin:0}}>Facturation · 7 derniers jours</h3>
            <span style={{fontSize:14,fontWeight:600,color:'var(--fg)'}}>{totalSem} €</span>
          </div>
          <div style={{padding:18,display:'flex',flexDirection:'column',gap:10}}>
            {data.bars.map((b:any,i:number) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{width:16,fontSize:12,color:'var(--fg-3)',fontWeight:500}}>{b.label}</span>
                <div style={{flex:1,height:8,background:'var(--surface-3)',borderRadius:999,overflow:'hidden'}}>
                  <div style={{width:`${b.total/maxBar*100}%`,height:'100%',background:'var(--accent)',borderRadius:999,transition:'width .3s'}}/>
                </div>
                <span style={{width:52,textAlign:'right',fontSize:12,fontWeight:b.total?600:400,color:b.total?'var(--fg)':'var(--fg-4)'}}>{b.total} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Patients récents */}
        <div style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:16,overflow:'hidden',boxShadow:'var(--shadow-1)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid var(--line-2)'}}>
            <h3 style={{fontSize:12,fontWeight:600,letterSpacing:'.04em',textTransform:'uppercase',color:'var(--fg-3)',margin:0}}>Patients récents</h3>
            <Link href="/dashboard/patients" style={{fontSize:12,fontWeight:500,color:'var(--accent)',textDecoration:'none'}}>Voir tout →</Link>
          </div>
          {data.recents.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:'var(--fg-3)',fontSize:13}}>Aucun patient</div>
          ) : data.recents.map((p:any,i:number) => (
            <Link key={p.id} href={`/dashboard/patients/${p.id}`} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<data.recents.length-1?'1px solid var(--line-2)':'none',textDecoration:'none'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'var(--accent-soft)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,flexShrink:0}}>
                {p.prenom?.[0]}{p.nom?.[0]}
              </div>
              <span style={{flex:1,fontSize:13,fontWeight:500,color:'var(--fg)'}}>{p.nom} {p.prenom}</span>
              <span style={{color:'var(--fg-4)',fontSize:16}}>›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
