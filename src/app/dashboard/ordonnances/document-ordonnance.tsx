'use client'
import { SIGNATURE_B64 } from '@/lib/signature'

const C = { ink: '#1a1410', texte: '#2b241e', brun: '#4a3f35', gris: '#6b6255', filet: '#d9d1c4', lin: '#f5f2ee' }
const SERIF = "'Playfair Display', Georgia, serif"
const dateLongue = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '')

export default function DocumentOrdonnance({ o, patient, praticien, cabinet }: any) {
  const pleine = (l: any) => (l.produit || '').trim() || (l.posologie || '').trim()
  const lignes = (o.lignes || []).filter(pleine)
  const hors = (o.lignes_hors || []).filter(pleine)
  const civ = patient?.sexe === 'M' ? 'M.' : patient?.sexe === 'F' ? 'Mme' : ''
  const dn = patient?.date_naissance ? new Date(patient.date_naissance) : null
  const age = dn ? Math.floor((Date.now() - dn.getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const adresse = cabinet?.adresse || [praticien?.adresse, [praticien?.code_postal, praticien?.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const nomPraticien = [praticien?.prenom, praticien?.nom].filter(Boolean).join(' ')
  const signature = SIGNATURE_B64 ? (String(SIGNATURE_B64).startsWith('data:') ? SIGNATURE_B64 : 'data:image/png;base64,' + SIGNATURE_B64) : null

  const bloc = (liste: any[]) => liste.map((l: any, i: number) => (
    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
      {(l.produit || '').trim() && <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, letterSpacing: '0.01em' }}>{l.produit}</div>}
      {(l.posologie || '').trim() && <div style={{ whiteSpace: 'pre-line', fontSize: 14.5 }}>{l.posologie}</div>}
    </div>
  ))
  const zone = (titre: string, sous: string, contenu: any) => (
    <div>
      <div style={{ borderTop: '1px solid ' + C.ink, borderBottom: '1px solid ' + C.ink, padding: '6px 0', textAlign: 'center', fontSize: 12.5, lineHeight: 1.4 }}>
        <b>{titre}</b><br />{sous}
      </div>
      <div style={{ padding: '18px 4px', minHeight: 140 }}>{contenu}</div>
    </div>
  )

  return (
    <div className="podian-doc" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '60px 72px 60px', background: '#ffffff', fontFamily: 'Inter, "Helvetica Neue", sans-serif', color: C.texte, fontSize: 14, lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, color: C.brun }}>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.ink }}>{nomPraticien}</div>
          <div>{praticien?.titre || 'Pédicure-Podologue D.E.'}</div>
          {adresse && <div>{adresse}</div>}
          {praticien?.telephone && <div>{praticien.telephone}</div>}
          {praticien?.email && <div>{praticien.email}</div>}
          {praticien?.rpps && <div>N° RPPS : {praticien.rpps}</div>}
          {praticien?.am && <div>N° AM : {praticien.am}</div>}
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 12.5, color: C.brun }}>{(cabinet?.nom ? cabinet.nom + ', le ' : 'Le ') + dateLongue(o.date_ordonnance)}</div>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.ink, marginTop: 14 }}>{[civ, patient?.nom?.toUpperCase(), patient?.prenom].filter(Boolean).join(' ') || '[Patient]'}</div>
          {dn && <div style={{ fontSize: 12.5, color: C.brun }}>{patient?.sexe === 'M' ? 'Né' : 'Née'} le {dn.toLocaleDateString('fr-FR')}{age !== null ? ', ' + age + ' ans' : ''}</div>}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontFamily: SERIF, fontSize: 28, color: C.ink, letterSpacing: '0.08em' }}>ORDONNANCE</div>

      <div style={{ flex: 1 }}>
        {o.format === 'ald' ? (
          <>
            {zone("Prescriptions relatives au traitement de l'affection de longue durée reconnue", '(affection exonérante)', bloc(lignes))}
            {zone("Prescriptions sans rapport avec l'affection de longue durée", '(maladies intercurrentes)', bloc(hors))}
          </>
        ) : bloc(lignes)}
        {(o.mentions || '').trim() && <div style={{ whiteSpace: 'pre-line', fontSize: 13, color: C.brun, marginTop: 6 }}>{o.mentions}</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12.5, color: C.brun, minWidth: 200 }}>
          {signature && <img src={signature} alt="Signature" style={{ width: 150, height: 'auto' }} />}
          <div>{nomPraticien}</div>
        </div>
      </div>
    </div>
  )
}
