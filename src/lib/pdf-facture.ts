import jsPDF from 'jspdf'
import { Facture, Patient } from '@/types'

const CABINETS: Record<string, { ville: string; adresse: string }> = {
  'saint-denis': { ville: 'SAINT DENIS', adresse: '4 rue saint Just 93210 La Plaine Saint Denis' },
  'livry-gargan': { ville: 'LIVRY GARGAN', adresse: 'Livry-Gargan' },
}

export async function genererPDFFacture(facture: Facture, patient: Patient): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const ml = 20
  const mr = 20

  const cabinet = CABINETS[(facture as any).cabinet || 'saint-denis']

  // Infos praticien haut gauche
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  let y = 20
  doc.text('Monsieur Arthur Le Neué', ml, y); y += 5
  doc.text('Pédicure Podologue DE', ml, y); y += 5
  doc.text(`${cabinet.adresse}`, ml, y); y += 5
  doc.text('0689405105', ml, y); y += 5
  doc.text('Arthur.leneue@gmail.com', ml, y); y += 5
  doc.text('N° RPPS : 10111902820', ml, y); y += 5
  doc.text('N° AM: 938002623', ml, y)

  // Ville + date centré
  y = 80
  const dateFmt = new Date(facture.date_facture).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`${cabinet.ville}, le ${dateFmt}`, W / 2, y, { align: 'center' })

  // Titre FACTURE
  y = 105
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', W / 2, y, { align: 'center' })

  // Patient
  y = 125
  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const ddnFmt = patient.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString('fr-FR')
    : null
  const neLe = ddnFmt ? (patient.sexe === 'M' ? `né le ${ddnFmt}` : `née le ${ddnFmt}`) : ''

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const patientLine = `${civilite} ${patient.nom} ${patient.prenom}${neLe ? ' ' : ''}`
  const patientNeLe = neLe

  // Souligner le nom du patient
  doc.setDrawColor(30, 30, 30)
  doc.setLineWidth(0.3)
  const nameWidth = doc.getTextWidth(patientLine + patientNeLe)
  doc.text(patientLine, ml, y)
  if (patientNeLe) {
    const nameOnlyWidth = doc.getTextWidth(patientLine)
    doc.setFont('helvetica', 'normal')
    doc.text(patientNeLe, ml + nameOnlyWidth, y)
    doc.line(ml, y + 1, ml + nameWidth, y + 1)
  } else {
    doc.line(ml, y + 1, ml + nameWidth, y + 1)
  }

  // Actes
  y = 145
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)

  facture.actes.forEach(acte => {
    const prix = (acte.quantite * acte.prix_unitaire).toFixed(0) + '€'
    doc.text(acte.designation, ml, y)
    doc.text(prix, W - mr, y, { align: 'right' })
    y += 7
  })

  // Mode de paiement / mention
  y += 5
  if (facture.mention) {
    doc.text(facture.mention, ml, y)
    y += 7
  } else {
    doc.text(facture.mode_paiement === 'Espèces' || facture.mode_paiement === 'Carte bancaire' || facture.mode_paiement === 'Chèque'
      ? 'Réglé ce jour'
      : facture.mode_paiement, ml, y)
  }

  // Signature
  y = 230
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Arthur Le Neué', W / 2 + 10, y, { align: 'center' })

  return doc
}
