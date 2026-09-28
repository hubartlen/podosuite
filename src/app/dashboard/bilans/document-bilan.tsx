'use client'
import { EXAMEN, POSTURE, MARCHE, etapeRemplie } from '@/lib/bilan-v2'
import { SIGNATURE_B64 } from '@/lib/signature'

export const PIED_G = 'M36 10 C50 10 58 24 57 42 C56 58 50 70 50 86 C50 102 55 114 53 127 C51 139 43 144 34 144 C24 144 17 138 16 127 C14 113 20 100 19 86 C18 71 11 60 12 42 C13 24 22 10 36 10 Z'
export const PIED_D = 'M34 10 C20 10 12 24 13 42 C14 58 20 70 20 86 C20 102 15 114 17 127 C19 139 27 144 36 144 C46 144 53 138 54 127 C56 113 50 100 51 86 C52 71 59 60 58 42 C57 24 48 10 34 10 Z'
const ORTEILS = [[45, 0, 7, 8], [34, -4, 4.5, 5], [26, -2, 4, 4.5], [19, 2, 3.5, 4], [13, 8, 3, 3.5]]

export function Pied({ cote, points = [], taille = 70, onClick }: any) {
  const orteils = ORTEILS.map(([x, y, rx, ry]) => (cote === 'G' ? [x, y, rx, ry] : [70 - x, y, rx, ry]))
  return (
    <svg width={taille} height={Math.round(taille * 164 / 70)} viewBox="0 -14 70 164" onClick={onClick}
      style={{ display: 'block', cursor: onClick ? 'crosshair' : 'default' }} aria-label={cote === 'G' ? 'Pied gauche' : 'Pied droit'}>
      {orteils.map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#f5f2ee" stroke="#6b6255" strokeWidth={1.2} />)}
      <path d={cote === 'G' ? PIED_G : PIED_D} fill="#f5f2ee" stroke="#6b6255" strokeWidth={1.3} />
      {points.map((p: any) => (
        <g key={p.n}>
          <circle cx={p.x} cy={p.y} r={7} fill="#1a1410" />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize={9} fill="#ffffff" fontFamily="Inter, sans-serif">{p.n}</text>
        </g>
      ))}
    </svg>
  )
}

const C = { ink: '#1a1410', texte: '#2b241e', brun: '#4a3f35', gris: '#6b6255', filet: '#d9d1c4', filetClair: '#ece6dc', lin: '#f5f2ee' }
const SERIF = "'Playfair Display', Georgia, serif"
const h2: React.CSSProperties = { margin: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: C.ink, paddingBottom: 6, borderBottom: `1px solid ${C.filet}` }
const petit: React.CSSProperties = { fontSize: 11.5, color: C.gris }
const para: React.CSSProperties = { margin: 0, whiteSpace: 'pre-line' }
const th: React.CSSProperties = { textAlign: 'left', fontWeight: 500, fontSize: 11.5, color: C.gris, padding: '0 12px 8px', borderBottom: `1px solid ${C.filet}` }
const td: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${C.filetClair}` }
const puce: React.CSSProperties = { width: 20, height: 20, borderRadius: '50%', background: C.ink, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const rempli = (v: any) => (typeof v === 'string' ? v.trim() !== '' : !!v)

function Bloc({ titre, lignes, remarques, style }: any) {
  return (
    <div style={{ ...col, gap: 10, ...style }}>
      <h2 style={h2}>{titre}</h2>
      {lignes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: '6px 12px' }}>
          {lignes.map(([k, v, anormal]: any) => [
            <div key={k + 'k'} style={{ color: C.gris }}>{k}</div>,
            <div key={k + 'v'} style={{ fontWeight: anormal ? 600 : 400 }}>{v}</div>,
          ])}
        </div>
      )}
      {rempli(remarques) && <p style={para}>{remarques}</p>}
    </div>
  )
}

export default function DocumentBilan({ d, patient, praticien, cabinet, date, photos = [], actif }: any) {
  const cadre = (cle: string): React.CSSProperties => (actif === cle ? { outline: '6px solid #c8b89a', outlineOffset: 10, borderRadius: 4 } : {})
  const dateLongue = date ? new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const naissance = patient?.date_naissance ? new Date(patient.date_naissance) : null
  const age = naissance ? Math.floor((Date.now() - naissance.getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const civ = patient?.sexe === 'M' ? 'M.' : patient?.sexe === 'F' ? 'Mme' : ''
  const adresse = cabinet?.adresse || [praticien?.adresse, [praticien?.code_postal, praticien?.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const lieu = cabinet?.nom || praticien?.ville || ''
  const infosPatient = [
    ['Profession', d.contexte.profession], ['Activité physique', d.contexte.activite], ['Chaussage', d.contexte.chaussage],
    ['Pointure', d.contexte.pointure], ['Médecin prescripteur', d.contexte.medecin],
  ].filter(([, v]) => rempli(v))
  const kvMotif = [
    ['Ancienneté', d.motif.anciennete], ['Antécédents', d.motif.antecedents], ['Suivis en cours', d.motif.suivis],
    ['Traitements', d.motif.traitements], ['Semelles antérieures', d.motif.semelles_anterieures],
  ].filter(([, v]) => rempli(v))
  const numeros = (d.motif.douleurs || []).map((p: any, i: number) => ({ ...p, n: i + 1 }))
  const lignesExamen = EXAMEN.filter(c => rempli(d.examen[c.cle]?.G) || rempli(d.examen[c.cle]?.D))
  const lignesPosture = POSTURE.filter(c => rempli(d.posture[c.cle])).map(c => [c.libelle, d.posture[c.cle], d.posture[c.cle] !== c.options[0]])
  const lignesMarche = MARCHE.filter(c => rempli(d.marche[c.cle])).map(c => [c.libelle, d.marche[c.cle], d.marche[c.cle] !== c.options[0]])
  const aPosture = etapeRemplie('posture', d), aMarche = etapeRemplie('marche', d)
  const elements = d.semelles.elements.filter((e: any) => e.G || e.D)
  const metaSemelles = [d.semelles.gabarit && `Gabarit ${d.semelles.gabarit}`, d.semelles.type, d.semelles.recouvrement && `Recouvrement ${String(d.semelles.recouvrement).toLowerCase()}`].filter(Boolean)
  const controle = d.semelles.controle ? new Date(`${d.semelles.controle}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const signature = SIGNATURE_B64 ? (String(SIGNATURE_B64).startsWith('data:') ? SIGNATURE_B64 : `data:image/png;base64,${SIGNATURE_B64}`) : null
  const nomPraticien = [praticien?.prenom, praticien?.nom].filter(Boolean).join(' ')
  const point = <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: C.ink }} />

  return (
    <div className="podian-doc" style={{ width: 794, boxSizing: 'border-box', padding: '64px 72px 72px', background: '#ffffff', fontFamily: 'Inter, "Helvetica Neue", sans-serif', color: C.texte, fontSize: 14, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, paddingBottom: 22, borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, color: C.brun }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.ink }}>{nomPraticien}</div>
          <div>{praticien?.titre || 'Pédicure-Podologue D.E.'}</div>
          {adresse && <div>{adresse}</div>}
          {praticien?.telephone && <div>{praticien.telephone}</div>}
          {praticien?.email && <div>{praticien.email}</div>}
          {(praticien?.rpps || praticien?.am) && <div>{[praticien?.rpps && `RPPS ${praticien.rpps}`, praticien?.am && `AM ${praticien.am}`].filter(Boolean).join(', ')}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, textAlign: 'right' }}>
          <div style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.05, color: C.ink }}>Bilan podologique</div>
          <div style={{ fontSize: 12.5, color: C.brun }}>{lieu ? `${lieu}, le ${dateLongue}` : `Le ${dateLongue}`}</div>
        </div>
      </div>

      <div style={{ ...cadre('contexte'), display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px 24px', background: C.lin, borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <div style={petit}>Patient</div>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.ink }}>{[civ, patient?.nom?.toUpperCase(), patient?.prenom].filter(Boolean).join(' ')}</div>
        </div>
        {naissance && <div><div style={petit}>Né(e) le</div><div style={{ fontWeight: 500 }}>{naissance.toLocaleDateString('fr-FR')}{age !== null ? ` (${age} ans)` : ''}</div></div>}
        {infosPatient.map(([k, v]: any) => <div key={k}><div style={petit}>{k}</div><div style={{ fontWeight: 500 }}>{v}</div></div>)}
      </div>

      {etapeRemplie('motif', d) && (
        <section style={{ ...cadre('motif'), ...col }}>
          <h2 style={h2}>Motif de consultation et anamnèse</h2>
          {rempli(d.motif.texte) && <p style={para}>{d.motif.texte}</p>}
          {kvMotif.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr)', gap: '6px 16px' }}>
              {kvMotif.map(([k, v]: any) => [<div key={k + 'k'} style={{ color: C.gris }}>{k}</div>, <div key={k + 'v'} style={para}>{v}</div>])}
            </div>
          )}
          {numeros.length > 0 && (
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
                {(['G', 'D'] as const).map(c => (
                  <div key={c} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Pied cote={c} taille={70} points={numeros.filter((p: any) => p.pied === c)} />
                    <span style={petit}>{c === 'G' ? 'Gauche' : 'Droit'}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1 }}>
                <div style={petit}>Zones douloureuses</div>
                <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) auto', gap: '8px 10px', alignItems: 'center' }}>
                  {numeros.map((p: any) => [
                    <div key={p.n + 'a'} style={puce}>{p.n}</div>,
                    <div key={p.n + 'b'}>{[p.zone || (p.pied === 'G' ? 'Pied gauche' : 'Pied droit'), p.moment].filter(Boolean).join(', ')}</div>,
                    <div key={p.n + 'c'} style={{ fontWeight: 600 }}>{p.eva !== '' && p.eva !== undefined ? `EVA ${p.eva}/10` : ''}</div>,
                  ])}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {(lignesExamen.length > 0 || rempli(d.examen_remarques)) && (
        <section style={{ ...cadre('examen'), ...col }}>
          <h2 style={h2}>Examen clinique</h2>
          {lignesExamen.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr><th style={{ ...th, paddingLeft: 0, width: '34%' }}></th><th style={th}>Pied gauche</th><th style={th}>Pied droit</th></tr></thead>
              <tbody>
                {lignesExamen.map(c => {
                  const e = d.examen[c.cle] || {}
                  return (
                    <tr key={c.cle}>
                      <td style={{ ...td, paddingLeft: 0, color: C.brun }}>{c.libelle}</td>
                      {(['G', 'D'] as const).map(s => {
                        const v = e[s], p = e[s === 'G' ? 'precG' : 'precD']
                        return <td key={s} style={{ ...td, fontWeight: v && v !== c.options[0] ? 600 : 400 }}>{v ? `${v}${p ? `, ${p}` : ''}` : ''}</td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {rempli(d.examen_remarques) && <p style={para}>{d.examen_remarques}</p>}
        </section>
      )}

      {(aPosture || aMarche) && (
        <section style={{ display: 'grid', gridTemplateColumns: aPosture && aMarche ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 24 }}>
          {aPosture && <Bloc titre="Posture" lignes={lignesPosture} remarques={d.posture_remarques} style={cadre('posture')} />}
          {aMarche && <Bloc titre="Étude de la marche" lignes={lignesMarche} remarques={d.marche_remarques} style={cadre('marche')} />}
        </section>
      )}

      {rempli(d.synthese) && (
        <section style={{ ...cadre('synthese'), ...col }}>
          <h2 style={h2}>Synthèse</h2>
          <p style={para}>{d.synthese}</p>
        </section>
      )}

      {(elements.length > 0 || metaSemelles.length > 0) && (
        <section style={{ ...cadre('semelles'), ...col, gap: 14, border: `1.5px solid ${C.ink}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <h2 style={{ ...h2, borderBottom: 'none', paddingBottom: 0 }}>Orthèses plantaires</h2>
            <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: C.brun }}>{metaSemelles.map((m: any) => <span key={m}>{m}</span>)}</div>
          </div>
          {elements.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr><th style={{ ...th, paddingLeft: 0 }}>Élément</th><th style={{ ...th, textAlign: 'center', width: 90 }}>Gauche</th><th style={{ ...th, textAlign: 'center', width: 90 }}>Droit</th></tr></thead>
              <tbody>
                {elements.map((e: any) => (
                  <tr key={e.cle}>
                    <td style={{ ...td, paddingLeft: 0 }}>{e.libelle}{rempli(e.valeur) ? ` (${e.valeur})` : ''}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#b3a995' }}>{e.G ? point : '·'}</td>
                    <td style={{ ...td, textAlign: 'center', color: '#b3a995' }}>{e.D ? point : '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {(rempli(d.semelles.conseils) || rempli(d.semelles.port) || controle) && (
        <section style={{ ...col, gap: 8 }}>
          <h2 style={h2}>Conseils et suivi</h2>
          {rempli(d.semelles.conseils) && <p style={para}>{d.semelles.conseils}</p>}
          {rempli(d.semelles.port) && <p style={para}><span style={{ color: C.gris }}>Port conseillé : </span>{d.semelles.port}</p>}
          {controle && <p style={para}><span style={{ color: C.gris }}>Contrôle prévu : </span>{controle}</p>}
        </section>
      )}

      {photos.length > 0 && (
        <section style={{ ...col }}>
          <h2 style={h2}>Photos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {photos.map((u: string) => <img key={u} src={u} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 8, background: C.lin }} />)}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12.5, color: C.brun }}>
          {signature && <img src={signature} alt="Signature" style={{ width: 150, height: 'auto' }} />}
          <div>{nomPraticien}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.gris, borderTop: `1px solid ${C.filet}`, paddingTop: 10 }}>
        Document médical confidentiel, établi à l'attention du patient et, avec son accord, de son médecin.
      </div>
    </div>
  )
}
