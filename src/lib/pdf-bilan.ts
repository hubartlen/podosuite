import jsPDF from 'jspdf'
import { Bilan, Patient } from '@/types'

export function genererPDFBilan(bilan: Bilan, patient: Patient): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const ml = 22
  const mr = 22
  const cw = W - ml - mr

  // Couleurs
  const NOIR = [15, 15, 15] as [number,number,number]
  const GRIS = [120, 120, 120] as [number,number,number]
  const GRIS_CLAIR = [200, 200, 200] as [number,number,number]
  const FOND = [248, 248, 248] as [number,number,number]
  const BLEU = [30, 80, 200] as [number,number,number]

  // ── En-tête praticien ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text('Arthur Le Neué · Pédicure Podologue DE', ml, 18)
  doc.text('4 rue saint Just — 93210 La Plaine Saint Denis', ml, 23)
  doc.text('06 89 40 51 05  ·  Arthur.leneue@gmail.com', ml, 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_CLAIR)
  const rx = W - mr
  doc.text(`N° RPPS : 10111902820`, rx, 23, { align: 'right' })
  doc.text(`N° AM : 938002623`, rx, 28, { align: 'right' })

  // Ligne séparatrice fine
  doc.setDrawColor(...GRIS_CLAIR)
  doc.setLineWidth(0.3)
  doc.line(ml, 34, W - mr, 34)

  // ── Titre document ──────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(22)
  doc.setTextColor(...NOIR)
  doc.text('Bilan podologique', ml, 50)

  // Date
  const dateBilan = new Date(bilan.date_bilan).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(dateBilan, ml, 57)

  // ── Identité patient ────────────────────────────────────────
  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const ddn = patient.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString('fr-FR')
    : null
  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  doc.setFillColor(...FOND)
  doc.roundedRect(ml, 64, cw, 20, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NOIR)
  doc.text(`${civilite} ${patient.nom} ${patient.prenom}`, ml + 6, 73)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  const infosPatient = [
    ddn && `Né(e) le ${ddn}`,
    age && `${age} ans`,
    patient.num_secu && `N° SS : ${patient.num_secu}`,
    patient.mutuelle && `Mutuelle : ${patient.mutuelle}`,
  ].filter(Boolean).join('   ·   ')
  doc.text(infosPatient, ml + 6, 79)

  // ── Tableau examen tégumentaire ─────────────────────────────
  let y = 96

  const sectionTitle = (titre: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...BLEU)
    doc.text(titre.toUpperCase(), ml, y)
    y += 2
    doc.setDrawColor(...BLEU)
    doc.setLineWidth(0.5)
    doc.line(ml, y, ml + 40, y)
    doc.setDrawColor(...GRIS_CLAIR)
    doc.setLineWidth(0.3)
    doc.line(ml + 40, y, W - mr, y)
    y += 5
  }

  const tableauRow = (label: string, valeur: string, normal: boolean, isLast = false) => {
    const rowH = 8
    if (!isLast) {
      doc.setDrawColor(...GRIS_CLAIR)
      doc.setLineWidth(0.2)
      doc.line(ml, y + rowH, W - mr, y + rowH)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...GRIS)
    doc.text(label, ml + 2, y + 5.5)

    doc.setFont('helvetica', normal ? 'normal' : 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(normal ? ...[GRIS] : [...NOIR])
    doc.text(valeur, ml + cw / 2, y + 5.5)

    // Pastille verte/bleue
    if (!normal) {
      doc.setFillColor(...BLEU)
      doc.circle(ml + cw - 4, y + 4.5, 1.5, 'F')
    }

    y += rowH
  }

  const LABELS: Record<string, Record<string, string>> = {
    infection_tegumentaire: { aucune: 'Aucune', mycose: 'Mycose', verrue: 'Verrue(s)', intertrigo: 'Intertrigo' },
    hyperkeratose: { aucune: 'Aucune', plantaire: 'Plantaire', cors: 'Cors / Durillons', talons: 'Talons fissurés' },
    ongles: { normaux: 'Normaux', dystrophie: 'Onychodystrophie', incarne: 'Ongle incarné', onychogryphose: 'Onychogryphose' },
    deformations: { aucune: 'Aucune notoire', hallux: 'Hallux valgus', orteils: 'Orteils en griffe', pied_plat: 'Pied plat', pied_creux: 'Pied creux' },
    valgus_calcaneen: { absent: 'Absent', bilateral: 'Bilatéral', droit: 'Droit', gauche: 'Gauche' },
    patellas: { zenith: 'Au zénith', internes: 'En dedans', externes: 'En dehors' },
    genou: { normal: 'Normal', flexion_g: 'Flexion gauche', flexion_d: 'Flexion droite', genu_valgum: 'Genu valgum', genu_varum: 'Genu varum' },
    bassin: { absent: 'Absent', gauche: 'Gauche', droit: 'Droite' },
    ceinture_scapulaire: { absent: 'Absente', gauche: 'Gauche', droit: 'Droite' },
  }

  // En-têtes colonnes tableau
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS_CLAIR)
  doc.text('Paramètre', ml + 2, y)
  doc.text('Résultat', ml + cw / 2, y)
  y += 3
  doc.setDrawColor(...GRIS_CLAIR)
  doc.setLineWidth(0.3)
  doc.line(ml, y, W - mr, y)
  y += 3

  sectionTitle('Examen tégumentaire')
  tableauRow('Infection tégumentaire', LABELS.infection_tegumentaire[bilan.infection_tegumentaire], bilan.infection_tegumentaire === 'aucune')
  tableauRow('Hyperkératose', LABELS.hyperkeratose[bilan.hyperkeratose], bilan.hyperkeratose === 'aucune')
  tableauRow('État des ongles', LABELS.ongles[bilan.ongles], bilan.ongles === 'normaux')
  tableauRow('Déformations', LABELS.deformations[bilan.deformations], bilan.deformations === 'aucune', true)

  y += 6
  sectionTitle('Examen postural et morphostatique')
  tableauRow('Valgus calcanéen', LABELS.valgus_calcaneen[bilan.valgus_calcaneen], bilan.valgus_calcaneen === 'absent')
  tableauRow('Patellas', LABELS.patellas[bilan.patellas], bilan.patellas === 'zenith')
  tableauRow('Genou', LABELS.genou[bilan.genou], bilan.genou === 'normal')
  tableauRow('Bassin', LABELS.bassin[bilan.bassin], bilan.bassin === 'absent')
  tableauRow('Ceinture scapulaire', LABELS.ceinture_scapulaire[bilan.ceinture_scapulaire], bilan.ceinture_scapulaire === 'absent', true)

  // ── Conclusion rédigée ──────────────────────────────────────
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...BLEU)
  doc.text('CONCLUSION ET TRAITEMENT', ml, y)
  y += 2
  doc.setDrawColor(...BLEU)
  doc.setLineWidth(0.5)
  doc.line(ml, y, ml + 55, y)
  doc.setDrawColor(...GRIS_CLAIR)
  doc.line(ml + 55, y, W - mr, y)
  y += 7

  // Textes rédigés
  const infecMap: Record<string,string> = {
    aucune: "Aucune infection tégumentaire n'est mise en évidence sur les faces plantaire et dorsale des deux pieds.",
    mycose: "Une mycose est observée au niveau des pieds.",
    verrue: "La présence de verrue(s) est notée.",
    intertrigo: "Un intertrigo interdigital est présent."
  }
  const hkMap: Record<string,string> = {
    aucune: "Aucune hyperkératose notable n'est relevée.",
    plantaire: "Une hyperkératose plantaire est observée.",
    cors: "Des cors et/ou durillons sont présents.",
    talons: "Des fissures talonnières sont constatées."
  }
  const onglesMap: Record<string,string> = {
    normaux: "Les ongles présentent un aspect normal.",
    dystrophie: "Une onychodystrophie est mise en évidence.",
    incarne: "Un ou plusieurs ongles incarnés sont relevés.",
    onychogryphose: "Une onychogryphose est constatée."
  }
  const deformMap: Record<string,string> = {
    aucune: "Aucune déformation osseuse ou articulaire notoire n'est observée.",
    hallux: "Un hallux valgus est noté.",
    orteils: "Des orteils en griffe sont présents.",
    pied_plat: "Un pied plat est observé.",
    pied_creux: "Un pied creux est observé."
  }
  const valgusMap: Record<string,string> = { bilateral: 'un valgus calcanéen bilatéral', droit: 'un valgus calcanéen droit', gauche: 'un valgus calcanéen gauche' }
  const patellaMap: Record<string,string> = { zenith: 'les patellas sont orientées au zénith', internes: 'les patellas sont orientées en dedans', externes: 'les patellas sont orientées en dehors' }
  const genouMap: Record<string,string> = { flexion_g: 'une légère flexion du genou gauche', flexion_d: 'une légère flexion du genou droit', genu_valgum: 'un genu valgum', genu_varum: 'un genu varum' }
  const bassinMap: Record<string,string> = { gauche: 'une bascule du bassin gauche', droit: 'une bascule du bassin droite' }
  const scapMap: Record<string,string> = { gauche: 'une bascule de la ceinture scapulaire gauche', droit: 'une bascule compensatrice de la ceinture scapulaire droite' }

  const tegText = [infecMap[bilan.infection_tegumentaire], hkMap[bilan.hyperkeratose], onglesMap[bilan.ongles], deformMap[bilan.deformations]].filter(Boolean).join(' ')
  const elems = [valgusMap[bilan.valgus_calcaneen], patellaMap[bilan.patellas], genouMap[bilan.genou], bassinMap[bilan.bassin], scapMap[bilan.ceinture_scapulaire]].filter(Boolean)
  const posturalText = elems.length > 0
    ? `L'examen postural et morphostatique révèle : ${elems.join(', ')}.`
    : "L'examen postural et morphostatique ne révèle aucune anomalie notable."

  const correcteurs: string[] = []
  if (bilan.semelles_hci) correcteurs.push('une hémi-coupole interne (HCI) bilatérale')
  if (bilan.semelles_hce) correcteurs.push('une hémi-coupole externe (HCE) bilatérale')
  if (bilan.semelles_barre) correcteurs.push('une barre métatarsale')
  if (bilan.semelles_coins) correcteurs.push('des coins de talonnière')
  if (bilan.talonnette_cote !== 'aucune' && bilan.talonnette_mm) {
    const cl: Record<string,string> = { gauche: 'gauche', droite: 'droite', bilat: 'bilatérale' }
    correcteurs.push(`une talonnette ${cl[bilan.talonnette_cote]} de ${bilan.talonnette_mm} mm`)
  }
  const traitText = correcteurs.length > 0
    ? `Confection d'une paire de semelles orthopédiques sur mesure comportant ${correcteurs.join(', ')}.`
    : "Aucun traitement orthopédique par semelles n'est prescrit à ce stade."

  const fullText = `${tegText} ${posturalText} ${traitText}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...NOIR)
  const lines = doc.splitTextToSize(fullText, cw)
  doc.text(lines, ml, y)
  y += lines.length * 5.5

  if (bilan.remarques) {
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text('OBSERVATIONS', ml, y)
    y += 5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...NOIR)
    const remarquesLines = doc.splitTextToSize(bilan.remarques, cw)
    doc.text(remarquesLines, ml, y)
    y += remarquesLines.length * 5.5
  }

  // ── Signature ───────────────────────────────────────────────
  const signY = 265
  doc.setDrawColor(...GRIS_CLAIR)
  doc.setLineWidth(0.3)
  doc.line(W - mr - 55, signY, W - mr, signY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text('Arthur Le Neué', W - mr - 27, signY + 5, { align: 'center' })

  // ── Pied de page ────────────────────────────────────────────
  doc.setDrawColor(...GRIS_CLAIR)
  doc.setLineWidth(0.3)
  doc.line(ml, 280, W - mr, 280)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...GRIS_CLAIR)
  doc.text('Pédicure Podologue conventionné · Dispensé de TVA — Art. 261-4-1° du CGI', W / 2, 285, { align: 'center' })

  return doc
}
