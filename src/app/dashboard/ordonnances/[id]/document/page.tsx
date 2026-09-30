'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import DocumentOrdonnance from '@/app/dashboard/ordonnances/document-ordonnance'

export default function ImpressionOrdonnance() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [v, setV] = useState<any>(null)
  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data: od } = await supabase.from('ordonnances').select('*, patient:patients(*), cabinet:cabinets(id, nom, adresse)').eq('id', id).eq('praticien_id', session.user.id).single()
      if (!od) { router.push('/dashboard/ordonnances'); return }
      const { data: prat } = await supabase.from('praticiens').select('*').eq('id', session.user.id).single()
      const patient = Array.isArray(od.patient) ? od.patient[0] : od.patient
      const cabinet = Array.isArray(od.cabinet) ? od.cabinet[0] : od.cabinet
      setV({ od, prat, patient, cabinet })
      document.title = 'Ordonnance ' + (patient?.nom || '') + ' ' + od.date_ordonnance
    })()
  }, [id, router])
  if (!v) return <div style={{ padding: 40, color: '#6b6255', fontFamily: 'Inter, sans-serif' }}>Préparation de l'ordonnance…</div>
  const bouton: React.CSSProperties = { font: 'inherit', fontSize: 13, padding: '10px 16px', borderRadius: 6, border: '1px solid #e2dbd0', background: '#fff', color: '#4a3f35', textDecoration: 'none', cursor: 'pointer' }
  return (
    <div style={{ background: '#ece6dc', minHeight: '100vh', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@media print {
        @page { size: A4; margin: 0 }
        html, body { background: #fff !important }
        body * { visibility: hidden !important }
        .podian-doc, .podian-doc * { visibility: visible !important }
        .podian-doc { position: absolute !important; left: 0; top: 0; box-shadow: none !important }
      }`}</style>
      <div style={{ width: 794, maxWidth: '100%', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <a href={'/dashboard/ordonnances/' + id} style={bouton}>← Modifier</a>
        <button onClick={() => window.print()} style={{ ...bouton, background: '#1a1410', color: '#f5f2ee', border: 'none', fontWeight: 600 }}>Imprimer ou enregistrer en PDF</button>
      </div>
      <div style={{ boxShadow: '0 2px 14px rgba(26,20,16,.18)' }}>
        <DocumentOrdonnance o={v.od} patient={v.patient} praticien={v.prat} cabinet={v.cabinet} />
      </div>
    </div>
  )
}
