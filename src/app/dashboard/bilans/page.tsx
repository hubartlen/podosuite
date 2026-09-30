'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const dateFr = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function ListeBilans() {
  const [bilans, setBilans] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [pret, setPret] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      const { data } = await supabase.from('bilans').select('id, date_bilan, format, donnees, patient:patients(nom, prenom)')
        .eq('praticien_id', session.user.id).order('date_bilan', { ascending: false }).range(0, 1999)
      setBilans(data || []); setPret(true)
    })()
  }, [])

  const pat = (b: any) => (Array.isArray(b.patient) ? b.patient[0] : b.patient)
  const enCoursDe = (b: any) => b.format === 2 && !String(b.donnees?.synthese || '').trim()
  const filtres = bilans.filter(b => !q.trim() || norm((pat(b)?.nom || '') + ' ' + (pat(b)?.prenom || '')).includes(norm(q.trim())))
  const enCours = filtres.filter(enCoursDe)
  const autres = filtres.filter(b => !enCoursDe(b))
  const lienDe = (b: any) => (b.format === 2 ? '/dashboard/bilans/' + b.id + '/saisie' : '/dashboard/bilans/' + b.id)

  const ligne = (b: any) => {
    const p = pat(b)
    const elements = b.format === 2 ? (b.donnees?.semelles?.elements || []).filter((e: any) => e.G || e.D).length : 0
    const controle = b.donnees?.semelles?.controle
    const etat = enCoursDe(b) ? { t: 'En cours', f: '#fdecd3', c: '#8a4f00' } : b.format === 2 ? { t: 'Terminé', f: '#e3f1e7', c: '#23633a' } : { t: 'Ancien format', f: 'var(--surface-3)', c: 'var(--fg-3)' }
    return (
      <div key={b.id} className="lb-ligne">
        <Link href={lienDe(b)} className="lb-nom">{p?.nom} {p?.prenom}</Link>
        <span className="lb-petit">{dateFr(b.date_bilan)}</span>
        <span className="lb-petit">{elements ? elements + ' élément' + (elements > 1 ? 's' : '') + ' de semelle' : ''}{controle ? (elements ? ', ' : '') + 'contrôle le ' + new Date(controle + 'T12:00:00').toLocaleDateString('fr-FR') : ''}</span>
        <span className="lb-etat" style={{ background: etat.f, color: etat.c }}>{etat.t}</span>
        <span className="lb-actions">
          <Link href={lienDe(b)} className="lb-bouton">{b.format === 2 ? 'Ouvrir' : 'Voir'}</Link>
          {b.format === 2 && <a href={'/dashboard/bilans/' + b.id + '/document'} target="_blank" rel="noopener" className="lb-bouton">Document</a>}
        </span>
      </div>
    )
  }

  return (
    <div className="lb">
      <style>{`
        .lb{padding:30px 36px 60px;max-width:1100px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
        .lb *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .lb-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .lb-titre{font-family:var(--font-display);font-weight:400;font-size:34px;margin:0}
        .lb-principal{font-size:14px;font-weight:600;padding:11px 18px;border-radius:6px;background:var(--accent);color:var(--accent-fg);text-decoration:none}
        .lb-recherche{font:inherit;font-size:14px;padding:11px 14px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);width:300px;max-width:100%}
        .lb-carte{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 18px}
        .lb-h2{font-family:var(--font-display);font-weight:400;font-size:21px;margin:10px 0 4px}
        .lb-ligne{display:grid;grid-template-columns:minmax(0,1.3fr) 170px minmax(0,1.3fr) 120px 170px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}
        .lb-ligne:first-of-type{border-top:none}
        .lb-nom{font-weight:600;color:var(--fg);text-decoration:none}
        .lb-nom:hover{text-decoration:underline}
        .lb-petit{font-size:13px;color:var(--fg-3)}
        .lb-etat{justify-self:start;font-size:12px;font-weight:600;border-radius:6px;padding:4px 10px}
        .lb-actions{display:flex;gap:6px;justify-content:flex-end}
        .lb-bouton{font-size:13px;padding:7px 12px;border-radius:9px;border:1px solid var(--line);color:var(--fg-2);text-decoration:none;background:var(--surface)}
        .lb-bouton:hover{border-color:var(--accent)}
        .lb-vide{padding:26px 0;text-align:center;color:var(--fg-3);font-size:14px;margin:0}
        @media (max-width:860px){.lb{padding:18px 14px 90px}.lb-ligne{grid-template-columns:1fr auto}.lb-ligne .lb-petit{grid-column:1/-1}.lb-actions{grid-column:1/-1;justify-content:flex-start}}
      `}</style>

      <header className="lb-tete">
        <h1 className="lb-titre">Bilans</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="lb-recherche" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un patient…" aria-label="Rechercher un patient" />
          <Link href="/dashboard/bilans/nouveau" className="lb-principal">Nouveau bilan</Link>
        </div>
      </header>

      {!pret ? <p className="lb-vide">Chargement…</p> : (
        <>
          {enCours.length > 0 && (
            <section className="lb-carte">
              <h2 className="lb-h2">À terminer ({enCours.length})</h2>
              {enCours.map(ligne)}
            </section>
          )}
          <section className="lb-carte">
            <h2 className="lb-h2">Tous les bilans</h2>
            {autres.length === 0 ? <p className="lb-vide">{q ? 'Aucun bilan pour ce patient.' : 'Aucun bilan terminé pour le moment.'}</p> : autres.map(ligne)}
          </section>
        </>
      )}
    </div>
  )
}
