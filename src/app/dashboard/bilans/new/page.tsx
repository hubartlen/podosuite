import { Suspense } from 'react'
import NewBilanClient from './client'

export default function NewBilanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm" style={{color:'#94a3b8'}}>Chargement...</div>}>
      <NewBilanClient />
    </Suspense>
  )
}
