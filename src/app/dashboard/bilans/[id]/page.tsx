import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BilanDetail from './bilan-detail'

export default async function BilanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: bilan } = await supabase
    .from('bilans')
    .select('*, patient:patients(*)')
    .eq('id', id)
    .eq('praticien_id', user?.id)
    .single()

  if (!bilan) notFound()

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
