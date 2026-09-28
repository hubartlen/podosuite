import { redirect } from 'next/navigation'

export default async function AncienNouveauBilan({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const { patient } = await searchParams
  redirect(patient ? `/dashboard/bilans/nouveau?patient=${patient}` : '/dashboard/bilans/nouveau')
}
