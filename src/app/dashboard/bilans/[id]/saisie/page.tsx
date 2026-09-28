'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ETAPES, EXAMEN, POSTURE, MARCHE, TYPES_SEMELLES, RECOUVREMENTS, normaliser, etapeRemplie, syntheseProposee } from '@/lib/bilan-v2'
import DocumentBilan, { Pied } from '@/app/dashboard/bilans/document-bilan'

function compresser(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const r = Math.min(1, 1600 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r)
      c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      c.toBlob(b => (b ? resolve(b) : reject(new Error('Compression impossible'))), 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function Pills({ options, value, onChange }: any) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o: string) => (
        <button key={o} type="button" className={`bs-pill${value === o ? ' bs-on' : ''}`} aria-pressed={value === o}
          onClick={() => onChange(value === o ? '' : o)}>{o}</button>
      ))}
    </div>
  )
}

function Champ({ label, value, onChange, placeholder, multi, type = 'text' }: any) {
  return (
    <label className="bs-champ">
      <span>{label}</span>
      {multi
        ? <textarea value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} rows={3} />
        : <input type={type} value={value || ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    </label>
  )
}

const puce: React.CSSProperties = { width: 22, height: 22, borderRadius: '50%', background: 'var(--dark)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }

export default function SaisieBilan() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [charge, setCharge] = useState(false)
  const [d, setD] = useState<any>(null)
  const [date, setDate] = useState('')
  const [cabinetId, setCabinetId] = useState<string | null>(null)
  const [patient, setPatient] = useState<any>(null)
  const [praticien, setPraticien] = useState<any>(null)
  const [cabinets, setCabinets] = useState<any[]>([])
  const [etape, setEtape] = useState('contexte')
  const [etat, setEtat] = useState('')
  const [photosUrls, setPhotosUrls] = useState<Record<string, string>>({})
  const [userId, setUserId] = useState('')
  const pret = useRef(false)
  const [redaction, setRedaction] = useState('')
  const [qr, setQr] = useState('')
  const [qrDepuis, setQrDepuis] = useState('')

  const chargerPhotos = async (chemins: string[]) => {
    if (!chemins.length) return
    const { data } = await createClient().storage.from('bilans-photos').createSignedUrls(chemins, 3600)
    const m: Record<string, string> = {}
    ;(data || []).forEach((x: any) => { if (x.signedUrl && x.path) m[x.path] = x.signedUrl })
    setPhotosUrls(u => ({ ...u, ...m }))
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUserId(session.user.id)
      const { data: b } = await supabase.from('bilans').select('*, patient:patients(*)').eq('id', id).eq('praticien_id', session.user.id).single()
      if (!b) { router.push('/dashboard/patients'); return }
      if (b.format !== 2) { router.replace(`/dashboard/bilans/${id}`); return }
      const [{ data: prat }, { data: cabs }] = await Promise.all([
        supabase.from('praticiens').select('*').eq('id', session.user.id).single(),
        supabase.from('cabinets').select('id, nom, adresse').eq('praticien_id', session.user.id).order('created_at'),
      ])
      const dn = normaliser(b.donnees)
      setD(dn); setDate(b.date_bilan); setCabinetId(b.cabinet_id); setPatient(b.patient); setPraticien(prat); setCabinets(cabs || [])
      chargerPhotos(dn.photos)
      setCharge(true)
    })()
  }, [id])

  useEffect(() => {
    if (!charge) return
    if (!pret.current) { pret.current = true; return }
    setEtat('Modifications en cours…')
    const t = setTimeout(async () => {
      const { error } = await createClient().from('bilans')
        .update({ donnees: d, date_bilan: date, cabinet_id: cabinetId, updated_at: new Date().toISOString() }).eq('id', id)
      setEtat(error ? "Erreur d'enregistrement : " + error.message : 'Enregistré')
    }, 700)
    return () => clearTimeout(t)
  }, [d, date, cabinetId, charge])

  useEffect(() => {
    if (!qrDepuis) return
    const t = setInterval(async () => {
      const { data } = await createClient().from('photos').select('chemin, created_at').eq('bilan_id', id).gt('created_at', qrDepuis).order('created_at')
      if (data && data.length) {
        setQrDepuis(data[data.length - 1].created_at)
        const chemins = data.map((x: any) => x.chemin)
        setD((prev: any) => ({ ...prev, photos: [...prev.photos, ...chemins.filter((c: string) => !prev.photos.includes(c))] }))
        chargerPhotos(chemins)
        setEtat(chemins.length + ' photo(s) reçue(s) du téléphone')
      }
    }, 3000)
    return () => clearInterval(t)
  }, [qrDepuis])

  const maj = (chemin: string, valeur: any) => setD((prev: any) => {
    const n = structuredClone(prev)
    const k = chemin.split('.')
    let o = n
    for (let i = 0; i < k.length - 1; i++) { o[k[i]] = o[k[i]] ?? {}; o = o[k[i]] }
    o[k[k.length - 1]] = valeur
    return n
  })

  if (!charge || !d) return <div style={{ padding: 40, color: 'var(--fg-3)', fontFamily: 'Inter, sans-serif' }}>Chargement du bilan…</div>

  const index = Math.max(0, ETAPES.findIndex(e => e.cle === etape))
  const numeros = d.motif.douleurs.map((p: any, i: number) => ({ ...p, n: i + 1 }))
  const cabinet = cabinets.find(c => c.id === cabinetId)
  const photos = d.photos.map((p: string) => photosUrls[p]).filter(Boolean)

  const ajouterDouleur = (cote: 'G' | 'D', e: any) => {
    const svg = e.currentTarget as SVGSVGElement
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const p = pt.matrixTransform(ctm.inverse())
    maj('motif.douleurs', [...d.motif.douleurs, { pied: cote, x: Math.round(p.x), y: Math.round(p.y), zone: '', moment: '', eva: 5 }])
  }
  const majDouleur = (i: number, champ: string, v: any) => setD((prev: any) => { const n = structuredClone(prev); n.motif.douleurs[i][champ] = v; return n })
  const retirerDouleur = (i: number) => setD((prev: any) => { const n = structuredClone(prev); n.motif.douleurs.splice(i, 1); return n })

  const toutNormal = (cote: 'G' | 'D') => setD((prev: any) => {
    const n = structuredClone(prev)
    EXAMEN.forEach(c => { n.examen[c.cle] = { ...(n.examen[c.cle] || {}), [cote]: c.options[0], [cote === 'G' ? 'precG' : 'precD']: '' } })
    return n
  })

  const ajouterPhotos = async (fichiers: File[]) => {
    const supabase = createClient()
    const nouveaux: string[] = []
    setEtat('Envoi des photos…')
    for (const f of fichiers) {
      try {
        const blob = await compresser(f)
        const chemin = `${userId}/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`
        const { error } = await supabase.storage.from('bilans-photos').upload(chemin, blob, { contentType: 'image/jpeg' })
        if (error) { setEtat('Erreur photo : ' + error.message); continue }
        nouveaux.push(chemin)
        await supabase.from('photos').insert({ praticien_id: userId, patient_id: patient?.id, bilan_id: id, chemin })
      } catch { setEtat('Photo illisible') }
    }
    if (nouveaux.length) { maj('photos', [...d.photos, ...nouveaux]); chargerPhotos(nouveaux) }
  }
  const retirerPhoto = async (chemin: string) => {
    if (!confirm('Retirer cette photo du bilan ?')) return
    await createClient().storage.from('bilans-photos').remove([chemin])
    await createClient().from('photos').delete().eq('chemin', chemin)
    maj('photos', d.photos.filter((p: string) => p !== chemin))
  }

  const majElement = (i: number, champ: string, v: any) => setD((prev: any) => { const n = structuredClone(prev); n.semelles.elements[i][champ] = v; return n })
  const ajouterElement = () => {
    const lib = prompt('Nom du nouvel élément de semelle')
    if (!lib || !lib.trim()) return
    setD((prev: any) => { const n = structuredClone(prev); n.semelles.elements.push({ cle: 'perso-' + Date.now(), libelle: lib.trim(), G: false, D: false, valeur: '' }); return n })
  }

  const rediger = async (champ: 'synthese' | 'conseils') => {
    if (!etapeRemplie('examen', d) && !etapeRemplie('motif', d) && !etapeRemplie('semelles', d)) { alert("Remplis d'abord au moins le motif, l'examen ou les semelles."); return }
    const actuel = champ === 'synthese' ? d.synthese : d.semelles.conseils
    if (actuel.trim() && !confirm('Remplacer le texte actuel par une nouvelle proposition ?')) return
    setRedaction(champ)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée, reconnecte-toi')
      const naissance = patient?.date_naissance ? new Date(patient.date_naissance) : null
      const age = naissance ? Math.floor((Date.now() - naissance.getTime()) / (365.25 * 24 * 3600 * 1000)) : null
      const res = await fetch('/api/bilan-synthese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ donnees: d, age, sexe: patient?.sexe || null }),
      })
      const r = await res.json()
      if (!res.ok) throw new Error(r.error || 'Erreur')
      if (champ === 'synthese' && r.synthese) maj('synthese', r.synthese)
      if (champ === 'conseils' && r.conseils) maj('semelles.conseils', r.conseils)
    } catch (e: any) {
      alert('Rédaction impossible : ' + (e?.message || ''))
    }
    setRedaction('')
  }

  const choixSimples = (liste: any[], cleData: string, cleRem: string) => (
    <>
      <div className="bs-carte" style={{ gap: 0 }}>
        {liste.map(c => (
          <div key={c.cle} className="bs-ligne" style={{ gridTemplateColumns: '170px minmax(0, 1fr)' }}>
            <div className="bs-lib">{c.libelle}</div>
            <Pills options={c.options} value={d[cleData][c.cle] || ''} onChange={(v: string) => maj(`${cleData}.${c.cle}`, v)} />
          </div>
        ))}
      </div>
      <div className="bs-carte"><Champ label="Remarques" multi value={d[cleRem]} onChange={(v: string) => maj(cleRem, v)} placeholder="Observations libres, reprises telles quelles sur le document" /></div>
    </>
  )

  const contenu = () => {
    switch (etape) {
      case 'contexte': return (
        <div className="bs-carte">
          <div className="bs-grille">
            <label className="bs-champ"><span>Date du bilan</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
            <div className="bs-champ"><span>Cabinet</span>
              <Pills options={cabinets.map(c => c.nom)} value={cabinet?.nom || ''} onChange={(nom: string) => setCabinetId(cabinets.find(c => c.nom === nom)?.id ?? null)} />
            </div>
            <Champ label="Profession" value={d.contexte.profession} onChange={(v: string) => maj('contexte.profession', v)} placeholder="Employé de bureau, poste assis" />
            <Champ label="Activité physique" value={d.contexte.activite} onChange={(v: string) => maj('contexte.activite', v)} placeholder="Natation, 2 fois par semaine" />
            <Champ label="Chaussage habituel" value={d.contexte.chaussage} onChange={(v: string) => maj('contexte.chaussage', v)} placeholder="Baskets, chaussures de sécurité…" />
            <Champ label="Pointure" value={d.contexte.pointure} onChange={(v: string) => maj('contexte.pointure', v)} placeholder="39" />
            <Champ label="Médecin prescripteur" value={d.contexte.medecin} onChange={(v: string) => maj('contexte.medecin', v)} placeholder="Dr Nom, ville" />
          </div>
        </div>
      )
      case 'motif': return (
        <>
          <div className="bs-carte">
            <Champ label="Motif de consultation" multi value={d.motif.texte} onChange={(v: string) => maj('motif.texte', v)} placeholder="Douleurs du médio-pied droit à la marche prolongée" />
          </div>
          <div className="bs-carte">
            <div className="bs-petit">Zones douloureuses : clique sur le pied, à l'endroit de la douleur</div>
            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                {(['G', 'D'] as const).map(c => (
                  <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Pied cote={c} taille={110} points={numeros.filter((p: any) => p.pied === c)} onClick={(e: any) => ajouterDouleur(c, e)} />
                    <span className="bs-petit">{c === 'G' ? 'Gauche' : 'Droit'}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {numeros.length === 0 && <p className="bs-petit" style={{ margin: 0 }}>Aucune zone marquée pour l'instant.</p>}
                {numeros.map((p: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 96px 28px', gap: 8, alignItems: 'center' }}>
                    <span style={puce}>{p.n}</span>
                    <input className="bs-mini" value={p.zone} placeholder="Zone (bord interne…)" onChange={e => majDouleur(i, 'zone', e.target.value)} />
                    <input className="bs-mini" value={p.moment} placeholder="Quand (à la marche…)" onChange={e => majDouleur(i, 'moment', e.target.value)} />
                    <label className="bs-petit" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>EVA
                      <input type="number" min={0} max={10} className="bs-mini" style={{ width: 52 }} value={p.eva}
                        onChange={e => majDouleur(i, 'eva', e.target.value === '' ? '' : Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))} />
                    </label>
                    <button type="button" className="bs-x" aria-label="Retirer cette zone" onClick={() => retirerDouleur(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bs-carte">
            <div className="bs-grille">
              <Champ label="Ancienneté" value={d.motif.anciennete} onChange={(v: string) => maj('motif.anciennete', v)} placeholder="Depuis 6 mois" />
              <Champ label="Suivis en cours" value={d.motif.suivis} onChange={(v: string) => maj('motif.suivis', v)} placeholder="Ostéopathe 3 fois par an" />
              <Champ label="Traitements" value={d.motif.traitements} onChange={(v: string) => maj('motif.traitements', v)} />
              <Champ label="Semelles antérieures" value={d.motif.semelles_anterieures} onChange={(v: string) => maj('motif.semelles_anterieures', v)} placeholder="Il y a 5 ans, avec soulagement" />
            </div>
            <Champ label="Antécédents" multi value={d.motif.antecedents} onChange={(v: string) => maj('motif.antecedents', v)} placeholder="Traumatiques, chirurgicaux, médicaux" />
          </div>
        </>
      )
      case 'examen': return (
        <>
          <div className="bs-carte" style={{ gap: 0 }}>
            <div className="bs-ligne" style={{ fontSize: 12.5, color: 'var(--fg-3)', paddingTop: 0 }}>
              <div></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Pied gauche<button type="button" className="bs-lien" onClick={() => toutNormal('G')}>Tout normal</button></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Pied droit<button type="button" className="bs-lien" onClick={() => toutNormal('D')}>Tout normal</button></div>
            </div>
            {EXAMEN.map(c => {
              const e = d.examen[c.cle] || {}
              return (
                <div key={c.cle} className="bs-ligne">
                  <div className="bs-lib">{c.libelle}</div>
                  {(['G', 'D'] as const).map(s => {
                    const pk = s === 'G' ? 'precG' : 'precD'
                    return (
                      <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Pills options={c.options} value={e[s] || ''} onChange={(v: string) => maj(`examen.${c.cle}.${s}`, v)} />
                        {e[s] && e[s] !== c.options[0] && (
                          <input className="bs-mini" placeholder="Précision (degré, localisation…)" value={e[pk] || ''} onChange={ev => maj(`examen.${c.cle}.${pk}`, ev.target.value)} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="bs-carte">
            <Champ label="Remarques" multi value={d.examen_remarques} onChange={(v: string) => maj('examen_remarques', v)} placeholder="Observations libres, reprises telles quelles sur le document" />
            <div>
              <div className="bs-petit" style={{ marginBottom: 8 }}>Photos (podoscope, empreintes, chaussures)</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {d.photos.map((p: string) => (
                  <div key={p} style={{ position: 'relative' }}>
                    {photosUrls[p]
                      ? <img src={photosUrls[p]} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)', display: 'block' }} />
                      : <div style={{ width: 120, height: 120, borderRadius: 10, background: 'var(--bg)' }} />}
                    <button type="button" className="bs-x" style={{ position: 'absolute', top: 4, right: 4, background: '#fff' }} aria-label="Retirer la photo" onClick={() => retirerPhoto(p)}>✕</button>
                  </div>
                ))}
                <button type="button" className="bs-depot" onClick={async () => {
                  const url = window.location.origin + '/capture?patient=' + patient?.id + '&bilan=' + id
                  const QR = (await import('qrcode')).default
                  setQr(await QR.toDataURL(url, { margin: 1, width: 480 }))
                  setQrDepuis(new Date(Date.now() - 60000).toISOString())
                }}>Avec le téléphone</button>
                <label className="bs-depot">+ Ajouter
                  <input type="file" accept="image/*" multiple hidden onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; ajouterPhotos(f) }} />
                </label>
              </div>
            </div>
          </div>
        </>
      )
      case 'posture': return choixSimples(POSTURE, 'posture', 'posture_remarques')
      case 'marche': return choixSimples(MARCHE, 'marche', 'marche_remarques')
      case 'synthese': return (
        <div className="bs-carte">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="bs-petit">Ta conclusion, telle qu'elle apparaîtra sur le document.</span>
            <button type="button" className="bs-bouton" disabled={!!redaction} onClick={() => rediger('synthese')}>{redaction === 'synthese' ? 'Rédaction en cours…' : 'Rédiger la synthèse'}</button>
          </div>
          <label className="bs-champ"><textarea style={{ minHeight: 240 }} value={d.synthese} onChange={e => maj('synthese', e.target.value)} placeholder="Ce que tu retiens du bilan et l'objectif du traitement" /></label>
        </div>
      )
      case 'semelles': return (
        <>
          <div className="bs-carte">
            <div className="bs-grille">
              <Champ label="Gabarit" value={d.semelles.gabarit} onChange={(v: string) => maj('semelles.gabarit', v)} placeholder="39" />
              <div className="bs-champ"><span>Type de semelle</span><Pills options={TYPES_SEMELLES} value={d.semelles.type} onChange={(v: string) => maj('semelles.type', v)} /></div>
              <div className="bs-champ"><span>Recouvrement</span><Pills options={RECOUVREMENTS} value={d.semelles.recouvrement} onChange={(v: string) => maj('semelles.recouvrement', v)} /></div>
            </div>
          </div>
          <div className="bs-carte" style={{ gap: 0 }}>
            <div className="bs-ligne" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 80px 130px', fontSize: 12.5, color: 'var(--fg-3)', paddingTop: 0 }}>
              <div>Élément</div><div style={{ textAlign: 'center' }}>Gauche</div><div style={{ textAlign: 'center' }}>Droit</div><div>Précision</div>
            </div>
            {d.semelles.elements.map((el: any, i: number) => (
              <div key={el.cle} className="bs-ligne" style={{ gridTemplateColumns: 'minmax(0, 1fr) 80px 80px 130px', alignItems: 'center', padding: '8px 0' }}>
                <div style={{ fontWeight: el.G || el.D ? 600 : 400 }}>{el.libelle}</div>
                {(['G', 'D'] as const).map(s => (
                  <div key={s} style={{ textAlign: 'center' }}>
                    <button type="button" className={`bs-pill${el[s] ? ' bs-on' : ''}`} aria-pressed={!!el[s]} style={{ minWidth: 44 }} onClick={() => majElement(i, s, !el[s])}>{s}</button>
                  </div>
                ))}
                <input className="bs-mini" value={el.valeur || ''} placeholder="ex. 4 mm" disabled={!el.G && !el.D} onChange={e => majElement(i, 'valeur', e.target.value)} />
              </div>
            ))}
            <button type="button" className="bs-lien" style={{ marginTop: 12, alignSelf: 'flex-start' }} onClick={ajouterElement}>+ Ajouter un élément</button>
          </div>
          <div className="bs-carte">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="bs-petit">Conseils personnalisés pour le patient, un par ligne</span>
              <button type="button" className="bs-bouton" disabled={!!redaction} onClick={() => rediger('conseils')}>{redaction === 'conseils' ? 'Rédaction en cours…' : 'Proposer des conseils'}</button>
            </div>
            <label className="bs-champ"><textarea style={{ minHeight: 170 }} value={d.semelles.conseils} onChange={e => maj('semelles.conseils', e.target.value)} placeholder="Chaussage, exercices, port des semelles, quand revenir" /></label>
            <div className="bs-grille">
              <Champ label="Port conseillé" value={d.semelles.port} onChange={(v: string) => maj('semelles.port', v)} placeholder="Progressif, 2 h le premier jour" />
              <Champ label="Date de contrôle" type="date" value={d.semelles.controle} onChange={(v: string) => maj('semelles.controle', v)} />
            </div>
          </div>
        </>
      )
    }
    return null
  }

  return (
    <div className="bs">
      <style>{`
        .bs{--ink:var(--dark);--sable:var(--accent);--lin:var(--bg);--grege:var(--line);--taupe:var(--fg-3);--brun:var(--fg-2);display:grid;grid-template-columns:230px minmax(0,1fr) 360px;min-height:100vh;font-family:Inter,sans-serif;color:var(--ink);font-size:14px}
        .bs *:focus-visible{outline:2px solid var(--sable);outline-offset:2px}
        .bs-etapes{position:sticky;top:0;align-self:start;height:100vh;box-sizing:border-box;padding:28px 16px 24px 24px;border-right:1px solid var(--grege);display:flex;flex-direction:column;gap:4px}
        .bs-patient{font-family:'Playfair Display',Georgia,serif;font-size:19px;line-height:1.2;margin-bottom:14px}
        .bs-etape{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:10px;border:1px solid transparent;background:none;font:inherit;font-size:14px;color:var(--brun);cursor:pointer;text-align:left}
        .bs-etape:hover{background:#fff}
        .bs-etape[aria-current=step]{background:#fff;border-color:var(--grege);color:var(--ink);font-weight:600}
        .bs-num{width:22px;height:22px;border-radius:50%;border:1px solid var(--sable);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;box-sizing:border-box}
        .bs-num[data-ok=true]{background:var(--sable);border-color:var(--sable);color:var(--ink)}
        .bs-etape[aria-current=step] .bs-num{background:var(--ink);border-color:var(--ink);color:var(--lin)}
        .bs-centre{padding:24px 32px 48px;display:flex;flex-direction:column;gap:18px;min-width:0}
        .bs-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .bs-titre{font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:400;margin:4px 0 2px}
        .bs-carte{background:#fff;border:1px solid var(--grege);border-radius:16px;padding:20px 24px;display:flex;flex-direction:column;gap:16px}
        .bs-grille{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}
        .bs-champ{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--taupe)}
        .bs-champ input,.bs-champ textarea{font:inherit;font-size:14px;color:var(--ink);padding:10px 12px;border:1px solid var(--grege);border-radius:10px;background:#fff;outline:none;box-sizing:border-box;width:100%}
        .bs-champ textarea{resize:vertical;min-height:76px;line-height:1.5}
        .bs-champ input:focus,.bs-champ textarea:focus,.bs-mini:focus{border-color:var(--sable)}
        .bs-mini{font:inherit;font-size:13px;padding:8px 10px;border:1px solid var(--grege);border-radius:9px;width:100%;box-sizing:border-box;outline:none;color:var(--ink);background:#fff}
        .bs-mini:disabled{background:var(--lin);color:#b3a995}
        .bs-pill{font:inherit;font-size:13px;padding:7px 12px;border-radius:9px;border:1px solid var(--grege);background:#fff;color:var(--brun);cursor:pointer}
        .bs-pill:hover{border-color:var(--sable)}
        .bs-on,.bs-on:hover{background:var(--ink);border-color:var(--ink);color:var(--lin)}
        .bs-ligne{display:grid;grid-template-columns:170px minmax(0,1fr) minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--surface-3);align-items:start}
        .bs-ligne:first-child{border-top:none}
        .bs-lib{padding-top:7px;font-weight:500}
        .bs-lien{border:none;background:none;font:inherit;font-size:12.5px;color:var(--brun);text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:4px}
        .bs-x{border:1px solid var(--grege);background:none;width:28px;height:28px;border-radius:8px;cursor:pointer;color:var(--brun);font-size:12px}
        .bs-x:hover{border-color:var(--sable);color:var(--ink)}
        .bs-depot{width:120px;height:120px;border:1.5px dashed var(--sable);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--brun);cursor:pointer;font-size:13px;font-weight:500}
        .bs-depot:hover{background:var(--lin)}
        .bs-bouton{font:inherit;font-size:13px;padding:10px 16px;border-radius:10px;border:1px solid var(--grege);background:#fff;color:var(--brun);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
        .bs-bouton:hover{border-color:var(--sable)}
        .bs-bouton:disabled{opacity:.4;cursor:default}
        .bs-principal{font:inherit;font-size:13px;font-weight:600;padding:11px 18px;border-radius:10px;border:none;background:var(--ink);color:var(--lin);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
        .bs-apercu{position:sticky;top:0;align-self:start;height:100vh;box-sizing:border-box;border-left:1px solid var(--grege);background:var(--line-2);padding:24px 18px;display:flex;flex-direction:column;gap:10px}
        .bs-feuille{overflow:auto;flex:1}
        .bs-feuille > .podian-doc{zoom:.4;box-shadow:0 2px 10px rgba(26,20,16,.18)}
        .bs-petit{font-size:12.5px;color:var(--taupe)}
        @media (max-width:1250px){.bs{grid-template-columns:210px minmax(0,1fr)}.bs-apercu{display:none}}
        @media (max-width:820px){.bs{grid-template-columns:1fr}.bs-etapes{position:static;height:auto;flex-direction:row;flex-wrap:wrap;border-right:none;border-bottom:1px solid var(--grege)}.bs-ligne{grid-template-columns:1fr!important}.bs-grille{grid-template-columns:1fr}}
      `}</style>

      <nav className="bs-etapes" aria-label="Étapes du bilan">
        <div className="bs-patient">{patient?.prenom} {patient?.nom}</div>
        {ETAPES.map((e, i) => (
          <button key={e.cle} type="button" className="bs-etape" aria-current={etape === e.cle ? 'step' : undefined} onClick={() => setEtape(e.cle)}>
            <span className="bs-num" data-ok={etapeRemplie(e.cle, d)}>{etapeRemplie(e.cle, d) && etape !== e.cle ? '✓' : i + 1}</span>{e.titre}
          </button>
        ))}
        <p className="bs-petit" style={{ marginTop: 'auto', lineHeight: 1.5 }}>Tout s'enregistre au fil de la saisie. Tu peux sauter des étapes et revenir quand tu veux.</p>
      </nav>

      <main className="bs-centre">
        <div className="bs-tete">
          <div>
            <Link href={`/dashboard/patients/${patient?.id}`} className="bs-petit" style={{ textDecoration: 'none' }}>← Dossier de {patient?.prenom} {patient?.nom}</Link>
            <h1 className="bs-titre">{ETAPES[index].titre}</h1>
            <div className="bs-petit" aria-live="polite">{etat || 'Enregistrement automatique'}</div>
          </div>
          <a className="bs-principal" href={`/dashboard/bilans/${id}/document`} target="_blank" rel="noopener">Ouvrir le document</a>
        </div>
        {contenu()}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" className="bs-bouton" disabled={index === 0} onClick={() => setEtape(ETAPES[index - 1].cle)}>Étape précédente</button>
          {index < ETAPES.length - 1
            ? <button type="button" className="bs-principal" onClick={() => setEtape(ETAPES[index + 1].cle)}>Suivant : {ETAPES[index + 1].titre.toLowerCase()}</button>
            : <a className="bs-principal" href={`/dashboard/bilans/${id}/document`} target="_blank" rel="noopener">Ouvrir le document</a>}
        </div>
      </main>

      {qr && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setQr('')}>
          <div role="dialog" aria-label="Photo avec le téléphone" style={{ background: '#fff', borderRadius: 18, padding: 28, width: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
            <strong style={{ fontSize: 17 }}>Scanne avec ton téléphone</strong>
            <img src={qr} alt="QR code vers l'appareil photo" style={{ width: 240, height: 240, margin: '0 auto' }} />
            <p className="bs-petit" style={{ margin: 0 }}>Prends la photo sur le téléphone : elle arrive ici toute seule, dans l'étape Examen.</p>
            <button type="button" className="bs-bouton" style={{ alignSelf: 'center' }} onClick={() => setQr('')}>Fermer</button>
          </div>
        </div>
      )}

      <aside className="bs-apercu">
        <div className="bs-petit">Le document, en direct</div>
        <div className="bs-feuille">
          <DocumentBilan d={d} patient={patient} praticien={praticien} cabinet={cabinet} date={date} photos={photos} actif={etape} />
        </div>
      </aside>
    </div>
  )
}
