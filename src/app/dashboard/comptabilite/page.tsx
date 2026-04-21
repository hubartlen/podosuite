'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function ComptabilitePage() {
  const [factures, setFactures] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [mois, setMois] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const uid = session.user.id
      const [{ data: f }, { data: c }] = await Promise.all([
        supabase.from('factures').select('*, patients(nom, prenom)').eq('praticien_id', uid).order('date_facture'),
        supabase.from('cabinets').select('id, nom').eq('praticien_id', uid)
      ])
      setFactures(f || [])
      setCabinets(c || [])
      setLoading(false)
    }
    load()
  }, [router])

  // Filtrer par mois/année
  const facturesMois = factures.filter(f => {
    const d = new Date(f.date_facture)
    return d.getFullYear() === annee && d.getMonth() === mois
  })

  // Stats annuelles par mois
  const statsMensuelles = MOIS.map((_, i) => {
    const ff = factures.filter(f => {
      const d = new Date(f.date_facture)
      return d.getFullYear() === annee && d.getMonth() === i
    })
    return { total: ff.reduce((s, f) => s + (f.total || 0), 0), nb: ff.length }
  })
  const maxMois = Math.max(...statsMensuelles.map(s => s.total), 1)
  const totalAnnee = statsMensuelles.reduce((s, m) => s + m.total, 0)
  const totalMoisCourant = facturesMois.reduce((s, f) => s + (f.total || 0), 0)

  // Répartition paiements du mois
  const paiements: Record<string, number> = {}
  facturesMois.forEach(f => {
    const m = f.mode_paiement || 'Autre'
    paiements[m] = (paiements[m] || 0) + (f.total || 0)
  })

  // Répartition par cabinet du mois
  const parCabinet: Record<string, number> = {}
  facturesMois.forEach(f => {
    const nom = cabinets.find(c => c.id === f.cabinet)?.nom || f.cabinet || 'Principal'
    parCabinet[nom] = (parCabinet[nom] || 0) + (f.total || 0)
  })

  // Actes du mois
  const actesMap: Record<string, { nb: number; total: number }> = {}
  facturesMois.forEach(f => {
    ;(f.actes || []).forEach((a: any) => {
      const k = a.designation || 'Acte'
      if (!actesMap[k]) actesMap[k] = { nb: 0, total: 0 }
      actesMap[k].nb += a.quantite || 1
      actesMap[k].total += (a.quantite || 1) * (a.prix_unitaire || 0)
    })
  })
  const actesArr = Object.entries(actesMap).sort((a, b) => b[1].total - a[1].total)

  // Export CSV
  const exportCSV = () => {
    const rows = [['Date','Patient','Mode de paiement','Montant (€)']]
    facturesMois.forEach(f => {
      const patient = f.patients ? `${f.patients.nom} ${f.patients.prenom}` : '—'
      ;(f.actes || [{ designation: '—', prix_unitaire: f.total }]).forEach((a: any) => {
        rows.push([f.date_facture, patient, f.mode_paiement || '—', (a.prix_unitaire || 0).toString()])
      })
    })
    rows.push(['', '', 'TOTAL', totalMoisCourant.toFixed(2)])
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `PODian_${MOIS[mois]}_${annee}.csv`; a.click()
  }

  // Export PDF résumé
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const ml = 20; const W = 210
    const G: [number,number,number] = [140,140,140]
    const N: [number,number,number] = [20,20,20]
    const GL: [number,number,number] = [210,210,210]

    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(...N)
    doc.text('Récapitulatif de comptabilité', ml, 22)
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...G)
    doc.text(`${MOIS[mois]} ${annee}`, ml, 29)
    doc.setDrawColor(...GL); doc.setLineWidth(0.3); doc.line(ml, 33, W-ml, 33)

    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...N)
    doc.text(`Total du mois : ${totalMoisCourant.toFixed(2)} €`, ml, 43)
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...G)
    doc.text(`${facturesMois.length} facture(s)`, ml, 49)

    let y = 60
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...N)
    doc.text('Détail des recettes', ml, y); y += 7
    doc.setDrawColor(...GL); doc.line(ml, y, W-ml, y); y += 5

    // En-têtes
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...G)
    doc.text('Date', ml, y); doc.text('Patient', ml+22, y); doc.text('Paiement', ml+90, y); doc.text('Montant', W-ml, y, { align:'right' }); y += 5
    doc.setDrawColor(...GL); doc.line(ml, y, W-ml, y); y += 4

    facturesMois.forEach(f => {
      if (y > 270) { doc.addPage(); y = 20 }
      const patient = f.patients ? `${f.patients.nom} ${f.patients.prenom}` : '—'
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...N)
      doc.text(new Date(f.date_facture).toLocaleDateString('fr-FR'), ml, y)
      doc.text(patient.substring(0,30), ml+22, y)
      doc.text(f.mode_paiement || '—', ml+90, y)
      doc.text(`${(f.total||0).toFixed(2)} €`, W-ml, y, { align:'right' })
      y += 7
      doc.setDrawColor(...GL); doc.setLineWidth(0.1); doc.line(ml, y-2, W-ml, y-2)
    })

    y += 5
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...N)
    doc.text('TOTAL', ml+90, y); doc.text(`${totalMoisCourant.toFixed(2)} €`, W-ml, y, { align:'right' })
    y += 12

    // Répartition paiements
    if (Object.keys(paiements).length > 0) {
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Répartition par mode de paiement', ml, y); y += 7
      Object.entries(paiements).forEach(([k, v]) => {
        doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...G)
        doc.text(k, ml+5, y)
        doc.setTextColor(...N)
        doc.text(`${v.toFixed(2)} €`, W-ml, y, { align:'right' }); y += 6
      })
    }

    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GL)
    doc.text('Généré par PODian — Gestion de cabinet podologique', W/2, 285, { align:'center' })

    doc.save(`PODian_Recap_${MOIS[mois]}_${annee}.pdf`)
  }

  const card: React.CSSProperties = { background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px' }
  const cardTitle: React.CSSProperties = { fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'14px' }
  const dotColors = ['#1a1410','#c8b89a','#9b8f7e','#e2dbd0']

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:'28px', height:'28px', border:'2px solid #e2dbd0', borderTopColor:'#c8b89a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding:'32px 36px', maxWidth:'1100px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'28px', color:'#1a1410', fontWeight:'400' }}>Comptabilité</h1>
          <p style={{ fontSize:'13px', color:'#9b8f7e', marginTop:'4px' }}>Analyse de tes recettes</p>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <select value={mois} onChange={e => setMois(Number(e.target.value))}
            style={{ padding:'9px 14px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#1a1410', outline:'none' }}>
            {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
            style={{ padding:'9px 14px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#1a1410', outline:'none' }}>
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={exportCSV} style={{ padding:'9px 16px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#4a3f35', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
            Export CSV
          </button>
          <button onClick={exportPDF} style={{ padding:'9px 16px', background:'#1a1410', border:'none', borderRadius:'10px', fontSize:'13px', color:'#f5f2ee', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* KPIs mois */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:`Total ${MOIS[mois]}`, val:`${Math.round(totalMoisCourant)} €`, sub:`${facturesMois.length} factures` },
          { label:'Moy. par facture', val: facturesMois.length ? `${Math.round(totalMoisCourant/facturesMois.length)} €` : '—', sub:'ce mois' },
          { label:'Total annuel', val:`${Math.round(totalAnnee)} €`, sub:`${annee}` },
          { label:'Moy. mensuelle', val:`${Math.round(totalAnnee/12)} €`, sub:'sur l\'année' },
        ].map((k, i) => (
          <div key={i} style={{ background: i===0 ? '#1a1410' : '#fff', border: i===0 ? 'none' : '1px solid #e2dbd0', borderRadius:'16px', padding:'20px 18px' }}>
            <div style={{ fontSize:'10px', color: i===0 ? '#9b8f7e' : '#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>{k.label}</div>
            <div style={{ fontFamily:'Playfair Display, serif', fontSize:'24px', color: i===0 ? '#f5f2ee' : '#1a1410', fontWeight:'400' }}>{k.val}</div>
            <div style={{ fontSize:'11px', color: i===0 ? '#c8b89a' : '#9b8f7e', marginTop:'5px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Graphique annuel */}
      <div style={{ ...card, marginBottom:'16px' }}>
        <div style={cardTitle}>Chiffre d'affaires mensuel — {annee}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'120px' }}>
          {statsMensuelles.map((s, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
              <div style={{ fontSize:'10px', fontWeight: i===mois ? '500' : '400', color: i===mois ? '#1a1410' : '#9b8f7e' }}>
                {Math.round(s.total) > 0 ? `${Math.round(s.total)}€` : ''}
              </div>
              <div style={{ width:'100%', background: i===mois ? '#1a1410' : '#e2dbd0', borderRadius:'4px 4px 0 0', height:`${Math.max(s.total/maxMois*80, s.total>0?4:0)}px`, transition:'all 0.2s', cursor:'pointer' }}
                onClick={() => setMois(i)}></div>
              <div style={{ fontSize:'10px', color: i===mois ? '#1a1410' : '#9b8f7e', fontWeight: i===mois ? '500' : '400' }}>{MOIS[i].slice(0,3)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        {/* Répartition paiements */}
        <div style={card}>
          <div style={cardTitle}>Modes de paiement — {MOIS[mois]}</div>
          {Object.keys(paiements).length === 0 ? (
            <p style={{ fontSize:'13px', color:'#9b8f7e', textAlign:'center', padding:'16px 0' }}>Aucune donnée</p>
          ) : Object.entries(paiements).sort((a,b) => b[1]-a[1]).map(([k, v], i) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 0', borderBottom:'1px solid #f5f2ee' }}>
              <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:dotColors[i%4], flexShrink:0 }}></div>
              <span style={{ flex:1, fontSize:'13px', color:'#4a3f35' }}>{k}</span>
              <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410' }}>{Math.round(v)} €</span>
              <span style={{ fontSize:'11px', color:'#9b8f7e', width:'36px', textAlign:'right' }}>{Math.round(v/totalMoisCourant*100)}%</span>
            </div>
          ))}
        </div>

        {/* Répartition actes */}
        <div style={card}>
          <div style={cardTitle}>Actes facturés — {MOIS[mois]}</div>
          {actesArr.length === 0 ? (
            <p style={{ fontSize:'13px', color:'#9b8f7e', textAlign:'center', padding:'16px 0' }}>Aucune donnée</p>
          ) : actesArr.map(([k, v], i) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 0', borderBottom:'1px solid #f5f2ee' }}>
              <span style={{ flex:1, fontSize:'12px', color:'#4a3f35', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{k}</span>
              <span style={{ fontSize:'11px', color:'#9b8f7e', flexShrink:0 }}>{v.nb}×</span>
              <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410', flexShrink:0, minWidth:'55px', textAlign:'right' }}>{Math.round(v.total)} €</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau détaillé */}
      <div style={card}>
        <div style={{ ...cardTitle, marginBottom:'16px' }}>Détail des factures — {MOIS[mois]} {annee}</div>
        <div style={{ background:'#f9f7f4', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 140px 100px 90px', padding:'10px 16px', borderBottom:'1px solid #e2dbd0' }}>
            {['Date','Patient','Acte principal','Paiement','Montant'].map(h => (
              <span key={h} style={{ fontSize:'10px', color:'#9b8f7e', fontWeight:'500', letterSpacing:'.05em', textTransform:'uppercase' }}>{h}</span>
            ))}
          </div>
          {facturesMois.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#9b8f7e', fontSize:'13px' }}>Aucune facture ce mois</div>
          ) : facturesMois.map((f, i) => {
            const patient = f.patients ? `${f.patients.nom} ${f.patients.prenom}` : '—'
            const acte = f.actes?.[0]?.designation || '—'
            return (
              <div key={f.id} style={{ display:'grid', gridTemplateColumns:'100px 1fr 140px 100px 90px', padding:'12px 16px', borderBottom: i<facturesMois.length-1 ? '1px solid #f5f2ee' : 'none', background:'#fff' }}>
                <span style={{ fontSize:'13px', color:'#4a3f35' }}>{new Date(f.date_facture).toLocaleDateString('fr-FR')}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{patient}</span>
                <span style={{ fontSize:'12px', color:'#9b8f7e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acte}</span>
                <span style={{ fontSize:'12px', color:'#4a3f35' }}>{f.mode_paiement || '—'}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410', textAlign:'right' }}>{(f.total||0).toFixed(2)} €</span>
              </div>
            )
          })}
          {facturesMois.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 140px 100px 90px', padding:'12px 16px', background:'#f0ebe4', borderTop:'1px solid #e2dbd0' }}>
              <span></span><span></span><span></span>
              <span style={{ fontSize:'12px', fontWeight:'500', color:'#4a3f35' }}>TOTAL</span>
              <span style={{ fontSize:'14px', fontWeight:'500', color:'#1a1410', textAlign:'right' }}>{totalMoisCourant.toFixed(2)} €</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
