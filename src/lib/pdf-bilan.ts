import jsPDF from 'jspdf'
import { Bilan, Patient } from '@/types'

import { SIGNATURE_B64 } from './signature'

export function genererPDFBilan(bilan: Bilan, patient: Patient): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const ml = 20
  const mr = 20
  const cw = W - ml - mr

  const N: [number,number,number] = [20, 20, 20]
  const G: [number,number,number] = [140, 140, 140]
  const GL: [number,number,number] = [210, 210, 210]
  const B: [number,number,number] = [37, 99, 235]
  const BG: [number,number,number] = [239, 246, 255]

  // ── En-tête ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...N)
  doc.text('Arthur Le Neué', ml, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...G)
  doc.text('Pédicure Podologue DE  ·  4 rue saint Just, 93210 La Plaine Saint Denis', ml, 23)
  doc.text('06 89 40 51 05  ·  Arthur.leneue@gmail.com', ml, 28)

  doc.setFontSize(7.5)
  doc.setTextColor(...GL)
  doc.text('N° RPPS : 10111902820  ·  N° AM : 938002623', W - mr, 23, { align: 'right' })

  doc.setDrawColor(...GL)
  doc.setLineWidth(0.4)
  doc.line(ml, 33, W - mr, 33)

  // ── Titre ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(...N)
  doc.text('Bilan', ml, 50)
  doc.setFont('helvetica', 'normal')
  doc.text('podologique', ml + 45, 50)

  const dateBilan = new Date(bilan.date_bilan).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  doc.setFontSize(9)
  doc.setTextColor(...G)
  doc.text(dateBilan, ml, 57)

  // ── Patient ─────────────────────────────────────────────────
  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const ddn = patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-FR') : null
  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25*24*3600*1000))
    : null

  doc.setFillColor(...BG)
  doc.roundedRect(ml, 63, cw, 22, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...B)
  doc.text(`${civilite} ${patient.nom} ${patient.prenom}`, ml + 7, 72)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...G)
  const sub = [ddn && `Né(e) le ${ddn}`, age && `${age} ans`, patient.num_secu && `N° SS : ${patient.num_secu}`, patient.mutuelle].filter(Boolean).join('   ·   ')
  doc.text(sub, ml + 7, 79)

  // ── Tableau ─────────────────────────────────────────────────
  let y = 95

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

  const sectionHead = (titre: string) => {
    doc.setFillColor(...B)
    doc.rect(ml, y, cw, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(titre.toUpperCase(), ml + 5, y + 5.5)
    y += 8
  }

  const row = (label: string, val: string, normal: boolean, even: boolean) => {
    const rh = 9
    if (even) {
      doc.setFillColor(249, 250, 251)
      doc.rect(ml, y, cw, rh, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...G)
    doc.text(label, ml + 5, y + 6)
    doc.setFont('helvetica', normal ? 'normal' : 'bold')
    doc.setTextColor(normal ? G[0] : N[0], normal ? G[1] : N[1], normal ? G[2] : N[2])
    doc.text(val, ml + 95, y + 6)
    if (!normal) {
      doc.setFillColor(...B)
      doc.circle(ml + cw - 5, y + 4.5, 2, 'F')
    }
    doc.setDrawColor(...GL)
    doc.setLineWidth(0.2)
    doc.line(ml, y + rh, ml + cw, y + rh)
    y += rh
  }

  sectionHead('Examen tégumentaire')
  row('Infection tégumentaire', LABELS.infection_tegumentaire[bilan.infection_tegumentaire], bilan.infection_tegumentaire === 'aucune', false)
  row('Hyperkératose', LABELS.hyperkeratose[bilan.hyperkeratose], bilan.hyperkeratose === 'aucune', true)
  row('État des ongles', LABELS.ongles[bilan.ongles], bilan.ongles === 'normaux', false)
  row('Déformations', LABELS.deformations[bilan.deformations], bilan.deformations === 'aucune', true)

  y += 4
  sectionHead('Examen postural et morphostatique')
  row('Valgus calcanéen', LABELS.valgus_calcaneen[bilan.valgus_calcaneen], bilan.valgus_calcaneen === 'absent', false)
  row('Patellas', LABELS.patellas[bilan.patellas], bilan.patellas === 'zenith', true)
  row('Genou', LABELS.genou[bilan.genou], bilan.genou === 'normal', false)
  row('Bassin', LABELS.bassin[bilan.bassin], bilan.bassin === 'absent', true)
  row('Ceinture scapulaire', LABELS.ceinture_scapulaire[bilan.ceinture_scapulaire], bilan.ceinture_scapulaire === 'absent', false)

  // ── Traitement ───────────────────────────────────────────────
  y += 4
  sectionHead('Traitement orthopédique')

  const correcteurs: string[] = []
  if (bilan.semelles_hci) correcteurs.push('Hémi-coupole interne (HCI) bilatérale')
  if (bilan.semelles_hce) correcteurs.push('Hémi-coupole externe (HCE) bilatérale')
  if (bilan.semelles_barre) correcteurs.push('Barre métatarsale')
  if (bilan.semelles_coins) correcteurs.push('Coins de talonnière')
  if (bilan.talonnette_cote !== 'aucune' && bilan.talonnette_mm) {
    const cl: Record<string,string> = { gauche: 'gauche', droite: 'droite', bilat: 'bilatérale' }
    correcteurs.push(`Talonnette ${cl[bilan.talonnette_cote]} de ${bilan.talonnette_mm} mm`)
  }

  if (correcteurs.length === 0) {
    row('Semelles orthopédiques', 'Aucune prescription', true, false)
  } else {
    correcteurs.forEach((c, i) => row(i === 0 ? 'Semelles orthopédiques' : '', c, false, i % 2 === 1))
  }

  // ── Conclusion rédigée ──────────────────────────────────────
  y += 8

  doc.setDrawColor(...B)
  doc.setLineWidth(1)
  doc.line(ml, y, ml + 8, y)
  doc.setLineWidth(0.2)
  doc.setDrawColor(...GL)
  doc.line(ml + 10, y, W - mr, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...B)
  doc.text('SYNTHÈSE', ml, y + 6)
  y += 11

  const infecMap: Record<string,string> = { aucune: "Aucune infection tégumentaire n'est mise en évidence.", mycose: "Une mycose est observée au niveau des pieds.", verrue: "La présence de verrue(s) est notée.", intertrigo: "Un intertrigo interdigital est présent." }
  const hkMap: Record<string,string> = { aucune: "Aucune hyperkératose notable n'est relevée.", plantaire: "Une hyperkératose plantaire est observée.", cors: "Des cors et/ou durillons sont présents.", talons: "Des fissures talonnières sont constatées." }
  const onglesMap: Record<string,string> = { normaux: "Les ongles présentent un aspect normal.", dystrophie: "Une onychodystrophie est mise en évidence.", incarne: "Un ou plusieurs ongles incarnés sont relevés.", onychogryphose: "Une onychogryphose est constatée." }
  const deformMap: Record<string,string> = { aucune: "Aucune déformation notoire n'est observée.", hallux: "Un hallux valgus est noté.", orteils: "Des orteils en griffe sont présents.", pied_plat: "Un pied plat est observé.", pied_creux: "Un pied creux est observé." }
  const valgusMap: Record<string,string> = { bilateral: 'un valgus calcanéen bilatéral', droit: 'un valgus calcanéen droit', gauche: 'un valgus calcanéen gauche' }
  const patellaMap: Record<string,string> = { zenith: 'les patellas sont orientées au zénith', internes: 'les patellas orientées en dedans', externes: 'les patellas orientées en dehors' }
  const genouMap: Record<string,string> = { flexion_g: 'une légère flexion du genou gauche', flexion_d: 'une légère flexion du genou droit', genu_valgum: 'un genu valgum', genu_varum: 'un genu varum' }
  const bassinMap: Record<string,string> = { gauche: 'une bascule du bassin gauche', droit: 'une bascule du bassin droite' }
  const scapMap: Record<string,string> = { gauche: 'une bascule de la ceinture scapulaire gauche', droit: 'une bascule compensatrice de la ceinture scapulaire droite' }

  const elems = [valgusMap[bilan.valgus_calcaneen], patellaMap[bilan.patellas], genouMap[bilan.genou], bassinMap[bilan.bassin], scapMap[bilan.ceinture_scapulaire]].filter(Boolean)
  const posturalText = elems.length > 0 ? `L'examen postural révèle : ${elems.join(', ')}.` : "L'examen postural ne révèle aucune anomalie notable."
  const traitText = correcteurs.length > 0
    ? `Traitement : confection d'une paire de semelles orthopédiques sur mesure comportant ${correcteurs.map(c => c.toLowerCase()).join(', ')}.`
    : "Aucun traitement orthopédique par semelles n'est prescrit."

  const fullText = `${infecMap[bilan.infection_tegumentaire]} ${hkMap[bilan.hyperkeratose]} ${onglesMap[bilan.ongles]} ${deformMap[bilan.deformations]} ${posturalText} ${traitText}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...N)
  const lines = doc.splitTextToSize(fullText, cw)
  doc.text(lines, ml, y)
  y += lines.length * 5.5 + 4

  if (bilan.remarques) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...G)
    const rLines = doc.splitTextToSize(`Observations : ${bilan.remarques}`, cw)
    doc.text(rLines, ml, y)
  }

  // ── Signature ───────────────────────────────────────────────
  try { doc.addImage(SIGNATURE_B64, 'PNG', W - mr - 48, 248, 48, 22) } catch(e) {}
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...G)
  doc.text('Arthur Le Neué', W - mr - 24, 274, { align: 'center' })

  // ── Footer ──────────────────────────────────────────────────
  // Signature
  try {
    const sigBase64 = SIGNATURE_B64.split(',')[1]
    doc.addImage(sigBase64, 'PNG', W - mr - 45, 248, 40, 25)
  } catch {}

  doc.setDrawColor(...GL)
  doc.setLineWidth(0.2)
  doc.line(ml, 278, W - mr, 278)
  doc.setFontSize(7)
  doc.setTextColor(...GL)
  doc.text('Pédicure Podologue conventionné  ·  Dispensé de TVA — Art. 261-4-1° du CGI', W / 2, 283, { align: 'center' })

  return doc
}
