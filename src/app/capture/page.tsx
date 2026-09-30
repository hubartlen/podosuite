'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function compresser(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const r = Math.min(1, 1800 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Photo illisible'))), 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('Photo illisible'))
    img.src = URL.createObjectURL(file)
  })
}

function Capture() {
  const sp = useSearchParams()
  const patientId = sp.get('patient') || ''
  const bilanId = sp.get('bilan') || ''
  const [etat, setEtat] = useState<'chargement' | 'deconnecte' | 'introuvable' | 'pret'>('chargement')
  const [patient, setPatient] = useState<any>(null)
  const [uid, setUid] = useState('')
  const [apercus, setApercus] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setEtat('deconnecte'); return }
      setUid(session.user.id)
      const { data } = await supabase.from('patients').select('id, nom, prenom').eq('id', patientId).eq('praticien_id', session.user.id).single()
      if (!data) { setEtat('introuvable'); return }
      setPatient(data); setEtat('pret')
    })()
  }, [patientId])

  const envoyer = async (fichiers: File[]) => {
    if (!fichiers.length) return
    setEnvoi(true); setMessage('')
    const supabase = createClient()
    let ok = 0
    for (const f of fichiers) {
      try {
        const blob = await compresser(f)
        const chemin = uid + '/patients/' + patientId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg'
        const { error } = await supabase.storage.from('bilans-photos').upload(chemin, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { error: e2 } = await supabase.from('photos').insert({ praticien_id: uid, patient_id: patientId, bilan_id: bilanId || null, chemin })
        if (e2) throw e2
        setApercus(a => [URL.createObjectURL(blob), ...a])
        ok++
      } catch (e: any) { setMessage('Erreur : ' + (e?.message || 'envoi impossible')) }
    }
    setEnvoi(false)
    if (ok) setMessage(ok + ' photo' + (ok > 1 ? 's envoyées' : ' envoyée') + ', elle' + (ok > 1 ? 's apparaissent' : ' apparaît') + ' sur l\'ordinateur.')
  }
  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => { const f = Array.from(e.target.files || []); e.target.value = ''; envoyer(f) }

  const page: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }
  const bouton: React.CSSProperties = { display: 'block', textAlign: 'center', fontSize: 17, fontWeight: 600, padding: '20px', borderRadius: 8, cursor: 'pointer' }

  if (etat === 'chargement') return <div style={{ ...page, alignItems: 'center', justifyContent: 'center' }}>Chargement…</div>
  if (etat === 'deconnecte') return (
    <div style={{ ...page, padding: 24, justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <p style={{ fontSize: 17, margin: 0 }}>Connecte-toi une première fois à PODian sur ce téléphone, puis scanne à nouveau le QR code.</p>
      <a href="/auth/login" style={{ ...bouton, background: 'var(--dark)', color: 'var(--on-dark)', textDecoration: 'none' }}>Se connecter</a>
    </div>
  )
  if (etat === 'introuvable') return <div style={{ ...page, padding: 24, justifyContent: 'center', textAlign: 'center' }}>Patient introuvable sur ce compte.</div>

  return (
    <div style={page}>
      <header style={{ background: 'var(--dark)', color: 'var(--on-dark)', padding: '22px 20px' }}>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{bilanId ? 'Photo pour le bilan de' : 'Photo pour le dossier de'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginTop: 2 }}>{patient?.prenom} {patient?.nom}</div>
      </header>
      <main style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ ...bouton, background: 'var(--accent)', color: 'var(--accent-fg)', opacity: envoi ? 0.6 : 1 }}>
          {envoi ? 'Envoi…' : 'Prendre une photo'}
          <input type="file" accept="image/*" capture="environment" hidden disabled={envoi} onChange={choisir} />
        </label>
        <label style={{ ...bouton, background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--fg-2)', fontWeight: 500 }}>
          Choisir dans la galerie
          <input type="file" accept="image/*" multiple hidden disabled={envoi} onChange={choisir} />
        </label>
        {message && <p aria-live="polite" style={{ margin: '4px 0', fontSize: 15, textAlign: 'center' }}>{message}</p>}
        {apercus.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {apercus.map(u => <img key={u} src={u} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />)}
          </div>
        )}
      </main>
    </div>
  )
}

export default function Page() {
  return <Suspense><Capture /></Suspense>
}
