import jsPDF from 'jspdf'
import { Facture, Patient } from '@/types'

const PRATICIEN = {
  nom: 'Arthur Le Neué',
  titre: 'Pédicure Podologue DE',
  adresse: '4 rue saint Just — 93210 La Plaine Saint Denis',
  tel: '06 89 40 51 05',
  email: 'Arthur.leneue@gmail.com',
  rpps: '10111902820',
  am: '938002623',
}

export function genererPDFFacture(facture: Facture, patient: Patient): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, ml = 18, mr = 18, cw = W - ml - mr
  const BLUE = [45, 91, 227] as [number,number,number]
  const INK = [26, 26, 46] as [number,number,number]
  const INK2 = [74, 74, 106] as [number,number,number]
  const INK3 = [136, 136, 170] as [number,number,number]
  const LIGHT = [232, 238, 255] as [number,number,number]

  doc.setFillColor(...BLUE)
  doc.rect(0, 0, W, 40, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(PRATICIEN.nom, ml, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(200, 210, 255)
  doc.text(PRATICIEN.titre, ml, 26)
  doc.text(PRATICIEN.adresse, ml, 31)
  doc.text(`${PRATICIEN.tel}  ·  ${PRATICIEN.email}`, ml, 36)
  const rx = W - mr
  doc.text(`N° RPPS : ${PRATICIEN.rpps}`, rx, 26, { align: 'right' })
  doc.text(`N° AM : ${PRATICIEN.am}`, rx, 31, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.text('FACTURE', rx, 20, { align: 'right' })

  let y = 50

  doc.setFillColor(...LIGHT)
  doc.roundedRect(ml, y, cw, 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLUE)
  doc.text(`N° ${facture.numero}`, ml + 5, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK2)
  doc.text(`Date : ${new Date(facture.date_facture).toLocaleDateString('fr-FR')}`, ml + 5, y + 11)
  doc.text(`Paiement : ${facture.mode_paiement}`, rx, y + 8.5, { align: 'right' })

  y += 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK3)
  doc.text('PATIENT', ml, y)
  y += 3
  doc.setDrawColor(...INK3)
  doc.setLineWidth(0.3)
  doc.line(ml, y, ml + cw, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLUE)
  doc.text(`${patient.nom} ${patient.prenom}`, ml, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK2)
  if (patient.date_naissance) {
    doc.text(`Date de naissance : ${new Date(patient.date_naissance).toLocaleDateString('fr-FR')}`, ml, y)
    y += 5
  }
  if (patient.num_secu) { doc.text(`N° SS : ${patient.num_secu}`, ml, y); y += 5 }
  if (patient.mutuelle) { doc.text(`Mutuelle : ${patient.mutuelle}`, ml, y); y += 5 }

  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK3)
  doc.text('DÉTAIL DES ACTES', ml, y)
  y += 3
  doc.line(ml, y, ml + cw, y)
  y++
  doc.setFillColor(...BLUE)
  doc.rect(ml, y, cw, 8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('Désignation', ml + 4, y + 5.5)
  doc.text('Qté', ml + 105, y + 5.5, { align: 'center' })
  doc.text('P.U.', ml + 130, y + 5.5, { align: 'center' })
  doc.text('Total', ml + cw - 2, y + 5.5, { align: 'right' })
  y += 8

  let total = 0
  facture.actes.forEach((a, i) => {
    const ligne = a.quantite * a.prix_unitaire
    total += ligne
    if (i % 2 === 0) {
      doc.setFillColor(247, 247, 251)
      doc.rect(ml, y, cw, 8, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(a.designation, ml + 4, y + 5.5)
    doc.text(String(a.quantite), ml + 105, y + 5.5, { align: 'center' })
    doc.text(a.prix_unitaire.toFixed(2) + ' €', ml + 130, y + 5.5, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.text(ligne.toFixed(2) + ' €', ml + cw - 2, y + 5.5, { align: 'right' })
    y += 8
  })

  y += 4
  const totW = 80, totX = ml + cw - totW
  const secu = total * 0.7
  const part = total - secu

  const drawTot = (label: string, val: string, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...BLUE)
      doc.rect(totX - 2, y - 1, totW + 2, 9, 'F')
      doc.setTextColor(255, 255, 255)
    } else {
      doc.setTextColor(...INK2)
    }
    doc.setFont('helvetica', highlight ? 'bold' : 'normal')
    doc.setFontSize(highlight ? 10 : 8.5)
    doc.text(label, totX, y + 5.5)
    doc.text(val, ml + cw - 2, y + 5.5, { align: 'right' })
    y += 9
  }

  drawTot('Sous-total', total.toFixed(2) + ' €')
  drawTot('Part Sécu (70%)', secu.toFixed(2) + ' €')
  drawTot('Part patient', part.toFixed(2) + ' €')
  drawTot('TOTAL TTC', total.toFixed(2) + ' €', true)

  if (facture.mention) {
    y += 4
    doc.setFillColor(247, 247, 251)
    doc.setDrawColor(...INK3)
    doc.setLineWidth(0.3)
    doc.roundedRect(ml, y, cw, 12, 2, 2, 'FD')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK2)
    doc.text(facture.mention, ml + 4, y + 7)
  }

  doc.setFillColor(...BLUE)
  doc.rect(0, 281, W, 16, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(200, 210, 255)
  doc.text("Dispensé de TVA — Art. 261-4-1° du CGI · Pédicure Podologue conventionné Sect. 1", W / 2, 291, { align: 'center' })
  doc.text(facture.numero, ml, 291)
  doc.text(new Date(facture.date_facture).toLocaleDateString('fr-FR'), W - mr, 291, { align: 'right' })

  return doc
}
