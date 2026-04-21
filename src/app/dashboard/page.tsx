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
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (6 - i))
        return d
      })

      const [
        { count: totalPatients },
        { count: newPatients },
        { data: facturesMois },
        { data: facturesSemaine },
        { data: bilansCount },
        { data: recentPatients },
        { data: allFactures },
        { data: praticien },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('praticien_id', uid),
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('praticien_id', uid).gte('created_at', startOfMonth),
        supabase.from('factures').select('total, mode_paiement, actes').eq('praticien_id', uid).gte('date_facture', startOfMonth.slice(0,10)),
        supabase.from('factures').select('total, date_facture').eq('praticien_id', uid).gte('date_facture', startOfWeek.slice(0,10)),
        supabase.from('bilans').select('id', { count: 'exact', head: false }).eq('praticien_id', uid).gte('date_bilan', startOfMonth.slice(0,10)),
        supabase.from('patients').select('id, nom, prenom').eq('praticien_id', uid).order('created_at', { ascending: false }).limit(4),
        supabase.from('factures').select('total, date_facture, mode_paiement, actes').eq('praticien_id', uid),
        supabase.from('praticiens').select('prenom').eq('id', uid).single(),
      ])

      // Facturation par jour sur 7 jours
      const facParJour = last7Days.map(d => {
        const dateStr = d.toISOString().slice(0, 10)
        const total = (facturesSemaine || [])
          .filter((f: any) => f.date_facture === dateStr)
          .reduce((s: number, f: any) => s + (f.total || 0), 0)
        return {
          label: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()],
          total: Math.round(total)
        }
      })
      const maxJour = Math.max(...facParJour.map(d => d.total), 1)

      // Répartition paiements
      const paiements: Record<string, number> = {}
      ;(allFactures || []).forEach((f: any) => {
        const m = f.mode_paiement || 'Autre'
        paiements[m] = (paiements[m] || 0) + 1
      })
      const totalFact = Object.values(paiements).reduce((a, b) => a + b, 0) || 1
      const paiementsArr = Object.entries(paiements).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({
        label: k, pct: Math.round(v / totalFact * 100)
      }))

      // Actes fréquents
      const actesCount: Record<string, number> = {}
      ;(allFactures || []).forEach((f: any) => {
        ;(f.actes || []).forEach((a: any) => {
          const name = a.designation || ''
          actesCount[name] = (actesCount[name] || 0) + (a.quantite || 1)
        })
      })
      const actesArr = Object.entries(actesCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => ({ label: k, count: v }))

      // Derniers patients avec dernier acte
      const enrichedPatients = await Promise.all((recentPatients || []).map(async (p: any) => {
        const { data: lastBilan } = await supabase.from('bilans').select('date_bilan').eq('patient_id', p.id).order('date_bilan', { ascending: false }).limit(1).single()
        const { data: lastFact } = await supabase.from('factures').select('date_facture, actes').eq('patient_id', p.id).order('date_facture', { ascending: false }).limit(1).single()
        const lastActe = lastFact?.actes?.[0]?.designation || null
        const lastDate = lastFact?.date_facture || lastBilan?.date_bilan || null
        const type = lastFact ? 'Facture' : lastBilan ? 'Bilan' : null
        return { ...p, lastDate, lastActe, type }
      }))

      const totalMois = (facturesMois || []).reduce((s: number, f: any) => s + (f.total || 0), 0)
      const totalSem = (facturesSemaine || []).reduce((s: number, f: any) => s + (f.total || 0), 0)

      setData({
        prenom: praticien?.prenom || 'Arthur',
        totalPatients, newPatients,
        totalMois: Math.round(totalMois),
        nbFacturesMois: facturesMois?.length || 0,
        totalSem: Math.round(totalSem),
        nbBilansMois: bilansCount?.length || 0,
        facParJour, maxJour,
        paiementsArr, actesArr,
        enrichedPatients
      })
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:'28px', height:'28px', border:'2px solid #e2dbd0', borderTopColor:'#c8b89a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const card: React.CSSProperties = { background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px' }
  const cardTitle: React.CSSProperties = { fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }

  const dotColors = ['#639922','#BA7517','#B4B2A9','#c8b89a']

  const fmtDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000*3600*24))
    if (diff === 0) return "aujourd'hui"
    if (diff === 1) return 'hier'
    return new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
  }

  return (
    <div style={{ padding:'32px 36px', maxWidth:'1100px' }}>
      {/* Greeting */}
      <div style={{ marginBottom:'24px' }}>
        <p style={{ fontSize:'11px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'5px' }}>{today}</p>
        <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'28px', color:'#1a1410', fontWeight:'400' }}>Bonjour, {data.prenom}</h1>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Patients total', val:data.totalPatients, sub:`+${data.newPatients} ce mois`, gold:false },
          { label:'Facturé ce mois', val:`${data.totalMois} €`, sub:`${data.nbFacturesMois} factures`, gold:true },
          { label:'Cette semaine', val:`${data.totalSem} €`, sub:'7 derniers jours', gold:false },
          { label:'Bilans rédigés', val:data.nbBilansMois, sub:'ce mois', gold:false },
        ].map((k, i) => (
          <div key={i} style={{ background: k.gold ? '#c8b89a' : '#1a1410', borderRadius:'16px', padding:'20px 18px' }}>
            <div style={{ fontSize:'10px', color: k.gold ? 'rgba(26,20,16,.5)' : '#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>{k.label}</div>
            <div style={{ fontFamily:'Playfair Display, serif', fontSize:'26px', color: k.gold ? '#1a1410' : '#f5f2ee', fontWeight:'400', lineHeight:'1' }}>{k.val}</div>
            <div style={{ fontSize:'11px', color: k.gold ? 'rgba(26,20,16,.6)' : '#c8b89a', marginTop:'6px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
        {[
          { href:'/dashboard/bilans/new', label:'Nouveau bilan', sub:'Générer en PDF', dark:true },
          { href:'/dashboard/factures/new', label:'Nouvelle facture', sub:'Facturer un patient', gold:true },
          { href:'/dashboard/patients/import', label:'Import Doctolib', sub:'Planning du jour', outline:true },
          { href:'/dashboard/patients/new', label:'Nouveau patient', sub:'Créer une fiche', outline:true },
        ].map((a, i) => (
          <Link key={i} href={a.href} style={{
            display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderRadius:'14px', textDecoration:'none',
            background: a.dark ? '#1a1410' : a.gold ? '#c8b89a' : '#fff',
            border: a.outline ? '1px solid #e2dbd0' : 'none',
          }}>
            <div style={{ fontSize:'13px', fontWeight:'500', color: a.dark ? '#f5f2ee' : '#1a1410' }}>
              {a.label}
              <div style={{ fontSize:'10px', fontWeight:'400', marginTop:'2px', color: a.dark ? 'rgba(245,242,238,.4)' : '#9b8f7e' }}>{a.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Graphique + stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:'12px', marginBottom:'16px' }}>
        <div style={card}>
          <div style={cardTitle}>
            <span>Facturation — 7 derniers jours</span>
            <Link href="/dashboard/patients" style={{ color:'#c8b89a', fontSize:'11px', textDecoration:'none' }}>Voir tout</Link>
          </div>
          {data.facParJour.map((d: any, i: number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'9px' }}>
              <span style={{ fontSize:'11px', color:'#9b8f7e', width:'28px', flexShrink:0 }}>{d.label}</span>
              <div style={{ flex:1, height:'6px', background:'#f0ebe4', borderRadius:'3px' }}>
                <div style={{ height:'6px', background:'#1a1410', borderRadius:'3px', width:`${Math.round(d.total/data.maxJour*100)}%`, minWidth: d.total > 0 ? '4px' : '0' }}></div>
              </div>
              <span style={{ fontSize:'11px', color:'#4a3f35', width:'48px', textAlign:'right', flexShrink:0 }}>{d.total} €</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={card}>
            <div style={cardTitle}><span>Modes de paiement</span></div>
            {data.paiementsArr.length === 0 ? (
              <p style={{ fontSize:'12px', color:'#9b8f7e' }}>Aucune donnée</p>
            ) : data.paiementsArr.map((p: any, i: number) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom: i < data.paiementsArr.length-1 ? '1px solid #f5f2ee' : 'none' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:dotColors[i], flexShrink:0 }}></div>
                <span style={{ fontSize:'12px', color:'#4a3f35', flex:1 }}>{p.label}</span>
                <span style={{ fontSize:'12px', fontWeight:'500', color:'#1a1410' }}>{p.pct}%</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={cardTitle}><span>Actes fréquents</span></div>
            {data.actesArr.length === 0 ? (
              <p style={{ fontSize:'12px', color:'#9b8f7e' }}>Aucune donnée</p>
            ) : data.actesArr.map((a: any, i: number) => (
              <div key={i} style={{ display:'flex', alignItems:'center', padding:'7px 0', borderBottom: i < data.actesArr.length-1 ? '1px solid #f5f2ee' : 'none' }}>
                <span style={{ fontSize:'12px', color:'#4a3f35', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', paddingRight:'8px' }}>{a.label}</span>
                <span style={{ fontSize:'12px', fontWeight:'500', color:'#1a1410', flexShrink:0 }}>{a.count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Derniers patients */}
      <div style={card}>
        <div style={cardTitle}>
          <span>Derniers patients</span>
          <Link href="/dashboard/patients" style={{ color:'#c8b89a', fontSize:'11px', textDecoration:'none' }}>Voir tous</Link>
        </div>
        {data.enrichedPatients.length === 0 ? (
          <p style={{ fontSize:'13px', color:'#9b8f7e', textAlign:'center', padding:'16px 0' }}>Aucun patient — <Link href="/dashboard/patients/new" style={{ color:'#c8b89a', textDecoration:'none' }}>créer le premier</Link></p>
        ) : data.enrichedPatients.map((p: any, i: number) => (
          <Link key={p.id} href={`/dashboard/patients/${p.id}`}
            style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom: i < data.enrichedPatients.length-1 ? '1px solid #f5f2ee' : 'none', textDecoration:'none' }}>
            <div style={{ width:'34px', height:'34px', background:'#1a1410', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Playfair Display, serif', fontSize:'12px', color:'#c8b89a', flexShrink:0 }}>
              {p.prenom?.[0]}{p.nom?.[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410' }}>{p.nom} {p.prenom}</div>
              <div style={{ fontSize:'11px', color:'#9b8f7e', marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {p.lastActe || 'Aucun acte'}{p.lastDate ? ` · ${fmtDate(p.lastDate)}` : ''}
              </div>
            </div>
            {p.type && (
              <span style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'20px', flexShrink:0, background: p.type==='Facture' ? '#1a1410' : '#f0ebe4', color: p.type==='Facture' ? '#c8b89a' : '#4a3f35' }}>{p.type}</span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
