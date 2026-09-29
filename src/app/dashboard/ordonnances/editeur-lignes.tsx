'use client'

export const CSS_OR = `
.or{font-family:Inter,sans-serif;color:var(--fg);box-sizing:border-box}
.or *:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.or-carte{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
.or-champ{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--fg-3)}
.or-champ input,.or-champ select,.or-champ textarea,.or-mini{font:inherit;font-size:14px;color:var(--fg);padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);box-sizing:border-box;width:100%}
.or-champ textarea,.or-mini-texte{resize:vertical;min-height:60px;line-height:1.5}
.or-bouton{font:inherit;font-size:13.5px;padding:10px 15px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.or-bouton:hover{border-color:var(--accent)}
.or-principal{font:inherit;font-size:13.5px;font-weight:600;padding:11px 16px;border-radius:10px;border:none;background:var(--accent);color:var(--accent-fg);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.or-principal:disabled{opacity:.5;cursor:default}
.or-seg{display:flex;gap:6px;flex-wrap:wrap}
.or-seg button{font:inherit;font-size:13px;padding:8px 12px;border-radius:9px;border:1px solid var(--line);background:var(--surface);color:var(--fg-2);cursor:pointer}
.or-seg button[aria-pressed=true]{background:var(--dark);color:var(--on-dark);border-color:var(--dark)}
.or-ligne{display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:8px;align-items:start;padding:12px;border:1px solid var(--line-2);border-radius:12px;background:var(--surface-2)}
.or-x{border:1px solid var(--line);background:var(--surface);width:32px;height:32px;border-radius:8px;cursor:pointer;color:var(--fg-2)}
.or-note{background:#fdecd3;color:#8a4f00;border-radius:12px;padding:12px 14px;font-size:13.5px}
`

export const MENTIONS_RAPIDES = ['QSP', 'Non renouvelable', 'Renouvelable 1 fois', 'Renouvelable 2 fois', 'À renouveler si besoin']

export function EditeurLignes({ lignes, onChange, titre }: { lignes: any[]; onChange: (l: any[]) => void; titre?: string }) {
  const maj = (i: number, champ: string, v: string) => onChange(lignes.map((l, j) => (j === i ? { ...l, [champ]: v } : l)))
  const retirer = (i: number) => onChange(lignes.filter((_, j) => j !== i))
  const monter = (i: number) => { if (i === 0) return; const n = [...lignes]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {titre && <strong style={{ fontSize: 14 }}>{titre}</strong>}
      {lignes.map((l, i) => (
        <div key={i} className="or-ligne">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="or-mini" value={l.produit || ''} placeholder="Produit ou dispositif (laisser vide pour une ligne de texte)" onChange={e => maj(i, 'produit', e.target.value)} aria-label="Produit" style={{ fontWeight: 600 }} />
            <textarea className="or-mini or-mini-texte" value={l.posologie || ''} placeholder="Posologie, durée, consignes" onChange={e => maj(i, 'posologie', e.target.value)} aria-label="Posologie" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" className="or-x" aria-label="Retirer la ligne" onClick={() => retirer(i)}>✕</button>
            {i > 0 && <button type="button" className="or-x" aria-label="Monter la ligne" onClick={() => monter(i)}>↑</button>}
          </div>
        </div>
      ))}
      <button type="button" className="or-bouton" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...lignes, { produit: '', posologie: '' }])}>+ Ajouter une ligne</button>
    </div>
  )
}

export function Mentions({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const ajouter = (m: string) => {
    const lignes = (valeur || '').split('\n').filter(x => x.trim() && !/renouvel/i.test(x) || (!/renouvel/i.test(m) && x.trim()))
    const deja = (valeur || '').split('\n').some(x => x.trim() === m)
    if (deja) return
    onChange([...(/renouvel/i.test(m) ? lignes.filter(x => !/renouvel/i.test(x)) : lignes), m].filter(Boolean).join('\n'))
  }
  return (
    <div className="or-champ">Mentions en bas d'ordonnance
      <div className="or-seg">{MENTIONS_RAPIDES.map(m => <button key={m} type="button" onClick={() => ajouter(m)}>+ {m}</button>)}</div>
      <textarea value={valeur || ''} onChange={e => onChange(e.target.value)} placeholder="QSP, renouvellement, mention légale…" />
    </div>
  )
}
