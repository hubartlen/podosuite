'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { normaliser } from '@/lib/bilan-v2'
import DocumentBilan from '@/app/dashboard/bilans/document-bilan'

export default function DocumentPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [v, setV] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data: b } = await supabase.from('bilans').select('*, patient:patients(*), cabinet:cabinets(id, nom, adresse)').eq('id', id).eq('praticien_id', session.user.id).single()
      if (!b) { router.push('/dashboard/patients'); return }
      const { data: prat } = await supabase.from('praticiens').select('*').eq('id', session.user.id).single()
      const d = normaliser(b.donnees)
      let photos: string[] = []
      if (d.photos.length) {
        const { data } = await supabase.storage.from('bilans-photos').createSignedUrls(d.photos, 3600)
        photos = (data || []).map((x: any) => x.signedUrl).filter(Boolean)
      }
      setV({ d, b, prat, photos })
      document.title = `Bilan ${b.patient?.nom ?? ''} ${b.patient?.prenom ?? ''} ${b.date_bilan}`.trim()
    })()
  }, [id, router])

  if (!v) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Préparation du document…</div>

  const bouton: React.CSSProperties = { font: 'inherit', fontSize: 13, padding: '10px 16px', borderRadius: 6, border: '1px solid var(--line)', background: '#fff', color: 'var(--fg-2)', textDecoration: 'none', cursor: 'pointer' }

  return (
    <div style={{ background: 'var(--line-2)', minHeight: '100vh', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@media print {
        @page { size: A4; margin: 0 }
        html, body { background: #fff !important }
        body * { visibility: hidden !important }
        .podian-doc, .podian-doc * { visibility: visible !important }
        .podian-doc { position: absolute !important; left: 0; top: 0; box-shadow: none !important }
      }`}</style>
      <div style={{ width: 794, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <a href={`/dashboard/bilans/${id}/saisie`} style={bouton}>← Modifier le bilan</a>
        <button onClick={() => window.print()} style={{ ...bouton, background: 'var(--dark)', color: 'var(--on-dark)', border: 'none', fontWeight: 600 }}>Imprimer ou enregistrer en PDF</button>
      </div>
      <div style={{ boxShadow: '0 2px 14px rgba(26,20,16,.18)' }}>
        <DocumentBilan d={v.d} patient={v.b.patient} praticien={v.prat} cabinet={v.b.cabinet} date={v.b.date_bilan} photos={v.photos} />
      </div>
    </div>
  )
}
