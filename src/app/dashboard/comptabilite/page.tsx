'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function ComptabilitePage() {
  const [factures, setFactures] = useState<any[]>([])
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [mois, setMois] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [showImport, setShowImport] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [retrocession, setRetrocession] = useState(60)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const loadFactures = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }
    const [{ data }, { data: prat }] = await Promise.all([
      supabase.from('factures').select('*').eq('praticien_id', session.user.id).order('date_facture'),
      supabase.from('praticiens').select('retrocession').eq('id', session.user.id).single()
    ])
    setFactures(data || [])
    setRetrocession(prat?.retrocession || 60)
    setLoading(false)
  }

  useEffect(() => { loadFactures() }, [])

  const facturesMois = factures.filter(f => {
    const d = new Date(f.date_facture)
    return d.getFullYear() === annee && d.getMonth() === mois
  })

  const totalMois = facturesMois.filter(f => f.statut !== 'annulee').reduce((s, f) => s + (f.total || 0), 0)
  const totalAnnee = factures.filter(f => f.statut !== 'annulee' && new Date(f.date_facture).getFullYear() === annee).reduce((s, f) => s + (f.total || 0), 0)

  const statsMensuelles = MOIS.map((_, i) => {
    const ff = factures.filter(f => {
      const d = new Date(f.date_facture)
      return d.getFullYear() === annee && d.getMonth() === i && f.statut !== 'annulee'
    })
    return { total: ff.reduce((s, f) => s + (f.total || 0), 0), nb: ff.length }
  })
  const maxMois = Math.max(...statsMensuelles.map(s => s.total), 1)

  const paiements: Record<string, number> = {}
  facturesMois.filter(f => f.statut !== 'annulee').forEach(f => {
    const m = f.mode_paiement || 'Autre'
    paiements[m] = (paiements[m] || 0) + (f.total || 0)
  })

  // Annuler une facture
  const annulerFacture = async (id: string) => {
    if (!confirm('Annuler cette facture ?')) return
    const supabase = createClient()
    await supabase.from('factures').update({ statut: 'annulee' }).eq('id', id)
    setFactures(f => f.map(x => x.id === id ? { ...x, statut: 'annulee' } : x))
  }

  // Réactiver une facture annulée
  const reactiver = async (id: string) => {
    const supabase = createClient()
    await supabase.from('factures').update({ statut: 'payee' }).eq('id', id)
    setFactures(f => f.map(x => x.id === id ? { ...x, statut: 'payee' } : x))
  }

  // Supprimer définitivement
  const supprimer = async (id: string) => {
    if (!confirm('Supprimer définitivement cette facture ?')) return
    const supabase = createClient()
    await supabase.from('factures').delete().eq('id', id)
    setFactures(f => f.filter(x => x.id !== id))
  }

  // Modifier une facture
  const sauvegarderEdit = async (id: string) => {
    const supabase = createClient()
    await supabase.from('factures').update({
      mode_paiement: editData.mode_paiement,
      total: parseFloat(editData.total),
      date_facture: editData.date_facture,
      patient_nom: editData.patient_nom,
    }).eq('id', id)
    setFactures(f => f.map(x => x.id === id ? { ...x, ...editData, total: parseFloat(editData.total) } : x))
    setEditingId(null)
  }

  // Lire le fichier Excel
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })

      const lignes: any[] = []
      let currentDate = ''
      const modeMap: Record<string,string> = { CHEQUE:'Chèque', ESPECE:'Espèces', POD:'Tiers payant', VIREMENT:'Virement', CARTE:'Carte bancaire' }

      rows.forEach((row: any[]) => {
        if (!row || row.length < 4) return
        const col0 = row[0]?.toString().trim()
        const patient = row[1]?.toString().trim()
        const paiement = row[2]?.toString().trim().toUpperCase()
        const montant = parseFloat(row[3])

        // Détecter une date (format normal ou numéro sériel Excel)
        if (col0) {
          const num = parseFloat(col0)
          if (!isNaN(num) && num > 40000 && num < 50000) {
            // Numéro sériel Excel → date
            const d = new Date(Math.round((num - 25569) * 86400 * 1000))
            currentDate = d.toISOString().slice(0, 10)
          } else if (!isNaN(Date.parse(col0))) {
            currentDate = new Date(col0).toISOString().slice(0, 10)
          }
        }

        if (patient && paiement && !isNaN(montant) && montant > 0 && currentDate && ['CHEQUE','ESPECE','POD','VIREMENT','CARTE'].includes(paiement)) {
          lignes.push({ date: currentDate, patient: patient.charAt(0).toUpperCase() + patient.slice(1).toLowerCase(), mode_paiement: modeMap[paiement] || paiement, montant, cabinet: 'Livry-Gargan' })
        }
      })
      setImportPreview(lignes)
      setShowImport(true)
    }
    reader.readAsBinaryString(file)
  }

  // Importer les lignes en batch
  const confirmerImport = async () => {
    setImporting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Récupérer tous les numéros existants pour éviter les doublons
      const { data: allFacts } = await supabase.from('factures').select('numero').eq('praticien_id', session.user.id)
      const existingNums = new Set((allFacts || []).map((f: any) => f.numero))
      
      let seq = Date.now() // Utiliser timestamp pour garantir l'unicité

      const rows = importPreview.map((ligne) => {
        let numero = `IMP-${new Date(ligne.date).getFullYear()}-${String(seq++).slice(-6)}`
        while (existingNums.has(numero)) { numero = `IMP-${new Date(ligne.date).getFullYear()}-${String(seq++).slice(-6)}` }
        existingNums.add(numero)
        return {
          praticien_id: session.user.id,
          numero,
          date_facture: ligne.date,
          patient_nom: ligne.patient,
          mode_paiement: ligne.mode_paiement,
          total: ligne.montant,
          cabinet: ligne.cabinet,
          actes: [{ designation: 'Soin de pédicurie', quantite: 1, prix_unitaire: ligne.montant }],
          statut: 'payee',
          source: 'import_excel'
        }
      })

      const { error } = await supabase.from('factures').insert(rows)
      if (error) {
        console.error('Import error:', error)
        alert('Erreur import : ' + error.message)
        setImporting(false)
        return
      }

      await loadFactures()
      setShowImport(false)
      setImportPreview([])
    } catch(e) {
      console.error(e)
      alert('Erreur inattendue')
    }
    setImporting(false)
  }

  // Export CSV
  const exportCSV = () => {
    const rows = [['Date','Patient / N° Facture','Mode de paiement','Montant (€)','Statut']]
    facturesMois.forEach(f => rows.push([f.date_facture, f.patient_nom || f.numero, f.mode_paiement || '—', (f.total||0).toFixed(2), f.statut || 'payee']))
    rows.push(['','','TOTAL', totalMois.toFixed(2),''])
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`PODian_${MOIS[mois]}_${annee}.csv`; a.click()
  }

  const card: React.CSSProperties = { background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px' }
  const dotColors = ['#1a1410','#c8b89a','#9b8f7e','#e2dbd0']

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div style={{width:'28px',height:'28px',border:'2px solid #e2dbd0',borderTopColor:'#c8b89a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <div style={{ padding:'32px 36px', maxWidth:'1100px' }}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleExcelFile} />

      {/* Modal import */}
      {showImport && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'28px', width:'600px', maxHeight:'80vh', overflow:'auto' }}>
            <h2 style={{ fontFamily:'Playfair Display, serif', fontSize:'20px', color:'#1a1410', fontWeight:'400', marginBottom:'8px' }}>Import Excel — {importPreview.length} lignes</h2>
            <p style={{ fontSize:'13px', color:'#9b8f7e', marginBottom:'20px' }}>Vérifie les données avant de confirmer l'import.</p>
            <div style={{ border:'1px solid #e2dbd0', borderRadius:'10px', overflow:'hidden', marginBottom:'20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 120px 80px', padding:'10px 14px', background:'#f9f7f4', borderBottom:'1px solid #e2dbd0' }}>
                {['Date','Patient','Paiement','Montant'].map(h => <span key={h} style={{ fontSize:'10px', color:'#9b8f7e', fontWeight:'500', textTransform:'uppercase', letterSpacing:'.05em' }}>{h}</span>)}
              </div>
              {importPreview.map((l, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'100px 1fr 120px 80px', padding:'10px 14px', borderBottom: i<importPreview.length-1?'1px solid #f5f2ee':'none' }}>
                  <span style={{ fontSize:'12px', color:'#4a3f35' }}>{l.date}</span>
                  <span style={{ fontSize:'12px', fontWeight:'500', color:'#1a1410' }}>{l.patient}</span>
                  <span style={{ fontSize:'12px', color:'#4a3f35' }}>{l.mode_paiement}</span>
                  <span style={{ fontSize:'12px', fontWeight:'500', color:'#1a1410', textAlign:'right' }}>{l.montant} €</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={confirmerImport} disabled={importing} style={{ padding:'10px 20px', background:'#1a1410', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'500', color:'#f5f2ee', cursor:'pointer', opacity: importing?0.6:1 }}>
                {importing ? 'Import...' : `Importer ${importPreview.length} lignes`}
              </button>
              <button onClick={() => setShowImport(false)} style={{ padding:'10px 20px', background:'#f5f2ee', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#4a3f35', cursor:'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display, serif', fontSize:'28px', color:'#1a1410', fontWeight:'400' }}>Comptabilité</h1>
          <p style={{ fontSize:'13px', color:'#9b8f7e', marginTop:'4px' }}>Recettes et gestion des factures</p>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <select value={mois} onChange={e => setMois(Number(e.target.value))} style={{ padding:'9px 14px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#1a1410', outline:'none' }}>
            {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))} style={{ padding:'9px 14px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#1a1410', outline:'none' }}>
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} style={{ padding:'9px 16px', background:'#f5f2ee', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#4a3f35', cursor:'pointer' }}>
            📥 Import Excel
          </button>
          <button onClick={exportCSV} style={{ padding:'9px 16px', background:'#fff', border:'1px solid #e2dbd0', borderRadius:'10px', fontSize:'13px', color:'#4a3f35', cursor:'pointer' }}>Export CSV</button>
          <button onClick={async () => {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ unit:'mm', format:'a4' })
            const ml = 20; const W = 210
            doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(20,20,20)
            doc.text('Récapitulatif comptabilité', ml, 22)
            doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(140,140,140)
            doc.text(`${MOIS[mois]} ${annee}`, ml, 29)
            doc.setDrawColor(210,210,210); doc.setLineWidth(0.3); doc.line(ml, 33, W-ml, 33)
            doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(20,20,20)
            doc.text(`Total : ${totalMois.toFixed(2)} €`, ml, 43)
            let y = 56
            doc.setFontSize(8); doc.setTextColor(140,140,140)
            doc.text('Date', ml, y); doc.text('Patient', ml+26, y); doc.text('Paiement', ml+90, y); doc.text('Montant', W-ml, y, { align:'right' }); y+=5
            doc.setDrawColor(210,210,210); doc.line(ml, y, W-ml, y); y+=4
            facturesMois.forEach(f => {
              if (y > 270) { doc.addPage(); y=20 }
              doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(20,20,20)
              if (f.statut === 'annulee') doc.setTextColor(150,150,150)
              doc.text(new Date(f.date_facture).toLocaleDateString('fr-FR'), ml, y)
              doc.text((f.patient_nom || f.numero || '').substring(0,30), ml+26, y)
              doc.text(f.mode_paiement || '—', ml+90, y)
              doc.text(`${(f.total||0).toFixed(2)} €${f.statut==='annulee'?' (annulée)':''}`, W-ml, y, { align:'right' })
              y+=7; doc.setDrawColor(240,235,228); doc.setLineWidth(0.1); doc.line(ml, y-2, W-ml, y-2)
            })
            y+=5; doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(20,20,20)
            doc.text('TOTAL', ml+90, y); doc.text(`${totalMois.toFixed(2)} €`, W-ml, y, { align:'right' })
            doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(200,200,200)
            doc.text('Généré par PODian', W/2, 285, { align:'center' })
            doc.save(`PODian_${MOIS[mois]}_${annee}.pdf`)
          }} style={{ padding:'9px 16px', background:'#1a1410', border:'none', borderRadius:'10px', fontSize:'13px', color:'#f5f2ee', cursor:'pointer' }}>Export PDF</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' }}>
        <div style={{ background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px 18px' }}>
          <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>Total brut {MOIS[mois]}</div>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:'24px', color:'#1a1410', fontWeight:'400' }}>{Math.round(totalMois)} €</div>
          <div style={{ fontSize:'11px', color:'#9b8f7e', marginTop:'5px' }}>{facturesMois.filter(f=>f.statut!=='annulee').length} factures</div>
        </div>
        <div style={{ background:'#c8b89a', borderRadius:'16px', padding:'20px 18px' }}>
          <div style={{ fontSize:'10px', color:'rgba(26,20,16,0.55)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>Ma part ({retrocession}%)</div>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:'24px', color:'#1a1410', fontWeight:'400' }}>{Math.round(totalMois * retrocession / 100)} €</div>
          <div style={{ fontSize:'11px', color:'rgba(26,20,16,0.55)', marginTop:'5px' }}>après rétrocession</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px 18px' }}>
          <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>Total annuel</div>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:'24px', color:'#1a1410', fontWeight:'400' }}>{Math.round(totalAnnee)} €</div>
          <div style={{ fontSize:'11px', color:'#9b8f7e', marginTop:'5px' }}>Ma part : {Math.round(totalAnnee * retrocession / 100)} €</div>
        </div>
        <div style={{ background:'#fff', border:'1px solid #e2dbd0', borderRadius:'16px', padding:'20px 18px' }}>
          <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px' }}>Annulées</div>
          <div style={{ fontFamily:'Playfair Display, serif', fontSize:'24px', color:'#1a1410', fontWeight:'400' }}>{facturesMois.filter(f=>f.statut==='annulee').length}</div>
          <div style={{ fontSize:'11px', color:'#9b8f7e', marginTop:'5px' }}>ce mois</div>
        </div>
      </div>

      {/* Graphique annuel */}
      <div style={{ ...card, marginBottom:'16px' }}>
        <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'14px' }}>Chiffre d'affaires — {annee}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'100px' }}>
          {statsMensuelles.map((s, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }} onClick={() => setMois(i)}>
              <div style={{ fontSize:'9px', color: i===mois?'#1a1410':'#9b8f7e', fontWeight: i===mois?'500':'400' }}>{s.total>0?`${Math.round(s.total)}€`:''}</div>
              <div style={{ width:'100%', background: i===mois?'#1a1410':'#e2dbd0', borderRadius:'4px 4px 0 0', height:`${Math.max(s.total/maxMois*70, s.total>0?3:0)}px`, minHeight: s.total>0?'3px':'0' }}></div>
              <div style={{ fontSize:'9px', color: i===mois?'#1a1410':'#9b8f7e', fontWeight: i===mois?'500':'400' }}>{MOIS[i].slice(0,3)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <div style={card}>
          <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'14px' }}>Modes de paiement</div>
          {Object.keys(paiements).length === 0 ? <p style={{ fontSize:'13px', color:'#9b8f7e' }}>Aucune donnée</p> :
            Object.entries(paiements).sort((a,b)=>b[1]-a[1]).map(([k,v],i) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 0', borderBottom:'1px solid #f5f2ee' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:dotColors[i%4] }}></div>
                <span style={{ flex:1, fontSize:'13px', color:'#4a3f35' }}>{k}</span>
                <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410' }}>{Math.round(v)} €</span>
                <span style={{ fontSize:'11px', color:'#9b8f7e', width:'36px', textAlign:'right' }}>{totalMois>0?Math.round(v/totalMois*100):0}%</span>
              </div>
            ))
          }
        </div>
        <div style={card}>
          <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'14px' }}>Résumé du mois</div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f5f2ee' }}>
            <span style={{ fontSize:'13px', color:'#4a3f35' }}>Factures payées</span>
            <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410' }}>{facturesMois.filter(f=>f.statut!=='annulee').length}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f5f2ee' }}>
            <span style={{ fontSize:'13px', color:'#4a3f35' }}>Factures annulées</span>
            <span style={{ fontSize:'13px', fontWeight:'500', color:'#9b8f7e' }}>{facturesMois.filter(f=>f.statut==='annulee').length}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 0' }}>
            <span style={{ fontSize:'13px', fontWeight:'500', color:'#1a1410' }}>Total encaissé</span>
            <span style={{ fontSize:'14px', fontWeight:'500', color:'#1a1410' }}>{totalMois.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* Tableau détaillé avec actions */}
      <div style={card}>
        <div style={{ fontSize:'10px', color:'#9b8f7e', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'16px' }}>
          Détail — {MOIS[mois]} {annee}
        </div>
        <div style={{ background:'#f9f7f4', borderRadius:'10px', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 90px 80px 120px', padding:'10px 16px', borderBottom:'1px solid #e2dbd0' }}>
            {['Date','Patient / N°','Paiement','Montant','Statut','Actions'].map(h => (
              <span key={h} style={{ fontSize:'10px', color:'#9b8f7e', fontWeight:'500', letterSpacing:'.05em', textTransform:'uppercase' }}>{h}</span>
            ))}
          </div>

          {facturesMois.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:'#9b8f7e', fontSize:'13px', background:'#fff' }}>Aucune facture ce mois</div>
          ) : facturesMois.map((f, i) => {
            const isEditing = editingId === f.id
            const isAnnulee = f.statut === 'annulee'
            const nomAffiche = f.patient_nom || f.numero || '—'

            return (
              <div key={f.id} style={{ background:'#fff', borderBottom: i<facturesMois.length-1?'1px solid #f5f2ee':'none', opacity: isAnnulee ? 0.6 : 1 }}>
                {isEditing ? (
                  <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 90px 80px 120px', padding:'10px 16px', alignItems:'center', gap:'6px' }}>
                    <input type="date" value={editData.date_facture} onChange={e => setEditData({...editData, date_facture: e.target.value})}
                      style={{ padding:'4px 8px', border:'1px solid #c8b89a', borderRadius:'6px', fontSize:'12px' }} />
                    <input value={editData.patient_nom || ''} onChange={e => setEditData({...editData, patient_nom: e.target.value})}
                      style={{ padding:'4px 8px', border:'1px solid #c8b89a', borderRadius:'6px', fontSize:'12px' }} />
                    <select value={editData.mode_paiement} onChange={e => setEditData({...editData, mode_paiement: e.target.value})}
                      style={{ padding:'4px 8px', border:'1px solid #c8b89a', borderRadius:'6px', fontSize:'12px' }}>
                      {['Chèque','Espèces','Carte bancaire','Virement','Tiers payant'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input type="number" value={editData.total} onChange={e => setEditData({...editData, total: e.target.value})}
                      style={{ padding:'4px 8px', border:'1px solid #c8b89a', borderRadius:'6px', fontSize:'12px', textAlign:'right' }} />
                    <span></span>
                    <div style={{ display:'flex', gap:'4px' }}>
                      <button onClick={() => sauvegarderEdit(f.id)} style={{ padding:'4px 10px', background:'#1a1410', border:'none', borderRadius:'6px', fontSize:'11px', color:'#f5f2ee', cursor:'pointer' }}>✓</button>
                      <button onClick={() => setEditingId(null)} style={{ padding:'4px 10px', background:'#f5f2ee', border:'1px solid #e2dbd0', borderRadius:'6px', fontSize:'11px', color:'#4a3f35', cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 90px 80px 120px', padding:'12px 16px', alignItems:'center' }}>
                    <span style={{ fontSize:'12px', color:'#4a3f35' }}>{new Date(f.date_facture).toLocaleDateString('fr-FR')}</span>
                    <span style={{ fontSize:'13px', fontWeight:'500', color: isAnnulee?'#9b8f7e':'#1a1410', textDecoration: isAnnulee?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomAffiche}</span>
                    <span style={{ fontSize:'12px', color:'#4a3f35' }}>{f.mode_paiement || '—'}</span>
                    <span style={{ fontSize:'13px', fontWeight:'500', color: isAnnulee?'#9b8f7e':'#1a1410', textAlign:'right' }}>{(f.total||0).toFixed(2)} €</span>
                    <span style={{ fontSize:'10px', padding:'3px 8px', borderRadius:'20px', background: isAnnulee?'#f5f2ee':'#f0ebe4', color: isAnnulee?'#9b8f7e':'#4a3f35', textAlign:'center' }}>
                      {isAnnulee ? 'Annulée' : 'Payée'}
                    </span>
                    <div style={{ display:'flex', gap:'4px' }}>
                      {!isAnnulee && (
                        <button onClick={() => { setEditingId(f.id); setEditData({ date_facture: f.date_facture, patient_nom: f.patient_nom||'', mode_paiement: f.mode_paiement||'Chèque', total: f.total||0 }) }}
                          style={{ padding:'4px 8px', background:'#f5f2ee', border:'1px solid #e2dbd0', borderRadius:'6px', fontSize:'10px', color:'#4a3f35', cursor:'pointer' }}>Modifier</button>
                      )}
                      {isAnnulee ? (
                        <button onClick={() => reactiver(f.id)} style={{ padding:'4px 8px', background:'#f0ebe4', border:'none', borderRadius:'6px', fontSize:'10px', color:'#4a3f35', cursor:'pointer' }}>Réactiver</button>
                      ) : (
                        <button onClick={() => annulerFacture(f.id)} style={{ padding:'4px 8px', background:'none', border:'1px solid #e2dbd0', borderRadius:'6px', fontSize:'10px', color:'#9b8f7e', cursor:'pointer' }}>Annuler</button>
                      )}
                      <button onClick={() => supprimer(f.id)} style={{ padding:'4px 8px', background:'none', border:'none', borderRadius:'6px', fontSize:'10px', color:'#c8b89a', cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {facturesMois.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 130px 90px 80px 120px', padding:'12px 16px', background:'#f0ebe4', borderTop:'1px solid #e2dbd0' }}>
              <span></span><span></span><span></span>
              <span style={{ fontSize:'14px', fontWeight:'500', color:'#1a1410', textAlign:'right' }}>{totalMois.toFixed(2)} €</span>
              <span style={{ fontSize:'11px', color:'#9b8f7e', textAlign:'center' }}>Total</span>
              <span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
