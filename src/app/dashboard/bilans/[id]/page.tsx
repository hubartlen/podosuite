'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import BilanDetail from './bilan-detail'

export default function BilanPage() {
  const params = useParams()
  const id = params.id as string
  const [bilan, setBilan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('bilans')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .eq('praticien_id', session.user.id)
        .single()
      if (!data) { router.push('/dashboard/patients'); return }
      setBilan(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <div className="p-8 text-sm text-slate-400">Chargement...</div>

  return (
    <div className="p-8 max-w-4xl">
      <Link href={`/dashboard/patients/${bilan.patient_id}`}
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour au dossier patient
      </Link>
      <BilanDetail bilan={bilan} patient={bilan.patient} />
    </div>
  )
}
