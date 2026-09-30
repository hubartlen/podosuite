'use client'
import { useEffect, useRef, useState } from 'react'
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

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const CSS = `
.ph{display:flex;flex-direction:column;gap:16px;font-family:Inter,sans-serif;color:var(--fg)}
.ph-barre{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.ph-principal{font:inherit;font-size:14px;font-weight:600;padding:12px 18px;border-radius:8px;border:none;background:var(--accent);color:var(--accent-fg);cursor:pointer}
.ph-bouton{font:inherit;font-size:14px;padding:12px 16px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
.ph-bouton:hover{border-color:var(--accent)}
.ph-petit{font-size:13px;color:var(--fg-3)}
.ph-vide{padding:30px 0;text-align:center;color:var(--fg-3);font-size:14px;margin:0}
.ph-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.ph-vignette{position:relative;padding:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--surface-3);aspect-ratio:1;cursor:pointer}
.ph-vignette img{width:100%;height:100%;object-fit:cover;display:block}
.ph-date{position:absolute;left:8px;bottom:8px;font-size:11.5px;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:3px 7px}
.ph-voile{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
.ph-boite{background:var(--surface);border-radius:8px;overflow:hidden;max-width:min(1000px,100%);max-height:100%;display:flex;flex-direction:column}
.ph-boite img{max-height:72vh;max-width:100%;object-fit:contain;background:#111;display:block}
.ph-infos{display:flex;gap:10px;align-items:center;padding:14px;flex-wrap:wrap}
.ph-champ{flex:1;min-width:180px;font:inherit;font-size:14px;padding:10px 12px;border:1px solid var(--line);border-radius:6px;color:var(--fg);background:var(--surface)}
.ph-qr{background:var(--surface);border-radius:8px;padding:28px;width:340px;max-width:100%;text-align:center;display:flex;flex-direction:column;gap:12px}
.ph-qr img{width:240px;height:240px;margin:0 auto}
@media (max-width:760px){.ph-ordi{display:none}.ph-principal,.ph-bouton{flex:1;text-align:center}}
`

export default function PhotosPatient({ patientId, bilanId }: { patientId: string; bilanId?: string }) {
  const [uid, setUid] = useState('')
  const [photos, setPhotos] = useState<any[]>([])
  const [envoi, setEnvoi] = useState('')
  const [ouverte, setOuverte] = useState<any>(null)
  const [qr, setQr] = useState('')
  const cache = useRef<Record<string, string>>({})

  const charger = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('photos').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
    const liste = data || []
    const manquants = liste.map((p: any) => p.chemin).filter((c: string) => !cache.current[c])
    if (manquants.length) {
      const { data: s } = await supabase.storage.from('bilans-photos').createSignedUrls(manquants, 3600)
      ;(s || []).forEach((x: any) => { if (x.path && x.signedUrl) cache.current[x.path] = x.signedUrl })
    }
    setPhotos(liste)
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await createClient().auth.getSession()
      if (session) setUid(session.user.id)
    })()
    charger()
    const t = setInterval(() => { if (document.visibilityState === 'visible') charger() }, 5000)
    return () => clearInterval(t)
  }, [patientId])

  const envoyer = async (fichiers: File[]) => {
    if (!uid || !fichiers.length) return
    const supabase = createClient()
    for (let i = 0; i < fichiers.length; i++) {
      setEnvoi('Envoi de la photo ' + (i + 1) + '/' + fichiers.length + '…')
      try {
        const blob = await compresser(fichiers[i])
        const chemin = uid + '/patients/' + patientId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg'
        const { error } = await supabase.storage.from('bilans-photos').upload(chemin, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { error: e2 } = await supabase.from('photos').insert({ praticien_id: uid, patient_id: patientId, bilan_id: bilanId || null, chemin })
        if (e2) throw e2
      } catch (e: any) { setEnvoi('Erreur : ' + (e?.message || 'envoi impossible')); return }
    }
    setEnvoi('')
    charger()
  }

  const enregistrerLegende = async (id: string, legende: string) => {
    await createClient().from('photos').update({ legende: legende || null }).eq('id', id)
    setPhotos(ps => ps.map(p => (p.id === id ? { ...p, legende } : p)))
  }

  const supprimer = async (p: any) => {
    if (!confirm('Supprimer définitivement cette photo ?')) return
    const supabase = createClient()
    await supabase.storage.from('bilans-photos').remove([p.chemin])
    await supabase.from('photos').delete().eq('id', p.id)
    setOuverte(null)
    setPhotos(ps => ps.filter(x => x.id !== p.id))
  }

  const ouvrirQr = async () => {
    const url = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + '/capture?patient=' + patientId + (bilanId ? '&bilan=' + bilanId : '')
    const QR = (await import('qrcode')).default
    setQr(await QR.toDataURL(url, { margin: 1, width: 480 }))
  }

  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => { const f = Array.from(e.target.files || []); e.target.value = ''; envoyer(f) }

  return (
    <div className="ph">
      <style>{CSS}</style>
      <div className="ph-barre">
        <label className="ph-principal">Prendre une photo<input type="file" accept="image/*" capture="environment" hidden onChange={choisir} /></label>
        <label className="ph-bouton">Depuis la galerie<input type="file" accept="image/*" multiple hidden onChange={choisir} /></label>
        <button type="button" className="ph-bouton ph-ordi" onClick={ouvrirQr}>Avec le téléphone</button>
        {envoi && <span className="ph-petit" aria-live="polite">{envoi}</span>}
      </div>

      {photos.length === 0 ? (
        <p className="ph-vide">Aucune photo pour l'instant.</p>
      ) : (
        <div className="ph-grille">
          {photos.map(p => (
            <button key={p.id} type="button" className="ph-vignette" onClick={() => setOuverte(p)} aria-label={'Ouvrir la photo du ' + dateFr(p.created_at)}>
              {cache.current[p.chemin] ? <img src={cache.current[p.chemin]} alt={p.legende || ''} /> : null}
              <span className="ph-date">{dateFr(p.created_at)}{p.bilan_id ? ', bilan' : ''}</span>
            </button>
          ))}
        </div>
      )}

      {ouverte && (
        <div className="ph-voile" onClick={() => setOuverte(null)}>
          <div className="ph-boite" role="dialog" aria-label="Photo" onClick={e => e.stopPropagation()}>
            <img src={cache.current[ouverte.chemin]} alt={ouverte.legende || ''} />
            <div className="ph-infos">
              <input className="ph-champ" value={ouverte.legende || ''} placeholder="Ajouter une légende"
                onChange={e => setOuverte({ ...ouverte, legende: e.target.value })} onBlur={e => enregistrerLegende(ouverte.id, e.target.value)} />
              <span className="ph-petit">{dateFr(ouverte.created_at)}</span>
              <button type="button" className="ph-bouton" onClick={() => supprimer(ouverte)}>Supprimer</button>
              <button type="button" className="ph-principal" onClick={() => setOuverte(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {qr && (
        <div className="ph-voile" onClick={() => setQr('')}>
          <div className="ph-qr" role="dialog" aria-label="Photo avec le téléphone" onClick={e => e.stopPropagation()}>
            <strong style={{ fontSize: 17 }}>Scanne avec ton téléphone</strong>
            <img src={qr} alt="QR code vers l'appareil photo" />
            <p className="ph-petit" style={{ margin: 0 }}>Prends la photo sur le téléphone : elle apparaît ici toute seule.</p>
            <button type="button" className="ph-bouton" style={{ alignSelf: 'center' }} onClick={() => setQr('')}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}
