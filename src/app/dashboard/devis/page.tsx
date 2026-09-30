'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { eur2 } from '@/app/dashboard/devis/document-devis'

const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const ETATS: Record<string, [string, string, string]> = {
  brouillon: ['Brouillon', 'var(--surface-3)', 'var(--fg-2)'],
  envoye: ['Envoyé', '#dde8f6', '#1d4a80'],
  accepte: ['Accepté', '#e3f1e7', '#23633a'],
  refuse: ['Refusé', '#fbe3d8', '#9a3b16'],
  facture: ['Facturé', '#efe4f4', '#6a3f7c'],
  expire: ['Expiré', '#fdecd3', '#8a4f00'],
}

export default function ListeDevis() {
  const [devis, setDevis] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState('tous')
  const [pret, setPret] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/auth/login'; return }
      const { data } = await supabase.from('devis').select('id, numero, date_devis, validite_jours, total, statut, patient:patients(nom, prenom)')
        .eq('praticien_id', session.user.id).order('date_devis', { ascending: false }).range(0, 1999)
      setDevis(data || []); setPret(true)
    })()
  }, [])

  const auj = iso(new Date())
  const etatDe = (d: any) => {
    if ((d.statut === 'brouillon' || d.statut === 'envoye') && d.date_devis) {
      const f = new Date(d.date_devis + 'T12:00:00'); f.setDate(f.getDate() + (d.validite_jours || 90))
      if (iso(f) < auj) return 'expire'
    }
    return d.statut
  }
  const pat = (d: any) => (Array.isArray(d.patient) ? d.patient[0] : d.patient)
  const liste = devis
    .filter(d => filtre === 'tous' || etatDe(d) === filtre)
    .filter(d => !q.trim() || norm((pat(d)?.nom || '') + ' ' + (pat(d)?.prenom || '') + ' ' + d.numero).includes(norm(q.trim())))
  const enAttente = devis.filter(d => ['envoye', 'accepte'].includes(etatDe(d)))
  const montantAttente = enAttente.reduce((s, d) => s + Number(d.total || 0), 0)

  return (
    <div className="dv">
      <style>{`
        .dv{padding:30px 36px 60px;max-width:1100px;margin:0 auto;font-family:Inter,sans-serif;color:var(--fg);display:flex;flex-direction:column;gap:18px;box-sizing:border-box}
        .dv *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .dv-tete{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .dv-titre{font-family:var(--font-display);font-weight:400;font-size:34px;margin:0}
        .dv-petit{font-size:13px;color:var(--fg-3)}
        .dv-principal{font-size:14px;font-weight:600;padding:11px 18px;border-radius:6px;background:var(--accent);color:var(--accent-fg);text-decoration:none}
        .dv-recherche{font:inherit;font-size:14px;padding:11px 14px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--fg);width:280px;max-width:100%}
        .dv-seg{display:flex;flex-wrap:wrap;gap:6px}
        .dv-seg button{font:inherit;font-size:13px;padding:7px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
        .dv-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
        .dv-carte{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:6px 18px}
        .dv-ligne{display:grid;grid-template-columns:130px minmax(0,1.4fr) 150px 110px 110px 160px;gap:12px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}
        .dv-ligne:first-child{border-top:none}
        .dv-etat{justify-self:start;font-size:12px;font-weight:600;border-radius:6px;padding:4px 10px}
        .dv-bouton{font-size:13px;padding:7px 12px;border-radius:9px;border:1px solid var(--line);color:var(--fg-2);text-decoration:none;background:var(--surface)}
        .dv-bouton:hover{border-color:var(--accent)}
        .dv-vide{padding:26px 0;text-align:center;color:var(--fg-3);font-size:14px;margin:0}
        @media (max-width:860px){.dv{padding:18px 14px 90px}.dv-ligne{grid-template-columns:1fr auto}.dv-ligne>*:nth-child(3),.dv-ligne>*:nth-child(4){grid-column:1/-1}}
      `}</style>
      <header className="dv-tete">
        <div>
          <h1 className="dv-titre">Devis</h1>
          <p className="dv-petit" style={{ margin: '4px 0 0' }}>{enAttente.length} devis en attente de réalisation, pour {eur2(montantAttente)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="dv-recherche" value={q} onChange={e => setQ(e.target.value)} placeholder="Patient ou numéro…" aria-label="Rechercher un devis" />
          <Link href="/dashboard/devis/nouveau" className="dv-principal">Nouveau devis</Link>
        </div>
      </header>
      <div className="dv-seg" role="group" aria-label="Filtrer par statut">
        {[['tous', 'Tous'], ['brouillon', 'Brouillons'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['facture', 'Facturés'], ['expire', 'Expirés'], ['refuse', 'Refusés']].map(([k, l]) => (
          <button key={k} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}</button>
        ))}
      </div>
      <section className="dv-carte">
        {!pret ? <p className="dv-vide">Chargement…</p> : liste.length === 0 ? <p className="dv-vide">Aucun devis ici pour le moment.</p> : liste.map(d => {
          const e = ETATS[etatDe(d)] || ETATS.brouillon
          const p = pat(d)
          return (
            <div key={d.id} className="dv-ligne">
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{d.numero}</span>
              <Link href={'/dashboard/devis/' + d.id} style={{ color: 'var(--fg)', textDecoration: 'none', fontWeight: 500 }}>{p ? (p.nom + ' ' + (p.prenom || '')) : 'Patient à choisir'}</Link>
              <span className="dv-petit">{d.date_devis ? new Date(d.date_devis + 'T12:00:00').toLocaleDateString('fr-FR') : ''}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{eur2(d.total)}</span>
              <span className="dv-etat" style={{ background: e[1], color: e[2] }}>{e[0]}</span>
              <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Link href={'/dashboard/devis/' + d.id} className="dv-bouton">Ouvrir</Link>
                <a href={'/dashboard/devis/' + d.id + '/document'} target="_blank" rel="noopener" className="dv-bouton">Document</a>
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}
