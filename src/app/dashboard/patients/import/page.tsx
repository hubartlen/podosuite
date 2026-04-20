'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Upload, Check, UserPlus } from 'lucide-react'

interface PatientDetecte {
  nom: string
  prenom: string
  civilite: string
  motif: string
  heure: string
  selected: boolean
}

export default function ImportDoctolib() {
  const [etape, setEtape] = useState<'upload' | 'review' | 'done'>('upload')
  const [patients, setPatients] = useState<PatientDetecte[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [nbImported, setNbImported] = useState(0)

  const handleFile = async (file: File) => {
    setLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      try {
        const res = await fetch('/api/import-doctolib', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf: base64 })
        })
        const data = await res.json()
        if (data.patients) {
          setPatients(data.patients.map((p: any) => ({ ...p, selected: true })))
          setEtape('review')
        }
      } catch {
        alert("Erreur lors de l'analyse du PDF")
      }
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  const handleImport = async () => {
    setImporting(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const selected = patients.filter(p => p.selected)
    let count = 0
    for (const p of selected) {
      const { error } = await supabase.from('patients').insert({
        praticien_id: session.user.id,
        nom: p.nom.toUpperCase(),
        prenom: p.prenom,
        sexe: p.civilite === 'M.' ? 'M' : 'F',
      })
      if (!error) count++
    }
    setNbImported(count)
    setEtape('done')
    setImporting(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour aux patients
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Import Doctolib</h1>
      <p className="text-slate-500 text-sm mb-6">Upload ton planning PDF du jour — l'IA détecte automatiquement tes patients.</p>

      {etape === 'upload' && (
        <div
          className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => document.getElementById('pdf-input')?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
          <input id="pdf-input" type="file" accept=".pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {loading ? (
            <div>
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Analyse en cours...</p>
              <p className="text-slate-400 text-sm mt-1">L'IA lit ton planning Doctolib</p>
            </div>
          ) : (
            <div>
              <Upload size={40} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 font-medium text-lg">Dépose ton PDF Doctolib ici</p>
              <p className="text-slate-400 text-sm mt-2">ou clique pour sélectionner</p>
              <p className="text-blue-600 text-xs mt-4 bg-blue-50 px-4 py-2 rounded-lg inline-block">
                Doctolib → Imprimer le planning → Enregistrer en PDF
              </p>
            </div>
          )}
        </div>
      )}

      {etape === 'review' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-sm text-blue-700 font-medium">{patients.filter(p => p.selected).length} patient(s) sélectionné(s)</p>
            <button onClick={() => { const allSelected = patients.every(p => p.selected); setPatients(ps => ps.map(x => ({ ...x, selected: !allSelected }))) }}
              className="text-xs text-blue-600 font-medium">
              {patients.every(p => p.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-6">
            {patients.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50"
                onClick={() => setPatients(pts => pts.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${p.selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {p.selected && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{p.civilite} {p.nom} {p.prenom}</p>
                  {p.motif && <p className="text-xs text-slate-400 mt-0.5">{p.heure && `${p.heure} · `}{p.motif}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleImport} disabled={importing || patients.filter(p => p.selected).length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <UserPlus size={15} />
              {importing ? 'Import...' : `Créer ${patients.filter(p => p.selected).length} fiche(s)`}
            </button>
            <button onClick={() => setEtape('upload')}
              className="px-5 py-3 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50">
              Recommencer
            </button>
          </div>
        </div>
      )}

      {etape === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">{nbImported} fiche(s) créée(s)</h2>
          <p className="text-slate-500 text-sm mb-6">Les patients ont été ajoutés.</p>
          <Link href="/dashboard/patients"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors">
            Voir les patients
          </Link>
        </div>
      )}
    </div>
  )
}
