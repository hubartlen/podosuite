import jsPDF from 'jspdf'
import { Bilan, Patient } from '@/types'

const PRATICIEN = {
  nom: 'Arthur Le Neué',
  titre: 'Pédicure Podologue DE',
  adresse: '4 rue saint Just — 93210 La Plaine Saint Denis',
  tel: '06 89 40 51 05',
  email: 'Arthur.leneue@gmail.com',
  rpps: '10111902820',
  am: '938002623',
}

export function genererPDFBilan(bilan: Bilan, patient: Patient): jsPDF {
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
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('BILAN PODOLOGIQUE', rx, 20, { align: 'right' })

  let y = 50

  const nom = `${patient.nom} ${patient.prenom}`
  const ddn = patient.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString('fr-FR')
    : 'Non renseignée'
  const dateBilan = new Date(bilan.date_bilan).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  doc.setFillColor(...LIGHT)
  doc.roundedRect(ml, y, cw, 16, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLUE)
  doc.text(nom, ml + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK2)
  doc.text(`Né(e) le : ${ddn}`, ml + 5, y + 13)
  doc.text(`Date du bilan : ${dateBilan}`, rx, y + 10, { align: 'right' })

  y += 24

  const section = (titre: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK3)
    doc.text(titre.toUpperCase(), ml, y)
    y += 3
    doc.setDrawColor(...INK3)
    doc.setLineWidth(0.3)
    doc.line(ml, y, ml + cw, y)
    y += 6
  }

  const para = (texte: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    const lines = doc.splitTextToSize(texte, cw - 4)
    doc.text(lines, ml + 2, y)
    y += lines.length * 5.5 + 2
  }

  const infecMap: Record<string, string> = {
    aucune: "Aucune infection tégumentaire n'est mise en évidence sur les faces plantaire et dorsale des deux pieds.",
    mycose: "Une mycose est observée au niveau des pieds.",
    verrue: "La présence de verrue(s) est notée.",
    intertrigo: "Un intertrigo interdigital est présent."
  }
  const hkMap: Record<string, string> = {
    aucune: "Aucune hyperkératose notable n'est relevée.",
    plantaire: "Une hyperkératose plantaire est observée.",
    cors: "Des cors et/ou durillons sont présents.",
    talons: "Des fissures talonnières sont constatées."
  }
  const onglesMap: Record<string, string> = {
    normaux: "Les ongles présentent un aspect normal.",
    dystrophie: "Une onychodystrophie est mise en évidence.",
    incarne: "Un ou plusieurs ongles incarnés sont relevés.",
    onychogryphose: "Une onychogryphose est constatée."
  }
  const deformMap: Record<string, string> = {
    aucune: "Aucune déformation osseuse ou articulaire notoire n'est observée.",
    hallux: "Un hallux valgus est noté.",
    orteils: "Des orteils en griffe sont présents.",
    pied_plat: "Un pied plat est observé.",
    pied_creux: "Un pied creux est observé."
  }

  section('Examen tégumentaire')
  para([
    infecMap[bilan.infection_tegumentaire],
    hkMap[bilan.hyperkeratose],
    onglesMap[bilan.ongles],
    deformMap[bilan.deformations]
  ].filter(Boolean).join(' '))

  y += 2
  section('Examen postural et morphostatique')

  const valgusMap: Record<string, string> = { bilateral: 'un valgus calcanéen bilatéral', droit: 'un valgus calcanéen droit', gauche: 'un valgus calcanéen gauche' }
  const patellaMap: Record<string, string> = { zenith: 'les patellas sont orientées au zénith', internes: 'les patellas sont orientées en dedans', externes: 'les patellas sont orientées en dehors' }
  const genouMap: Record<string, string> = { flexion_g: 'une légère flexion du genou gauche', flexion_d: 'une légère flexion du genou droit', genu_valgum: 'un genu valgum', genu_varum: 'un genu varum' }
  const bassinMap: Record<string, string> = { gauche: 'une bascule du bassin gauche', droit: 'une bascule du bassin droite' }
  const scapMap: Record<string, string> = { gauche: 'une bascule de la ceinture scapulaire gauche', droit: 'une bascule compensatrice de la ceinture scapulaire droite' }

  const elems = [
    valgusMap[bilan.valgus_calcaneen],
    patellaMap[bilan.patellas],
    genouMap[bilan.genou],
    bassinMap[bilan.bassin],
    scapMap[bilan.ceinture_scapulaire],
  ].filter(Boolean)

  para(elems.length > 0
    ? `L'examen postural et morphostatique révèle : ${elems.join(', ')}.`
    : "L'examen postural et morphostatique ne révèle aucune anomalie notable.")

  y += 2
  section('Traitement orthopédique')

  const correcteurs: string[] = []
  if (bilan.semelles_hci)   correcteurs.push('une hémi-coupole interne (HCI) bilatérale')
  if (bilan.semelles_hce)   correcteurs.push('une hémi-coupole externe (HCE) bilatérale')
  if (bilan.semelles_barre) correcteurs.push('une barre métatarsale')
  if (bilan.semelles_coins) correcteurs.push('des coins de talonnière')
  if (bilan.talonnette_cote !== 'aucune' && bilan.talonnette_mm) {
    const cl: Record<string,string> = { gauche: 'gauche', droite: 'droite', bilat: 'bilatérale' }
    correcteurs.push(`une talonnette ${cl[bilan.talonnette_cote]} de ${bilan.talonnette_mm} mm`)
  }

  para(correcteurs.length > 0
    ? `Confection d'une paire de semelles orthopédiques sur mesure comportant ${correcteurs.join(', ')}.`
    : "Aucun traitement orthopédique par semelles n'est prescrit à ce stade.")

  if (bilan.remarques) {
    y += 2
    section('Observations complémentaires')
    para(bilan.remarques)
  }

  doc.setFillColor(...BLUE)
  doc.rect(0, 281, W, 16, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(200, 210, 255)
  doc.text('Pédicure Podologue conventionné · Sect. 1', W / 2, 291, { align: 'center' })

  return doc
}
