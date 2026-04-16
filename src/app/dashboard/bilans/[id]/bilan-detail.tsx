'use client'
import { Download, User, Calendar, FileText } from 'lucide-react'
import { Bilan, Patient } from '@/types'

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
  talonnette_cote: { aucune: 'Aucune', gauche: 'Gauche', droite: 'Droite', bilat: 'Bilatérale' },
}

const Badge = ({ value, normal }: { value: string; normal: boolean }) => (
  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
    normal ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'
  }`}>{value}</span>
)

const Row = ({ label, value, isNormal }: { label: string; value: string; isNormal: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <Badge value={value} normal={isNormal} />
  </div>
)

export default function BilanDetail({ bilan, patient }: { bilan: Bilan & { patient: Patient }; patient: Patient }) {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const handleDownload = async () => {
    const { genererPDFBilan } = await import('@/lib/pdf-bilan')
    const doc = genererPDFBilan(bilan, patient)
    doc.save(`Bilan_${patient.nom}_${patient.prenom}_${bilan.date_bilan}.pdf`)
  }

  const civilite = patient.sexe === 'M' ? 'M.' : 'Mme'
  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const semelles = [
    bilan.semelles_hci && 'HCI',
    bilan.semelles_hce && 'HCE',
    bilan.semelles_barre && 'Barre métatarsale',
    bilan.semelles_coins && 'Coins de talonnière',
  ].filter(Boolean)

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Bilan podologique</h1>
          <p className="text-slate-500 text-sm mt-1">{fmtDate(bilan.date_bilan)}</p>
        </div>
        <button onClick={handleDownload}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Download size={15} /> Télécharger PDF
        </button>
      </div>

      {/* Aperçu visuel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
        {/* En-tête bleu */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Arthur Le Neué — Pédicure Podologue DE</p>
            <p className="text-blue-200 text-xs mt-0.5">4 rue saint Just, 93210 La Plaine Saint Denis</p>
          </div>
          <p className="text-white font-bold text-sm">BILAN PODOLOGIQUE</p>
        </div>

        {/* Patient */}
        <div className="bg-blue-50 px-6 py-3 flex items-center justify-between border-b border-blue-100">
          <div className="flex items-center gap-2">
            <User size={14} className="text-blue-600" />
            <span className="font-semibold text-blue-800 text-sm">{civilite} {patient.nom} {patient.prenom}</span>
            {age && <span className="text-blue-600 text-xs">· {age} ans</span>}
          </div>
          <div className="flex items-center gap-1.5 text-blue-600 text-xs">
            <Calendar size={12} />
            {fmtDate(bilan.date_bilan)}
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Examen tégumentaire */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText size={11} /> Examen tégumentaire
            </p>
            <div className="space-y-0">
              <Row label="Infection" value={LABELS.infection_tegumentaire[bilan.infection_tegumentaire]} isNormal={bilan.infection_tegumentaire === 'aucune'} />
              <Row label="Hyperkératose" value={LABELS.hyperkeratose[bilan.hyperkeratose]} isNormal={bilan.hyperkeratose === 'aucune'} />
              <Row label="Ongles" value={LABELS.ongles[bilan.ongles]} isNormal={bilan.ongles === 'normaux'} />
              <Row label="Déformations" value={LABELS.deformations[bilan.deformations]} isNormal={bilan.deformations === 'aucune'} />
            </div>
          </div>

          {/* Examen morphostatique */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText size={11} /> Examen morphostatique
            </p>
            <div className="space-y-0">
              <Row label="Valgus calcanéen" value={LABELS.valgus_calcaneen[bilan.valgus_calcaneen]} isNormal={bilan.valgus_calcaneen === 'absent'} />
              <Row label="Patellas" value={LABELS.patellas[bilan.patellas]} isNormal={bilan.patellas === 'zenith'} />
              <Row label="Genou" value={LABELS.genou[bilan.genou]} isNormal={bilan.genou === 'normal'} />
              <Row label="Bassin" value={LABELS.bassin[bilan.bassin]} isNormal={bilan.bassin === 'absent'} />
              <Row label="Ceinture scapulaire" value={LABELS.ceinture_scapulaire[bilan.ceinture_scapulaire]} isNormal={bilan.ceinture_scapulaire === 'absent'} />
            </div>
          </div>
        </div>

        {/* Traitement */}
        <div className="px-6 pb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Traitement orthopédique</p>
          <div className="bg-slate-50 rounded-xl p-4">
            {semelles.length === 0 && bilan.talonnette_cote === 'aucune' ? (
              <p className="text-sm text-slate-400">Aucun traitement prescrit</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {semelles.map(s => (
                  <span key={s as string} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-medium">{s as string}</span>
                ))}
                {bilan.talonnette_cote !== 'aucune' && bilan.talonnette_mm && (
                  <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-xs font-medium">
                    Talonnette {LABELS.talonnette_cote[bilan.talonnette_cote]} {bilan.talonnette_mm}mm
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {bilan.remarques && (
          <div className="px-6 pb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Observations</p>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">{bilan.remarques}</p>
          </div>
        )}
      </div>
    </>
  )
}
