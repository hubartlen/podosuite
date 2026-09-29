'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CSS_OR } from '@/app/dashboard/ordonnances/editeur-lignes'

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

function Ordonnances() {
  const router = useRouter()
  const sp = useSearchParams()
  const [onglet, setOnglet] = useState(sp.get('onglet') === 'modeles' ? 'modeles' : 'ordonnances')
  const [uid, setUid] = useState('')
  const [ordos, setOrdos] = useState<any[]>([])
  const [modeles, setModeles] = useState<any[]>([])
  const [q, setQ] = useState(sp.get('q') || '')
  const [pret, setPret] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUid(session.user.id)
      const [{ data: o }, { data: m }] = await Promise.all([
        supabase.from('ordonnances').select('id, date_ordonnance, lignes, patient_id, cabinet_id, format, lignes_hors, mentions, modele_id, patient:patients(nom, prenom)').eq('praticien_id', session.user.id).order('date_ordonnance', { ascending: false }).range(0, 1999),
        supabase.from('ordonnance_modeles').select('*').eq('praticien_id', session.user.id).order('categorie').order('ordre'),
      ])
      setOrdos(o || []); setModeles(m || []); setPret(true)
    })()
  }, [])

  const pat = (o: any) => (Array.isArray(o.patient) ? o.patient[0] : o.patient)
  const resume = (lignes: any[]) => (lignes || []).map((l: any) => (l.produit || l.posologie || '').trim()).filter(Boolean).map((t: string) => (t.length > 60 ? t.slice(0, 60) + '…' : t)).join(', ')
  const listeO = ordos.filter(o => !q.trim() || norm((pat(o)?.nom || '') + ' ' + (pat(o)?.prenom || '') + ' ' + resume(o.lignes)).includes(norm(q.trim())))
  const categories = Array.from(new Set(modeles.map(m => m.categorie)))

  const renouveler = async (o: any) => {
    const { data, error } = await createClient().from('ordonnances').insert({
      praticien_id: uid, patient_id: o.patient_id, cabinet_id: o.cabinet_id, modele_id: o.modele_id, date_ordonnance: iso(new Date()),
      format: o.format, lignes: o.lignes, lignes_hors: o.lignes_hors || [], mentions: o.mentions,
    }).select('id').single()
    if (error || !data) { alert('Erreur : ' + (error?.message || '')); return }
    router.push('/dashboard/ordonnances/' + data.id)
  }
  const nouveauModele = async () => {
    const { data, error } = await createClient().from('ordonnance_modeles').insert({ praticien_id: uid, titre: 'Nouveau modèle', categorie: 'Autres', lignes: [{ produit: '', posologie: '' }] }).select('id').single()
    if (error || !data) { alert('Erreur : ' + (error?.message || '')); return }
    router.push('/dashboard/ordonnances/modeles/' + data.id)
  }
  const supprimerModele = async (m: any) => {
    if (!confirm('Supprimer le modèle « ' + m.titre + ' » ? Les ordonnances déjà faites ne sont pas touchées.')) return
    const { error } = await createClient().from('ordonnance_modeles').delete().eq('id', m.id)
    if (error) { alert('Erreur : ' + error.message); return }
    setModeles(ms => ms.filter(x => x.id !== m.id))
  }

  return (
    <div className="or" style={{ padding: '30px 36px 60px', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{CSS_OR + `
        .or-onglets{display:flex;gap:4px;border-bottom:1px solid var(--line)}
        .or-onglets button{font:inherit;font-size:14px;border:none;background:none;padding:10px 14px;color:var(--fg-3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
        .or-onglets button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
        .or-rang{display:grid;grid-template-columns:110px minmax(0,1fr) minmax(0,1.6fr) 250px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}
        .or-rang:first-child{border-top:none}
        .or-grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
        .or-modele{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
        @media (max-width:860px){.or-rang{grid-template-columns:1fr}}
      `}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 34, margin: 0 }}>Ordonnances</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="or-mini" style={{ width: 260 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Patient ou produit…" aria-label="Rechercher" />
          <Link href="/dashboard/ordonnances/nouvelle" className="or-principal">Nouvelle ordonnance</Link>
        </div>
      </header>
      <div className="or-onglets" role="tablist">
        <button role="tab" aria-selected={onglet === 'ordonnances'} onClick={() => setOnglet('ordonnances')}>Ordonnances ({ordos.length})</button>
        <button role="tab" aria-selected={onglet === 'modeles'} onClick={() => setOnglet('modeles')}>Modèles ({modeles.length})</button>
      </div>

      {!pret ? <p style={{ color: 'var(--fg-3)' }}>Chargement…</p> : onglet === 'ordonnances' ? (
        <section className="or-carte" style={{ padding: '6px 18px', gap: 0 }}>
          {listeO.length === 0 && <p style={{ color: 'var(--fg-3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>Aucune ordonnance pour le moment.</p>}
          {listeO.map(o => {
            const p = pat(o)
            return (
              <div key={o.id} className="or-rang">
                <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{new Date(o.date_ordonnance + 'T12:00:00').toLocaleDateString('fr-FR')}</span>
                <Link href={'/dashboard/ordonnances/' + o.id} style={{ color: 'var(--fg)', fontWeight: 600, textDecoration: 'none' }}>{p ? p.nom + ' ' + (p.prenom || '') : 'Sans patient'}</Link>
                <span style={{ fontSize: 13, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resume(o.lignes)}</span>
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link href={'/dashboard/ordonnances/' + o.id} className="or-bouton" style={{ padding: '7px 11px' }}>Ouvrir</Link>
                  <a href={'/dashboard/ordonnances/' + o.id + '/document'} target="_blank" rel="noopener" className="or-bouton" style={{ padding: '7px 11px' }}>Imprimer</a>
                  <button className="or-bouton" style={{ padding: '7px 11px' }} onClick={() => renouveler(o)}>Renouveler</button>
                </span>
              </div>
            )
          })}
        </section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <button className="or-bouton" style={{ alignSelf: 'flex-start' }} onClick={nouveauModele}>+ Nouveau modèle</button>
          {categories.map(c => (
            <section key={c} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 21, margin: 0 }}>{c}</h2>
              <div className="or-grille">
                {modeles.filter(m => m.categorie === c).map(m => (
                  <div key={m.id} className="or-modele">
                    <strong style={{ fontSize: 14.5 }}>{m.titre}{m.format === 'ald' ? ' (ALD)' : ''}</strong>
                    <span style={{ fontSize: 12.5, color: 'var(--fg-3)', lineHeight: 1.45 }}>{resume(m.lignes)}</span>
                    {m.note_interne && <span style={{ fontSize: 12, color: '#8a4f00' }}>{m.note_interne}</span>}
                    <span style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <Link href={'/dashboard/ordonnances/modeles/' + m.id} className="or-bouton" style={{ padding: '7px 11px' }}>Modifier</Link>
                      <button className="or-bouton" style={{ padding: '7px 11px' }} onClick={() => supprimerModele(m)}>Supprimer</button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense><Ordonnances /></Suspense>
}
