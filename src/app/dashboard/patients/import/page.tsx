'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Upload, Check, UserPlus, AlertTriangle } from 'lucide-react'

interface PatientDetecte {
  nom: string
  prenom: string
  civilite: string
  motif: string
  heure: string
  selected: boolean
  doublon: boolean
}

export default function ImportDoctolib() {
  const [etape, setEtape] = useState<'upload' | 'review' | 'done'>('upload')
  const [patients, setPatients] = useState<PatientDetecte[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [nbImported, setNbImported] = useState(0)

  const handleFile = async (file: File) => {
    setLoading(true)
    const isImage = file.type.startsWith('image/')
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]

      try {
        // Récupérer le nom du praticien connecté
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        let praticienNom = ''
        if (session) {
          const { data: p } = await supabase.from('praticiens').select('nom, prenom').eq('id', session.user.id).single()
          if (p) praticienNom = `${p.prenom} ${p.nom}`
        }

        const body = isImage
          ? { image: base64, mediaType: file.type, praticienNom }
          : { pdf: base64, praticienNom }

        const res = await fetch('/api/import-doctolib', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        const data = await res.json()

        if (data.patients?.length > 0) {
          // Vérification des doublons
          const { data: existants } = await supabase
            .from('patients').select('nom, prenom').eq('praticien_id', session!.user.id)

          const patientsAvecDoublons = data.patients.map((p: any) => ({
            ...p,
            selected: true,
            doublon: existants?.some(
              e => e.nom.toLowerCase() === p.nom.toLowerCase() &&
                   e.prenom.toLowerCase() === p.prenom.toLowerCase()
            ) ?? false
          }))
          patientsAvecDoublons.forEach((p: PatientDetecte) => { if (p.doublon) p.selected = false })
          setPatients(patientsAvecDoublons)
          setEtape('review')
        } else {
          alert('Aucun patient détecté. Vérifie que le fichier est bien un planning Doctolib.')
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
    const selected = patients.filter(p => p.selected && !p.doublon)
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

  const nbDoublons = patients.filter(p => p.doublon).length
  const nbSelectionnes = patients.filter(p => p.selected && !p.doublon).length

  return (
    <div style={{ padding: '32px 36px', maxWidth: '700px' }}>
      <Link href="/dashboard/patients"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#9b8f7e', fontSize: '13px', textDecoration: 'none', marginBottom: '24px' }}>
        <ArrowLeft size={14} /> Patients
      </Link>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#1a1410', fontWeight: '400', marginBottom: '6px' }}>Import Doctolib</h1>
      <p style={{ fontSize: '13px', color: '#9b8f7e', marginBottom: '28px' }}>PDF ou capture d'écran — l'IA détecte les patients automatiquement.</p>

      {etape === 'upload' && (
        <div
          style={{ border: '2px dashed #e2dbd0', borderRadius: '16px', padding: '48px', textAlign: 'center', cursor: 'pointer', background: '#fff', transition: 'all 0.15s' }}
          onClick={() => document.getElementById('file-input')?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
          <input id="file-input" type="file" accept=".pdf,image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {loading ? (
            <div>
              <div style={{ width: '40px', height: '40px', border: '3px solid #e2dbd0', borderTopColor: '#c8b89a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <p style={{ color: '#1a1410', fontWeight: '500', marginBottom: '4px' }}>Analyse en cours...</p>
              <p style={{ color: '#9b8f7e', fontSize: '13px' }}>L'IA lit ton planning + vérification des doublons</p>
            </div>
          ) : (
            <div>
              <Upload size={36} style={{ color: '#c8b89a', margin: '0 auto 16px' }} />
              <p style={{ color: '#1a1410', fontWeight: '500', fontSize: '15px', marginBottom: '6px' }}>Dépose ton fichier Doctolib ici</p>
              <p style={{ color: '#9b8f7e', fontSize: '13px' }}>PDF ou capture d'écran iPhone — ou clique pour sélectionner</p>
            </div>
          )}
        </div>
      )}

      {etape === 'review' && (
        <div>
          {nbDoublons > 0 && (
            <div style={{ background: '#fdf8f0', border: '1px solid #e8d5a3', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ color: '#c8b89a', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '13px', color: '#4a3f35' }}><strong>{nbDoublons} doublon(s) détecté(s)</strong> — déjà présents dans ta liste, désélectionnés automatiquement.</p>
            </div>
          )}

          <div style={{ background: '#f5f2ee', border: '1px solid #e2dbd0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: '#1a1410', fontWeight: '500' }}>{nbSelectionnes} nouveau(x) patient(s) à créer</p>
            <button onClick={() => { const all = patients.filter(p => !p.doublon); const allSel = all.every(p => p.selected); setPatients(ps => ps.map(x => x.doublon ? x : { ...x, selected: !allSel })) }}
              style={{ fontSize: '12px', color: '#c8b89a', background: 'none', border: 'none', cursor: 'pointer' }}>
              Tout sélectionner
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2dbd0', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
            {patients.map((p, i) => (
              <div key={i}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < patients.length - 1 ? '1px solid #f5f2ee' : 'none', cursor: p.doublon ? 'default' : 'pointer', opacity: p.doublon ? 0.5 : 1 }}
                onClick={() => !p.doublon && setPatients(pts => pts.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}>
                <div style={{ width: '20px', height: '20px', border: `2px solid ${p.doublon ? '#e2dbd0' : p.selected ? '#1a1410' : '#c8b89a'}`, borderRadius: '6px', background: p.selected && !p.doublon ? '#1a1410' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.selected && !p.doublon && <Check size={12} color="white" strokeWidth={3} />}
                  {p.doublon && <AlertTriangle size={10} color="#c8b89a" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#1a1410' }}>{p.civilite} {p.nom} {p.prenom}</p>
                    {p.doublon && <span style={{ fontSize: '10px', background: '#f5f2ee', color: '#9b8f7e', padding: '2px 8px', borderRadius: '20px' }}>Déjà enregistré</span>}
                  </div>
                  {(p.heure || p.motif) && <p style={{ fontSize: '12px', color: '#9b8f7e', marginTop: '2px' }}>{p.heure && `${p.heure}${p.motif ? ' · ' : ''}`}{p.motif}</p>}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleImport} disabled={importing || nbSelectionnes === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 20px', background: '#1a1410', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: '#f5f2ee', cursor: 'pointer', opacity: importing || nbSelectionnes === 0 ? 0.5 : 1 }}>
              <UserPlus size={15} />
              {importing ? 'Création...' : `Créer ${nbSelectionnes} fiche(s)`}
            </button>
            <button onClick={() => setEtape('upload')}
              style={{ padding: '11px 20px', background: '#fff', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', color: '#4a3f35', cursor: 'pointer' }}>
              Recommencer
            </button>
          </div>
        </div>
      )}

      {etape === 'done' && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ width: '56px', height: '56px', background: '#f5f2ee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={28} style={{ color: '#1a1410' }} />
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#1a1410', fontWeight: '400', marginBottom: '8px' }}>{nbImported} fiche(s) créée(s)</h2>
          {nbDoublons > 0 && <p style={{ fontSize: '13px', color: '#9b8f7e', marginBottom: '4px' }}>{nbDoublons} doublon(s) ignoré(s)</p>}
          <p style={{ fontSize: '13px', color: '#9b8f7e', marginBottom: '24px' }}>Les patients ont été ajoutés à ta liste.</p>
          <Link href="/dashboard/patients"
            style={{ padding: '11px 24px', background: '#1a1410', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: '#f5f2ee', textDecoration: 'none' }}>
            Voir les patients
          </Link>
        </div>
      )}
    </div>
  )
}
