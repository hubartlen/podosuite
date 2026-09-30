'use client'
import { SIGNATURE_B64 } from '@/lib/signature'

const PT = 0.3528
const haut = (y: number, pt: number) => (y - pt * PT * 0.76) + 'mm'
const VILLES: Record<string, string> = { 'saint-denis': 'SAINT DENIS', 'livry-gargan': 'LIVRY GARGAN' }

export default function ApercuFacture({ facture, patient, praticien }: any) {
  const prat = {
    nom: praticien ? `${praticien.prenom || ''} ${praticien.nom || ''}`.trim() : 'Arthur Le Neué',
    titre: praticien?.titre || 'Pédicure Podologue DE',
    adresse: praticien?.adresse ? `${praticien.adresse} ${praticien.code_postal || ''} ${praticien.ville || ''}`.trim() : '4 rue saint Just 93210 La Plaine Saint Denis',
    telephone: praticien?.telephone || '0689405105',
    email: praticien?.email || 'Arthur.leneue@gmail.com',
    rpps: praticien?.rpps || '10111902820',
    am: praticien?.am || '938002623',
  }
  const cle = String(facture.cabinet || 'saint-denis').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
  const ville = VILLES[cle] || String(facture.cabinet || 'SAINT DENIS').toUpperCase()
  const date = facture.date_facture ? new Date(facture.date_facture).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
  const civ = patient?.sexe === 'M' ? 'M.' : patient?.sexe === 'F' ? 'Mme' : ''
  const ddn = patient?.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : ''
  const neLe = ddn ? (patient?.sexe === 'M' ? `né le ${ddn}` : `née le ${ddn}`) : ''
  const ligneNom = [civ, patient?.nom, patient?.prenom].filter(Boolean).join(' ') || '[Patient]'
  const actes = facture.actes || []
  const yFin = 145 + actes.length * 7 + 5
  const simple = ['Espèces', 'Carte bancaire', 'Chèque'].includes(facture.mode_paiement)
  const reglement = facture.mention || (simple ? 'Réglé ce jour' : facture.mode_paiement || '')
  const sig = SIGNATURE_B64 ? (String(SIGNATURE_B64).startsWith('data:') ? String(SIGNATURE_B64) : 'data:image/png;base64,' + SIGNATURE_B64) : null
  const texte = (y: number, pt: number, extra: React.CSSProperties = {}) => ({ position: 'absolute' as const, top: haut(y, pt), fontSize: pt + 'pt', lineHeight: 1, whiteSpace: 'nowrap' as const, ...extra })

  return (
    <div className="podian-doc" style={{ position: 'relative', width: '210mm', height: '297mm', background: '#ffffff', color: 'rgb(30,30,30)', fontFamily: 'Helvetica, Arial, sans-serif', overflow: 'hidden' }}>
      {[`Monsieur ${prat.nom}`, prat.titre, prat.adresse, prat.telephone, prat.email, `N° RPPS : ${prat.rpps}`, `N° AM: ${prat.am}`].map((t, i) => (
        <div key={i} style={texte(20 + i * 5, 10, { left: '20mm' })}>{t}</div>
      ))}
      <div style={texte(80, 12, { left: 0, width: '210mm', textAlign: 'center' })}>{ville}, le {date}</div>
      <div style={texte(105, 20, { left: 0, width: '210mm', textAlign: 'center', fontWeight: 700 })}>FACTURE</div>
      <div style={texte(125, 13, { left: '20mm', textDecoration: 'underline', textUnderlineOffset: '1mm', textDecorationThickness: '0.3mm' })}>
        <b>{ligneNom}{neLe ? ' ' : ''}</b>{neLe}
      </div>
      {actes.map((a: any, i: number) => (
        <div key={i}>
          <div style={texte(145 + i * 7, 12, { left: '20mm', maxWidth: '140mm', overflow: 'hidden', textOverflow: 'ellipsis' })}>{a.designation}</div>
          <div style={texte(145 + i * 7, 12, { right: '20mm' })}>{((Number(a.quantite) || 0) * (Number(a.prix_unitaire) || 0)).toFixed(0)}€</div>
        </div>
      ))}
      {reglement && <div style={texte(yFin, 12, { left: '20mm' })}>{reglement}</div>}
      {sig && <img src={sig} alt="Signature" style={{ position: 'absolute', left: '140mm', top: '210mm', width: '40mm', height: '18mm' }} />}
      <div style={texte(232, 11, { left: '160mm', transform: 'translateX(-50%)' })}>{prat.nom}</div>
      <div style={{ position: 'absolute', left: '20mm', right: '20mm', top: '278mm', borderTop: '0.2mm solid rgb(200,200,200)' }} />
      <div style={texte(283, 7, { left: 0, width: '210mm', textAlign: 'center', color: 'rgb(180,180,180)' })}>Pédicure Podologue conventionné  ·  Dispensé de TVA — Art. 261-4-1° du CGI</div>
    </div>
  )
}
