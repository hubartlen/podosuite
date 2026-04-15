import { Suspense } from 'react'
import NewFactureClient from './client'

export default function NewFacturePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm" style={{color:'#94a3b8'}}>Chargement...</div>}>
      <NewFactureClient />
    </Suspense>
  )
}
