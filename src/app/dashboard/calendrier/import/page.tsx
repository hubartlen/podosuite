'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface RdvDetecte {
  date: string
  heure: string
  duree: number
  nom: string
  prenom: string
  motif: string
  selected: boolean
  patient_id: string | null
}

function detectType(motif: string): string {
  const m = motif.toLowerCase()
  if (m.includes('suivi')) return 'suivi'
  if (m.includes('bilan')) return 'bilan'
  if (m.includes('semelle')) return 'semelles'
  if (m.includes('urgence')) return 'urgence'
  return 'consultation'
}

export default function ImportRdvPage() {
  const [etape, setEtape] = useState<'upload' | 'review' | 'done'>('upload')
  const [rdvs, setRdvs] = useState<RdvDetecte[]>([])
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

        const res = await fetch('/api/import-rdv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()

        if (data.rendez_vous?.length > 0) {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          const { data: existants } = await supabase
            .from('patients')
            .select('id, nom, prenom')
            .eq('praticien_id', session!.user.id)

          const rdvsAvecPatients: RdvDetecte[] = data.rendez_vous.map((r: any) => {
            const match = existants?.find(
              p => p.nom.toLowerCase() === r.nom.toLowerCase() &&
                   p.prenom.toLowerCase() === r.prenom.toLowerCase()
            )
            return { ...r, selected: true, patient_id: match?.id ?? null }
          })

          setRdvs(rdvsAvecPatients)
          setEtape('review')
        } else {
          alert('Aucun rendez-vous détecté. Vérifie que le fichier montre bien le planning.')
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

    let count = 0
    for (const r of rdvs.filter(r => r.selected)) {
      const date_heure = new Date(`${r.date}T${r.heure}:00`).toISOString()
      const { error } = await supabase.from('rendez_vous').insert({
        praticien_id: session.user.id,
        patient_id: r.patient_id ?? null,
        date_heure,
        duree: r.duree,
        type: detectType(r.motif),
        notes: r.motif || null,
      })
      if (!error) count++
    }
    setNbImported(count)
    setEtape('done')
    setImporting(false)
  }

  const nbSelectionnes = rdvs.filter(r => r.selected).length

  return (
    <div style={{ padding: '32px 36px', maxWidth: '680px' }}>
      {/* Header */}
      <Link href="/dashboard/calendrier" style={{ fontSize: '13px', color: 'var(--fg-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
        ← Calendrier
      </Link>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: 'var(--fg)', fontWeight: '400', letterSpacing: '-0.01em', marginBottom: '6px' }}>
        Import Doctolib
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--fg-3)', marginBottom: '28px' }}>
        PDF ou capture d'écran — l'IA détecte et importe tes rendez-vous automatiquement.
      </p>

      {etape === 'upload' && (
        <div>
          <div
            onClick={() => document.getElementById('rdv-file-input')?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{ border: '2px dashed var(--line)', borderRadius: '8px', padding: '52px 32px', textAlign: 'center', cursor: 'pointer', background: '#fff', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLElement).style.background = '#fff' }}>
            <input id="rdv-file-input" type="file" accept=".pdf,image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {loading ? (
              <div>
                <div style={{ width: '28px', height: '28px', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{ color: 'var(--fg-2)', fontWeight: '500', fontSize: '14px' }}>Analyse en cours...</p>
                <p style={{ color: 'var(--fg-3)', fontSize: '12px', marginTop: '4px' }}>L'IA lit ton planning Doctolib</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '36px', marginBottom: '14px' }}>↑</div>
                <p style={{ color: 'var(--fg-2)', fontWeight: '500', fontSize: '15px' }}>Dépose ton fichier ici</p>
                <p style={{ color: 'var(--fg-3)', fontSize: '13px', marginTop: '6px' }}>ou clique pour sélectionner</p>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>📸</div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--fg)' }}>Capture d'écran</p>
              <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '4px' }}>App Doctolib iPhone</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>📄</div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--fg)' }}>PDF</p>
              <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '4px' }}>Doctolib web</p>
            </div>
          </div>
        </div>
      )}

      {etape === 'review' && (
        <div>
          {preview && (
            <img src={preview} alt="Planning" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--line)', maxHeight: '160px', objectFit: 'cover', objectPosition: 'top' }} />
          )}

          <div style={{ background: 'var(--bg)', borderRadius: '6px', padding: '12px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--fg-2)', fontWeight: '500' }}>{nbSelectionnes} rendez-vous sélectionné{nbSelectionnes > 1 ? 's' : ''}</p>
            <button
              onClick={() => { const all = rdvs.every(r => r.selected); setRdvs(rs => rs.map(r => ({ ...r, selected: !all }))) }}
              style={{ fontSize: '12px', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Tout sélectionner
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--line)', overflow: 'hidden', marginBottom: '16px' }}>
            {rdvs.map((r, i) => (
              <div key={i}
                onClick={() => setRdvs(rs => rs.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                  borderBottom: i < rdvs.length - 1 ? '1px solid var(--bg)' : 'none',
                  cursor: 'pointer', background: r.selected ? 'var(--surface-2)' : '#fff', transition: 'background 0.1s',
                }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                  border: `2px solid ${r.selected ? 'var(--dark)' : 'var(--line)'}`,
                  background: r.selected ? 'var(--dark)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.selected && <span style={{ color: 'var(--accent)', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--fg)' }}>{r.nom} {r.prenom}</span>
                    {r.patient_id && (
                      <span style={{ fontSize: '11px', background: '#c8b89a22', color: '#9b7d5a', padding: '2px 8px', borderRadius: '6px', fontWeight: '500', border: '1px solid #c8b89a44' }}>
                        Patient connu
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--fg-3)', marginTop: '3px' }}>
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {r.heure} · {r.duree} min
                    {r.motif ? ` · ${r.motif}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleImport} disabled={importing || nbSelectionnes === 0}
              style={{ width: '100%', padding: '14px', background: 'var(--dark)', borderRadius: '8px', border: 'none', fontSize: '14px', color: 'var(--on-dark)', cursor: nbSelectionnes === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: '500', opacity: importing || nbSelectionnes === 0 ? 0.6 : 1 }}>
              {importing ? 'Importation...' : `Importer ${nbSelectionnes} RDV dans le calendrier`}
            </button>
            <button onClick={() => { setEtape('upload'); setPreview(null); setRdvs([]) }}
              style={{ width: '100%', padding: '12px', background: 'var(--surface-3)', borderRadius: '8px', border: 'none', fontSize: '13px', color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Recommencer
            </button>
          </div>
        </div>
      )}

      {etape === 'done' && (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--dark)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', color: 'var(--accent)' }}>
            ✓
          </div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--fg)', fontWeight: '400', marginBottom: '8px' }}>
            {nbImported} RDV importé{nbImported > 1 ? 's' : ''}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--fg-3)', marginBottom: '28px' }}>
            Les rendez-vous ont été ajoutés à ton calendrier.
          </p>
          <Link href="/dashboard/calendrier" style={{ padding: '12px 28px', background: 'var(--dark)', borderRadius: '8px', fontSize: '14px', color: 'var(--on-dark)', textDecoration: 'none', fontWeight: '500' }}>
            Voir le calendrier
          </Link>
        </div>
      )}
    </div>
  )
}
