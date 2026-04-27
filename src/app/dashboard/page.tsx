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
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfWeek = new Date(now.getTime() - 7*24*3600*1000).toISOString()
      const last7 = Array.from({length:7},(_,i) => { const d=new Date(now); d.setDate(d.getDate()-(6-i)); return d })

      const [
        { count: totalPatients },
        { count: newPatients },
        { data: factMois },
        { data: factSem },
        { data: bilans },
        { data: recentPats },
        { data: prat },
      ] = await Promise.all([
        supabase.from('patients').select('*',{count:'exact',head:true}).eq('praticien_id',uid),
        supabase.from('patients').select('*',{count:'exact',head:true}).eq('praticien_id',uid).gte('created_at',startOfMonth),
        supabase.from('factures').select('total,mode_paiement,actes,statut').eq('praticien_id',uid).gte('date_facture',startOfMonth.slice(0,10)),
        supabase.from('factures').select('total,date_facture').eq('praticien_id',uid).gte('date_facture',startOfWeek.slice(0,10)),
        supabase.from('bilans').select('id').eq('praticien_id',uid).gte('date_bilan',startOfMonth.slice(0,10)),
        supabase.from('patients').select('id,nom,prenom').eq('praticien_id',uid).order('created_at',{ascending:false}).limit(5),
        supabase.from('praticiens').select('prenom,retrocession').eq('id',uid).single(),
      ])

      const facParJour = last7.map(d => {
        const ds = d.toISOString().slice(0,10)
        return { label:['D','L','M','M','J','V','S'][d.getDay()], total:Math.round((factSem||[]).filter((f:any)=>f.date_facture===ds).reduce((s:number,f:any)=>s+(f.total||0),0)) }
      })
      const totalMois = Math.round((factMois||[]).filter((f:any)=>f.statut!=='annulee').reduce((s:number,f:any)=>s+(f.total||0),0))
      const retro = prat?.retrocession || 60

      setData({ prenom:prat?.prenom||'Arthur', totalPatients, newPatients, totalMois, nbFactMois:(factMois||[]).length, nbBilans:(bilans||[]).length, facParJour, retro, recentPats:recentPats||[] })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:'24px',height:'24px',border:'2px solid var(--line)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin .8s linear infinite'}}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const today = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const maxBar = Math.max(...data.facParJour.map((d:any)=>d.total),1)

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">{today}</div>
          <h1>Bonjour, {data.prenom}</h1>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link href="/dashboard/patients/import" className="btn">↑ Import Doctolib</Link>
          <Link href="/dashboard/bilans/new" className="btn primary">+ Nouveau bilan</Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:18}}>
        {[
          { label:'Patients total', value:data.totalPatients, sub:`+${data.newPatients} ce mois` },
          { label:'Facturé ce mois', value:`${data.totalMois} €`, sub:`${data.nbFactMois} factures` },
          { label:'Ma part nette', value:`${Math.round(data.totalMois*data.retro/100)} €`, sub:`${data.retro}% rétrocession` },
          { label:'Bilans ce mois', value:data.nbBilans, sub:'rédigés' },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <span className="label">{k.label}</span>
            <span className="value">{k.value}</span>
            <span className="sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Raccourcis */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:18}}>
        {[
          { href:'/dashboard/bilans/new',    label:'Nouveau bilan',    sub:'Générer en PDF' },
          { href:'/dashboard/factures/new',  label:'Nouvelle facture', sub:'Facturer un patient' },
          { href:'/dashboard/patients/import',label:'Import Doctolib', sub:'Planning du jour' },
          { href:'/dashboard/patients/new',  label:'Nouveau patient',  sub:'Créer une fiche' },
        ].map((s,i) => (
          <Link key={i} href={s.href} className="card" style={{padding:14,display:'flex',alignItems:'center',gap:12,textDecoration:'none'}}>
            <div style={{width:40,height:40,borderRadius:10,background:'var(--accent-soft)',color:'var(--accent)',display:'grid',placeItems:'center',flexShrink:0,fontSize:20,fontWeight:600}}>→</div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--fg)'}}>{s.label}</div>
              <div style={{fontSize:12,color:'var(--fg-3)',marginTop:2}}>{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Grille */}
      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:14}}>
        <div className="card">
          <div className="card-header">
            <h3>Facturation · 7 derniers jours</h3>
            <span style={{fontSize:14,fontWeight:600}}>{data.facParJour.reduce((s:number,d:any)=>s+d.total,0)} €</span>
          </div>
          <div className="card-body">
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {data.facParJour.map((d:any,i:number) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{width:20,fontSize:12,color:'var(--fg-3)'}}>{d.label}</span>
                  <div style={{flex:1,height:8,background:'var(--surface-3)',borderRadius:999,overflow:'hidden'}}>
                    <div style={{width:`${d.total/maxBar*100}%`,height:'100%',background:'var(--accent)',borderRadius:999}}/>
                  </div>
                  <span style={{width:52,textAlign:'right',fontSize:12,fontWeight:d.total>0?600:400,color:d.total>0?'var(--fg)':'var(--fg-4)'}}>{d.total} €</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Patients récents</h3>
            <Link href="/dashboard/patients" className="btn ghost sm">Voir tout →</Link>
          </div>
          <div style={{padding:0}}>
            {data.recentPats.length === 0 ? (
              <div style={{padding:'24px',textAlign:'center',color:'var(--fg-3)',fontSize:13}}>Aucun patient</div>
            ) : data.recentPats.map((p:any,i:number) => (
              <Link key={p.id} href={`/dashboard/patients/${p.id}`}
                style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<data.recentPats.length-1?'1px solid var(--line-2)':'none',textDecoration:'none'}}>
                <div className="avatar">{p.prenom?.[0]}{p.nom?.[0]}</div>
                <span style={{flex:1,fontSize:13,fontWeight:500,color:'var(--fg)'}}>{p.nom} {p.prenom}</span>
                <span style={{color:'var(--fg-4)'}}>›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
