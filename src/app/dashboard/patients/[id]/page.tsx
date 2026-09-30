'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function PatientPage() {
  const params = useParams()
  const id = params.id as string
  const [patient, setPatient] = useState<any>(null)
  const [bilans, setBilans] = useState<any[]>([])
  const [factures, setFactures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const [{ data: p }, { data: b }, { data: f }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).single(),
        supabase.from('bilans').select('*').eq('patient_id', id).order('date_bilan', { ascending: false }),
        supabase.from('factures').select('*').eq('patient_id', id).order('date_facture', { ascending: false }),
      ])
      if (!p) { router.push('/dashboard/patients'); return }
      setPatient(p); setBilans(b ?? []); setFactures(f ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{width:'32px',height:'32px',border:'2px solid var(--line)',borderTopColor:'var(--accent)',borderRadius: '50%',animation:'spin 0.8s linear infinite'}}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const age = patient.date_naissance ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25*24*3600*1000)) : null
  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
  const historique = [
    ...bilans.map(b => ({ ...b, _type:'bilan', _date:b.date_bilan })),
    ...factures.map(f => ({ ...f, _type:'facture', _date:f.date_facture })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return (
    <div style={{maxWidth:'480px',margin:'0 auto',padding:'20px 16px'}}>
      <Link href="/dashboard/patients" style={{display:'inline-flex',alignItems:'center',gap:'6px',color:'var(--fg-3)',fontSize:'12px',textDecoration:'none',marginBottom:'20px',letterSpacing:'0.02em'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6"/></svg>
        Patients
      </Link>

      {/* Identité */}
      <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
        <div style={{width:'56px',height:'56px',background:'var(--dark)',borderRadius: '8px',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display, serif',fontSize:'20px',color:'var(--accent)',flexShrink:0}}>
          {patient.prenom?.[0]}{patient.nom?.[0]}
        </div>
        <div>
          <h1 style={{fontFamily:'Playfair Display, serif',fontSize:'20px',color: 'var(--fg)',fontWeight:'400'}}>{civilite} {patient.nom} {patient.prenom}</h1>
          <p style={{fontSize:'12px',color:'var(--fg-3)',marginTop:'3px'}}>{age ? `${age} ans` : ''}{patient.mutuelle ? ` · ${patient.mutuelle}` : ''}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'20px'}}>
        {[
          { href:`/dashboard/bilans/new?patient=${id}`, label:'Bilan', bg:'var(--dark)', color: 'var(--on-dark)', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
          { href:'/dashboard/patients/' + id + '/photos', label:'Photos', bg:'var(--bg)', color:'var(--fg)', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg> },
          { href:'/dashboard/ordonnances/nouvelle?patient=' + id, label:'Ordonnance', bg:'var(--bg)', color:'var(--fg)', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h6M12 8v6"/></svg> },
          { href:`/dashboard/factures/new?patient=${id}`, label:'Facture', bg:'var(--accent)', color: 'var(--fg)', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1410" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8"/></svg> },
          { href:`/dashboard/patients/${id}/edit`, label:'Modifier', bg:'var(--bg)', color:'var(--fg-2)', icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a3f35" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{background:a.bg,borderRadius: '8px',padding:'14px 10px',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',textDecoration:'none',border:a.bg==='var(--bg)'?'1px solid var(--line)':'none'}}>
            {a.icon}
            <span style={{fontSize:'11px',fontWeight:'500',color:a.color,letterSpacing:'0.01em'}}>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'20px'}}>
        {[
          { label:'bilan(s)', value:bilans.length },
          { label:'facture(s)', value:factures.length },
          { label:'facturé', value:`${factures.reduce((s,f)=>s+(f.total||0),0).toFixed(0)}€` },
        ].map(s => (
          <div key={s.label} style={{background:'#fff',border:'1px solid var(--line)',borderRadius: '8px',padding:'14px 10px',textAlign:'center'}}>
            <div style={{fontFamily:'Playfair Display, serif',fontSize:'22px',color: 'var(--fg)',fontWeight:'400'}}>{s.value}</div>
            <div style={{fontSize:'10px',color:'var(--fg-3)',marginTop:'3px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Infos */}
      <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius: '6px',overflow:'hidden',marginBottom:'20px'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--surface-3)'}}>
          <p style={{fontSize:'10px',color:'var(--fg-3)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Informations</p>
        </div>
        {[
          patient.date_naissance && { label:'Naissance', value:new Date(patient.date_naissance).toLocaleDateString('fr-FR') },
          patient.telephone && { label:'Téléphone', value:patient.telephone },
          patient.email && { label:'Email', value:patient.email },
          patient.num_secu && { label:'N° SS', value:patient.num_secu },
          patient.mutuelle && { label:'Mutuelle', value:patient.mutuelle },
        ].filter(Boolean).map((info: any, i: number, arr: any[]) => (
          <div key={info.label} style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<arr.length-1?'1px solid var(--surface-3)':'none'}}>
            <span style={{fontSize:'12px',color:'var(--fg-3)'}}>{info.label}</span>
            <span style={{fontSize:'12px',fontWeight:'500',color: 'var(--fg)'}}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* Historique */}
      <div style={{marginBottom:'8px'}}>
        <p style={{fontSize:'10px',color:'var(--fg-3)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Historique · {historique.length} entrée(s)</p>
      </div>
      <div style={{background:'#fff',border:'1px solid var(--line)',borderRadius: '6px',overflow:'hidden'}}>
        {historique.length === 0 ? (
          <div style={{padding:'32px',textAlign:'center',color:'var(--fg-3)',fontSize:'13px'}}>Aucun historique</div>
        ) : historique.map((item: any, i: number) => (
          <div key={item.id}
            onClick={() => item._type==='bilan' && router.push(`/dashboard/bilans/${item.id}`)}
            style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',borderBottom:i<historique.length-1?'1px solid var(--surface-3)':'none',cursor:item._type==='bilan'?'pointer':'default'}}>
            <div style={{width:'36px',height:'36px',borderRadius: '8px',background:item._type==='bilan'?'var(--dark)':'var(--bg)',border:item._type==='facture'?'1px solid var(--line)':'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {item._type==='bilan'
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9b8f7e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8"/></svg>
              }
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'10px',fontWeight:'500',padding:'2px 8px',borderRadius: '6px',background:item._type==='bilan'?'var(--dark)':'var(--bg)',color:item._type==='bilan'?'var(--accent)':'var(--fg-3)'}}>
                  {item._type==='bilan'?'Bilan':'Facture'}
                </span>
                <span style={{fontSize:'11px',color:'var(--fg-3)'}}>{fmtDate(item._date)}</span>
              </div>
              <p style={{fontSize:'12px',color:'var(--fg-2)',marginTop:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {item._type==='bilan'?'Bilan podologique':`${item.numero} · ${(item.total||0).toFixed(2)} €`}
              </p>
            </div>
            {item._type==='bilan' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>}
          </div>
        ))}
      </div>
    </div>
  )
}
