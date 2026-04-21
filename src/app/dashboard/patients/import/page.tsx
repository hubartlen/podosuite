'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Upload, Check, UserPlus, Image, FileText } from 'lucide-react'

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
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    const isImage = file.type.startsWith('image/')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]

      if (isImage) setPreview(e.target?.result as string)

      try {
        const body = isImage
          ? { image: base64, mediaType: file.type }
          : { pdf: base64 }

        const res = await fetch('/api/import-doctolib', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.patients?.length > 0) {
          setPatients(data.patients.map((p: any) => ({ ...p, selected: true })))
          setEtape('review')
        } else {
          alert('Aucun patient détecté. Vérifie que la capture montre bien le planning.')
        }
      } catch {
        alert("Erreur lors de l'analyse")
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
    <div className="max-w-2xl mx-auto">
      <div className="px-4 pt-4 pb-2">
        <Link href="/dashboard/patients"
          className="inline-flex items-center gap-1 text-slate-400 text-sm mb-4">
          <ArrowLeft size={14} /> Patients
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Import Doctolib</h1>
        <p className="text-slate-400 text-sm mb-5">PDF ou capture d'écran — l'IA détecte tes patients automatiquement.</p>
      </div>

      <div className="px-4 pb-8">
        {etape === 'upload' && (
          <div>
            {/* Zone de dépôt */}
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4"
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
              <input id="file-input" type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {loading ? (
                <div>
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600 font-medium">Analyse en cours...</p>
                  <p className="text-slate-400 text-sm mt-1">L'IA lit ton planning</p>
                </div>
              ) : (
                <div>
                  <Upload size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-700 font-semibold">Dépose ton fichier ici</p>
                  <p className="text-slate-400 text-sm mt-1">ou clique pour sélectionner</p>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4">
                <Image size={20} className="text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-blue-800">Capture d'écran</p>
                <p className="text-xs text-blue-600 mt-1">Depuis l'app Doctolib iPhone — screenshot du planning</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <FileText size={20} className="text-slate-500 mb-2" />
                <p className="text-sm font-semibold text-slate-700">PDF</p>
                <p className="text-xs text-slate-400 mt-1">Depuis Doctolib web — Imprimer → Enregistrer en PDF</p>
              </div>
            </div>
          </div>
        )}

        {etape === 'review' && (
          <div>
            {preview && (
              <img src={preview} alt="Planning" className="w-full rounded-2xl mb-4 border border-slate-200" style={{maxHeight:200, objectFit:'cover', objectPosition:'top'}}/>
            )}
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 mb-3">
              <p className="text-sm text-blue-700 font-medium">{patients.filter(p => p.selected).length} patient(s) sélectionné(s)</p>
              <button onClick={() => { const all = patients.every(p => p.selected); setPatients(ps => ps.map(x => ({ ...x, selected: !all }))) }}
                className="text-xs text-blue-600 font-medium">
                {patients.every(p => p.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 mb-4">
              {patients.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-slate-50"
                  onClick={() => setPatients(pts => pts.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                    p.selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                  }`}>
                    {p.selected && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{p.civilite} {p.nom} {p.prenom}</p>
                    {(p.heure || p.motif) && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {p.heure && `${p.heure}${p.motif ? ' · ' : ''}`}{p.motif}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button onClick={handleImport} disabled={importing || patients.filter(p => p.selected).length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-sm font-semibold disabled:opacity-50">
                <UserPlus size={17} />
                {importing ? 'Création...' : `Créer ${patients.filter(p => p.selected).length} fiche(s) patient`}
              </button>
              <button onClick={() => { setEtape('upload'); setPreview(null) }}
                className="w-full py-3 rounded-2xl text-sm text-slate-500 bg-slate-100">
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">{nbImported} fiche(s) créée(s) ✓</h2>
            <p className="text-slate-400 text-sm mb-6">Les patients ont été ajoutés à ta liste.</p>
            <Link href="/dashboard/patients"
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold">
              Voir les patients
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
