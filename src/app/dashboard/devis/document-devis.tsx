'use client'
import { SIGNATURE_B64 } from '@/lib/signature'

const C = { ink: '#1a1410', texte: '#2b241e', brun: '#4a3f35', gris: '#6b6255', filet: '#d9d1c4', filetClair: '#ece6dc', lin: '#f5f2ee' }
const SERIF = "'Playfair Display', Georgia, serif"
export const eur2 = (n: number) => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const dateLongue = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function DocumentDevis({ devis, patient, praticien, cabinet }: any) {
  const fin = new Date((devis.date_devis || '') + 'T12:00:00')
  fin.setDate(fin.getDate() + (Number(devis.validite_jours) || 90))
  const finTexte = isNaN(fin.getTime()) ? '' : fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const civ = patient?.sexe === 'M' ? 'M.' : patient?.sexe === 'F' ? 'Mme' : ''
  const naissance = patient?.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : ''
  const adresse = cabinet?.adresse || [praticien?.adresse, [praticien?.code_postal, praticien?.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const nomPraticien = [praticien?.prenom, praticien?.nom].filter(Boolean).join(' ')
  const signature = SIGNATURE_B64 ? (String(SIGNATURE_B64).startsWith('data:') ? SIGNATURE_B64 : 'data:image/png;base64,' + SIGNATURE_B64) : null
  const lignes = (devis.lignes || []).filter((l: any) => (l.designation || '').trim())
  const th: React.CSSProperties = { textAlign: 'left', fontWeight: 500, fontSize: 11.5, color: C.gris, padding: '0 10px 8px', borderBottom: '1px solid ' + C.filet }
  const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid ' + C.filetClair, verticalAlign: 'top' }

  return (
    <div className="podian-doc" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '64px 72px 64px', background: '#ffffff', fontFamily: 'Inter, "Helvetica Neue", sans-serif', color: C.texte, fontSize: 14, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, paddingBottom: 22, borderBottom: '2px solid ' + C.ink }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, color: C.brun }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.ink }}>{nomPraticien}</div>
          <div>{praticien?.titre || 'Pédicure-Podologue D.E.'}</div>
          {adresse && <div>{adresse}</div>}
          {praticien?.telephone && <div>{praticien.telephone}</div>}
          {praticien?.email && <div>{praticien.email}</div>}
          {(praticien?.rpps || praticien?.am) && <div>{[praticien?.rpps && 'RPPS ' + praticien.rpps, praticien?.am && 'AM ' + praticien.am].filter(Boolean).join(', ')}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, textAlign: 'right' }}>
          <div style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 1.05, color: C.ink }}>Devis</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{devis.numero}</div>
          <div style={{ fontSize: 12.5, color: C.brun }}>{(cabinet?.nom ? cabinet.nom + ', le ' : 'Le ') + dateLongue(devis.date_devis)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px 24px', background: C.lin, borderRadius: 6, padding: '16px 20px' }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <div style={{ fontSize: 11.5, color: C.gris }}>Établi pour</div>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.ink }}>{[civ, patient?.nom?.toUpperCase(), patient?.prenom].filter(Boolean).join(' ') || '[Patient]'}</div>
        </div>
        {naissance && <div><div style={{ fontSize: 11.5, color: C.gris }}>Né(e) le</div><div style={{ fontWeight: 500 }}>{naissance}</div></div>}
        {patient?.adresse && <div style={{ gridColumn: '1 / span 2' }}><div style={{ fontSize: 11.5, color: C.gris }}>Adresse</div><div style={{ fontWeight: 500 }}>{patient.adresse}</div></div>}
        {devis.mention_mutuelle && patient?.num_secu && <div><div style={{ fontSize: 11.5, color: C.gris }}>N° de sécurité sociale</div><div style={{ fontWeight: 500 }}>{patient.num_secu}</div></div>}
        {devis.mention_mutuelle && patient?.mutuelle && <div><div style={{ fontSize: 11.5, color: C.gris }}>Complémentaire santé</div><div style={{ fontWeight: 500 }}>{patient.mutuelle}</div></div>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr>
            <th style={{ ...th, paddingLeft: 0 }}>Désignation</th>
            <th style={{ ...th, textAlign: 'center', width: 60 }}>Qté</th>
            <th style={{ ...th, textAlign: 'right', width: 110 }}>Prix unitaire</th>
            <th style={{ ...th, textAlign: 'right', width: 110, paddingRight: 0 }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 && <tr><td colSpan={4} style={{ ...td, paddingLeft: 0, color: C.gris }}>[Prestations à ajouter]</td></tr>}
          {lignes.map((l: any, i: number) => (
            <tr key={i}>
              <td style={{ ...td, paddingLeft: 0 }}>{l.designation}</td>
              <td style={{ ...td, textAlign: 'center' }}>{l.quantite}</td>
              <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{eur2(l.prix_unitaire)}</td>
              <td style={{ ...td, textAlign: 'right', paddingRight: 0, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{eur2((Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 280, border: '1.5px solid ' + C.ink, borderRadius: 6, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
          <span style={{ fontSize: 13, color: C.brun }}>Total à payer</span>
          <span style={{ fontFamily: SERIF, fontSize: 26, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{eur2(devis.total)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: C.brun }}>
        {devis.mention_mutuelle && <p style={{ margin: 0 }}>Devis établi à la demande du patient, en vue d'une prise en charge par sa complémentaire santé.</p>}
        {devis.note && <p style={{ margin: 0, whiteSpace: 'pre-line', color: C.texte }}>{devis.note}</p>}
        <p style={{ margin: 0 }}>Devis gratuit, valable {devis.validite_jours} jours{finTexte ? ', soit jusqu\'au ' + finTexte : ''}.</p>
        <p style={{ margin: 0 }}>TVA non applicable, article 261-4-1° du Code général des impôts.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: C.brun }}>
          <span>Le praticien</span>
          <div style={{ height: 86, border: '1px solid ' + C.filet, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {signature && <img src={signature} alt="Signature" style={{ maxHeight: 70, maxWidth: '80%' }} />}
          </div>
          <span>{nomPraticien}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: C.brun }}>
          <span>Le patient, « Bon pour accord », date et signature</span>
          <div style={{ height: 86, border: '1px dashed ' + C.filet, borderRadius: 8 }} />
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.gris, borderTop: '1px solid ' + C.filet, paddingTop: 10 }}>Pédicure-podologue, devis établi conformément à la réglementation en vigueur.</div>
    </div>
  )
}
