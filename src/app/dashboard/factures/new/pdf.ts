export async function pdfFacture(facture: any, patient: any, praticien: any, cabinet?: any) {
  const { genererPDFFacture } = await import('@/lib/pdf-facture')
  return genererPDFFacture(facture, patient, praticien)
}
