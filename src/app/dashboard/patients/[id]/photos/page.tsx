'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import PhotosPatient from '@/app/dashboard/patients/photos-patient'

export default function PagePhotos() {
  const { id } = useParams() as { id: string }
  const [patient, setPatient] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data } = await createClient().from('patients').select('id, nom, prenom').eq('id', id).single()
      setPatient(data)
    })()
  }, [id])

  return (
    <div style={{ padding: '30px 36px 60px', maxWidth: 1100, fontFamily: 'Inter, sans-serif', color: 'var(--fg)' }}>
      <Link href={'/dashboard/patients/' + id} style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}>← Dossier de {patient?.prenom} {patient?.nom}</Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 32, margin: '6px 0 20px' }}>Photos de {patient?.prenom} {patient?.nom}</h1>
      <PhotosPatient patientId={id} />
    </div>
  )
}
