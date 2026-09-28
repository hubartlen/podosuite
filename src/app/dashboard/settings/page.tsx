'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Cabinet { id?: string; nom: string; adresse: string; retrocession: number | null; tarifs: Tarif[] }
interface Tarif { id?: string; designation: string; prix: number; ordre: number; couleur_doctolib: string | null }

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const welcome = searchParams.get('welcome') === '1'

  const [praticien, setPraticien] = useState({ nom: '', prenom: '', titre: 'Pédicure Podologue DE', email: '', telephone: '', rpps: '', am: '', adresse: '', code_postal: '', ville: '', retrocession: 60 })
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: p } = await supabase.from('praticiens').select('*').eq('id', session.user.id).single()
      if (p) setPraticien({ nom: p.nom || '', prenom: p.prenom || '', titre: p.titre || 'Pédicure Podologue DE', email: p.email || '', telephone: p.telephone || '', rpps: p.rpps || '', am: p.am || '', adresse: p.adresse || '', code_postal: p.code_postal || '', ville: p.ville || '', retrocession: p.retrocession || 60 })

      const { data: cabs } = await supabase.from('cabinets').select('*, tarifs(*)').eq('praticien_id', session.user.id).order('created_at')
      if (cabs) setCabinets(cabs.map((c: any) => ({
        ...c,
        retrocession: c.retrocession ?? null,
        tarifs: (c.tarifs || []).map((t: any) => ({ ...t, couleur_doctolib: t.couleur_doctolib ?? '' })).sort((a: Tarif, b: Tarif) => a.ordre - b.ordre)
      })))

      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    const erreurs: string[] = []

    const { error: errPrat } = await supabase.from('praticiens').upsert({ id: session.user.id, ...praticien, updated_at: new Date().toISOString() })
    if (errPrat) erreurs.push('Profil : ' + errPrat.message)

    // Supprimer en base les cabinets retirés de la liste
    const idsGardes = cabinets.map(c => c.id).filter(Boolean) as string[]
    const { data: existants } = await supabase.from('cabinets').select('id').eq('praticien_id', session.user.id)
    for (const e of existants || []) {
      if (!idsGardes.includes(e.id)) {
        await supabase.from('tarifs').delete().eq('cabinet_id', e.id)
        const { error } = await supabase.from('cabinets').delete().eq('id', e.id)
        if (error) erreurs.push('Suppression cabinet : ' + error.message)
      }
    }

    const cabinetsAJour: Cabinet[] = []
    for (const cab of cabinets) {
      const champs = { nom: cab.nom, adresse: cab.adresse, retrocession: cab.retrocession }
      let cabId = cab.id
      if (!cabId) {
        const { data, error } = await supabase.from('cabinets').insert({ praticien_id: session.user.id, ...champs }).select().single()
        if (error) erreurs.push(`Cabinet ${cab.nom} : ${error.message}`)
        cabId = data?.id
      } else {
        const { error } = await supabase.from('cabinets').update(champs).eq('id', cabId)
        if (error) erreurs.push(`Cabinet ${cab.nom} : ${error.message}`)
      }
      if (cabId) {
        await supabase.from('tarifs').delete().eq('cabinet_id', cabId)
        if (cab.tarifs.length > 0) {
          const { error } = await supabase.from('tarifs').insert(cab.tarifs.map((t, i) => ({ cabinet_id: cabId, designation: t.designation, prix: t.prix, ordre: i, couleur_doctolib: t.couleur_doctolib || null })))
          if (error) erreurs.push(`Tarifs ${cab.nom} : ${error.message}`)
        }
      }
      cabinetsAJour.push(cabId ? { ...cab, id: cabId } : cab)
    }
    setCabinets(cabinetsAJour)
    setSaving(false)

    if (erreurs.length > 0) { alert("Erreur à l'enregistrement :\n" + erreurs.join('\n')); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addCabinet = () => setCabinets(c => [...c, { nom: '', adresse: '', retrocession: 100, tarifs: [] }])
  const removeCabinet = (i: number) => {
    if (!confirm('Supprimer ce cabinet et ses tarifs ? La suppression sera effective après avoir cliqué sur Enregistrer.')) return
    setCabinets(c => c.filter((_, idx) => idx !== i))
  }
  const updateCabinet = (i: number, k: string, v: any) => setCabinets(c => c.map((cab, idx) => idx === i ? { ...cab, [k]: v } : cab))
  const addTarif = (ci: number) => setCabinets(c => c.map((cab, i) => i === ci ? { ...cab, tarifs: [...cab.tarifs, { designation: '', prix: 0, ordre: cab.tarifs.length, couleur_doctolib: '' }] } : cab))
  const removeTarif = (ci: number, ti: number) => setCabinets(c => c.map((cab, i) => i === ci ? { ...cab, tarifs: cab.tarifs.filter((_, idx) => idx !== ti) } : cab))
  const updateTarif = (ci: number, ti: number, k: string, v: any) => setCabinets(c => c.map((cab, i) => i === ci ? { ...cab, tarifs: cab.tarifs.map((t, j) => j === ti ? { ...t, [k]: v } : t) } : cab))

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: '#fff', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '14px', color: '#1a1410', outline: 'none', fontFamily: 'Inter, sans-serif' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#9b8f7e', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }
  const sectionStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e2dbd0', borderRadius: '14px', padding: '24px', marginBottom: '20px' }
  const sectionTitle: React.CSSProperties = { fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#1a1410', fontWeight: '400', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f0ebe4' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div style={{ width: '28px', height: '28px', border: '2px solid #e2dbd0', borderTopColor: '#c8b89a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <div style={{ padding: '32px 36px', maxWidth: '800px' }}>
      {welcome && (
        <div style={{ background: '#f0ebe4', border: '1px solid #c8b89a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', fontSize: '14px', color: '#4a3f35' }}>
          Bienvenue sur PODian ! Complète ton profil pour personnaliser tes bilans et factures.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#1a1410', fontWeight: '400' }}>Réglages</h1>
          <p style={{ fontSize: '13px', color: '#9b8f7e', marginTop: '4px' }}>Ton profil et tes cabinets</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '11px 22px', background: '#1a1410', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', color: '#f5f2ee', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.7 : 1 }}>
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Identité */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Identité du praticien</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[['nom', 'Nom', 'Le Neué'], ['prenom', 'Prénom', 'Arthur'], ['titre', 'Titre', 'Pédicure Podologue DE'], ['telephone', 'Téléphone', '06 89 40 51 05'], ['email', 'Email', 'contact@cabinet.fr'], ['rpps', 'N° RPPS', '10111902820'], ['am', 'N° AM', '938002623']].map(([key, label, ph]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input value={(praticien as any)[key]} onChange={e => setPraticien(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* Adresse */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Adresse principale</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
          {[['adresse', 'Adresse', '4 rue saint Just'], ['code_postal', 'Code postal', '93210'], ['ville', 'Ville', 'La Plaine Saint Denis']].map(([key, label, ph]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input value={(praticien as any)[key]} onChange={e => setPraticien(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      {/* Rétrocession */}
      <div style={sectionStyle}>
        <h2 style={sectionTitle}>Partage des honoraires</h2>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          <div style={{ flex:1 }}>
            <label style={labelStyle}>Votre part par défaut (%)</label>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <input
                type="range" min={0} max={100} step={5}
                value={praticien.retrocession}
                onChange={e => setPraticien(p => ({ ...p, retrocession: parseInt(e.target.value) }))}
                style={{ flex:1, accentColor:'#1a1410' }}
              />
              <div style={{ background:'#1a1410', color:'#f5f2ee', borderRadius:'10px', padding:'8px 16px', fontSize:'18px', fontWeight:'500', minWidth:'70px', textAlign:'center', fontFamily:'Playfair Display, serif' }}>
                {praticien.retrocession}%
              </div>
            </div>
            <p style={{ fontSize:'12px', color:'#9b8f7e', marginTop:'8px' }}>
              Sur 1000 € de CA, votre part nette sera de <strong style={{ color:'#1a1410' }}>{Math.round(1000 * praticien.retrocession / 100)} €</strong>. Chaque cabinet peut avoir sa propre part, réglable ci-dessous.
            </p>
          </div>
        </div>
      </div>

      {/* Cabinets */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #f0ebe4' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', color: '#1a1410', fontWeight: '400' }}>Cabinets & tarifs</h2>
          <button onClick={addCabinet} style={{ padding: '7px 14px', background: '#f5f2ee', border: '1px solid #e2dbd0', borderRadius: '8px', fontSize: '12px', color: '#4a3f35', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Ajouter un cabinet</button>
        </div>

        {cabinets.length === 0 && (
          <p style={{ color: '#9b8f7e', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucun cabinet — clique sur "Ajouter un cabinet" pour commencer</p>
        )}

        {cabinets.map((cab, ci) => (
          <div key={ci} style={{ background: '#faf8f5', border: '1px solid #e2dbd0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nom du cabinet</label>
                <input value={cab.nom} onChange={e => updateCabinet(ci, 'nom', e.target.value)} placeholder="Cabinet Saint-Denis" style={inputStyle} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Adresse</label>
                <input value={cab.adresse} onChange={e => updateCabinet(ci, 'adresse', e.target.value)} placeholder="4 rue saint Just, 93210 La Plaine Saint Denis" style={inputStyle} />
              </div>
              <div style={{ width: '110px', flexShrink: 0 }}>
                <label style={labelStyle}>Ma part (%)</label>
                <input
                  type="number" min={0} max={100}
                  value={cab.retrocession ?? ''}
                  onChange={e => updateCabinet(ci, 'retrocession', e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  placeholder={String(praticien.retrocession)}
                  style={{ ...inputStyle, textAlign: 'right' }}
                />
              </div>
              <button onClick={() => removeCabinet(ci)} style={{ alignSelf: 'flex-end', padding: '10px 12px', background: 'none', border: '1px solid #e2dbd0', borderRadius: '8px', color: '#9b8f7e', cursor: 'pointer', fontSize: '16px' }}>×</button>
            </div>

            <div style={{ borderTop: '1px solid #e2dbd0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#9b8f7e', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tarifs</span>
                <button onClick={() => addTarif(ci)} style={{ fontSize: '12px', color: '#c8b89a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>+ Ajouter un acte</button>
              </div>
              <p style={{ fontSize: '12px', color: '#9b8f7e', marginBottom: '12px' }}>La couleur Doctolib sert à reconnaître l'acte dans tes captures d'agenda (ex. : vert clair, violet).</p>
              {cab.tarifs.map((t, ti) => (
                <div key={ti} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                  <input value={t.designation} onChange={e => updateTarif(ci, ti, 'designation', e.target.value)} placeholder="Soin de pédicurie" style={{ ...inputStyle, flex: 3 }} />
                  <input value={t.couleur_doctolib || ''} onChange={e => updateTarif(ci, ti, 'couleur_doctolib', e.target.value)} placeholder="Couleur Doctolib" style={{ ...inputStyle, flex: 2 }} />
                  <input type="number" value={t.prix} onChange={e => updateTarif(ci, ti, 'prix', parseFloat(e.target.value) || 0)} placeholder="45" style={{ ...inputStyle, flex: 1, textAlign: 'right' }} />
                  <span style={{ fontSize: '13px', color: '#9b8f7e', flexShrink: 0 }}>€</span>
                  <button onClick={() => removeTarif(ci, ti)} style={{ background: 'none', border: 'none', color: '#9b8f7e', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return <Suspense><SettingsContent /></Suspense>
}
