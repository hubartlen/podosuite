import jsPDF from 'jspdf'
import { Facture, Patient } from '@/types'
import { SIGNATURE_B64 } from './signature'

const CABINETS: Record<string, { ville: string; adresse: string }> = {
  'saint-denis': { ville: 'SAINT DENIS', adresse: '4 rue saint Just 93210 La Plaine Saint Denis' },
  'livry-gargan': { ville: 'LIVRY GARGAN', adresse: 'Livry-Gargan' },
}

export function genererPDFFacture(facture: Facture, patient: Patient): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const ml = 20
  const mr = 20

  const cabinet = CABINETS[(facture as any).cabinet || 'saint-denis']

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  let y = 20
  doc.text('Monsieur Arthur Le Neué', ml, y); y += 5
  doc.text('Pédicure Podologue DE', ml, y); y += 5
  doc.text(cabinet.adresse, ml, y); y += 5
  doc.text('0689405105', ml, y); y += 5
  doc.text('Arthur.leneue@gmail.com', ml, y); y += 5
  doc.text('N° RPPS : 10111902820', ml, y); y += 5
  doc.text('N° AM: 938002623', ml, y)

  y = 80
  const dateFmt = new Date(facture.date_facture).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`${cabinet.ville}, le ${dateFmt}`, W / 2, y, { align: 'center' })

  y = 105
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', W / 2, y, { align: 'center' })

  y = 125
  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const ddnFmt = patient.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString('fr-FR')
    : null
  const neLe = ddnFmt ? (patient.sexe === 'M' ? `né le ${ddnFmt}` : `née le ${ddnFmt}`) : ''

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const patientLine = `${civilite} ${patient.nom} ${patient.prenom}${neLe ? ' ' : ''}`
  const nameWidth = doc.getTextWidth(patientLine + neLe)
  doc.text(patientLine, ml, y)
  if (neLe) {
    const nameOnlyWidth = doc.getTextWidth(patientLine)
    doc.setFont('helvetica', 'normal')
    doc.text(neLe, ml + nameOnlyWidth, y)
  }
  doc.setDrawColor(30, 30, 30)
  doc.setLineWidth(0.3)
  doc.line(ml, y + 1, ml + nameWidth, y + 1)

  y = 145
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  facture.actes.forEach(acte => {
    const prix = (acte.quantite * acte.prix_unitaire).toFixed(0) + '€'
    doc.text(acte.designation, ml, y)
    doc.text(prix, W - mr, y, { align: 'right' })
    y += 7
  })

  y += 5
  if (facture.mention) {
    doc.text(facture.mention, ml, y)
  } else {
    const modeSimple = ['Espèces', 'Carte bancaire', 'Chèque'].includes(facture.mode_paiement)
    doc.text(modeSimple ? 'Réglé ce jour' : facture.mode_paiement, ml, y)
  }

  // Signature centrée à droite
  try {
    const sigData = SIGNATURE_B64.includes(',') ? SIGNATURE_B64.split(',')[1] : SIGNATURE_B64
    doc.addImage(sigData, 'PNG', W - mr - 50, 210, 40, 18)
  } catch(e) { console.error('Signature error:', e) }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text('Arthur Le Neué', W - mr - 30, 232, { align: 'center' })

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(ml, 278, W - mr, 278)
  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  doc.text('Pédicure Podologue conventionné  ·  Dispensé de TVA — Art. 261-4-1° du CGI', W / 2, 283, { align: 'center' })

  return doc
}
