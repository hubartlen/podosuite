'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Download, Save } from 'lucide-react'
import { Patient } from '@/types'

interface Acte { designation: string; quantite: number; prix_unitaire: number }

const TARIFS: Record<string, Acte[]> = {
  'saint-denis': [
    { designation: 'Soin de pédicurie au cabinet', quantite: 1, prix_unitaire: 38 },
    { designation: 'Soin de pédicurie + massage relaxant 20min', quantite: 1, prix_unitaire: 55 },
    { designation: 'Soin de pédicurie à domicile', quantite: 1, prix_unitaire: 44 },
    { designation: 'Soin de pédicurie diabétique POD (avec ordonnance)', quantite: 1, prix_unitaire: 30 },
    { designation: "Pose d'orthonixie (appareil correcteur)", quantite: 1, prix_unitaire: 35 },
    { designation: "Pose d'onychoplastie (faux ongle)", quantite: 1, prix_unitaire: 35 },
    { designation: 'Traitement verrue verrucide (la séance)', quantite: 1, prix_unitaire: 25 },
    { designation: 'Traitement verrue cryothérapie (la séance)', quantite: 1, prix_unitaire: 35 },
    { designation: 'Bilan podologique', quantite: 1, prix_unitaire: 50 },
    { designation: 'Semelles orthopédiques (supérieur à 37)', quantite: 1, prix_unitaire: 150 },
    { designation: 'Semelles orthopédiques (entre 28 et 37)', quantite: 1, prix_unitaire: 140 },
    { designation: 'Semelles orthopédiques (inférieur à 28)', quantite: 1, prix_unitaire: 135 },
  ],
  'livry-gargan': [
    { designation: 'Soin de pédicurie', quantite: 1, prix_unitaire: 45 },
    { designation: 'Bilan podologique + semelles orthopédiques', quantite: 1, prix_unitaire: 190 },
  ],
}

export default function NewFactureClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [cabinet, setCabinet] = useState('saint-denis')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lastFacture, setLastFacture] = useState<any>(null)
  const [dateFact, setDateFact] = useState(new Date().toISOString().split('T')[0])
  const [modePaiement, setModePaiement] = useState('Chèque')
  const [mention, setMention] = useState('')
  const [actes, setActes] = useState<Acte[]>([TARIFS['saint-denis'][0]])
  const [annee, setAnnee] = useState(new Date().getFullYear().toString())
  const [seq, setSeq] = useState(1)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      if (data) setPatients(data)
      // Récupérer le dernier numéro de facture pour éviter les doublons
      const { data: lastFactures } = await supabase
        .from('factures')
        .select('numero')
        .eq('praticien_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (lastFactures && lastFactures.length > 0) {
        const lastNum = lastFactures[0].numero
        const parts = lastNum.split('-')
        const lastSeq = parseInt(parts[parts.length - 1]) || 0
        setSeq(lastSeq + 1)
      } else {
        setSeq(1)
      }
    }
    load()
  }, [])

  const numero = `FAC-${annee}-${String(seq).padStart(4, '0')}`
  const total = actes.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)

  const handleCabinetChange = (val: string) => {
    setCabinet(val)
    setActes([TARIFS[val][0]])
  }

  const ajouterActe = (designation: string) => {
    if (!designation) return
    const tarif = TARIFS[cabinet].find(t => t.designation === designation)
    if (tarif) setActes(a => [...a, { ...tarif }])
  }

  const removeActe = (i: number) => setActes(a => a.filter((_, idx) => idx !== i))
  const updateQte = (i: number, v: number) => setActes(a => a.map((acte, idx) => idx === i ? { ...acte, quantite: v } : acte))
  const updatePrix = (i: number, v: number) => setActes(a => a.map((acte, idx) => idx === i ? { ...acte, prix_unitaire: v } : acte))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: facture, error } = await supabase.from('factures').insert({
      patient_id: patientId, praticien_id: session.user.id, numero,
      date_facture: dateFact, actes, mode_paiement: modePaiement,
      mention: mention || null, total, cabinet,
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }
    if (dl && facture) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFFacture } = await import('@/lib/pdf-facture')
      const doc = genererPDFFacture(facture, patient)
      doc.save(`Facture_${numero}_${patient.nom}_${patient.prenom}.pdf`)
    }
    setSaved(true)
    setLastFacture(facture)
    const patient = patients.find(p => p.id === patientId)
    if (patient?.email) setEmailTo(patient.email)
    setLoading(false)
  }

  const sendEmail = async () => {
    if (!emailTo || !lastFacture) return
    setSending(true)
    const patient = patients.find(p => p.id === patientId)!
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    const doc = genererPDFFacture(lastFacture, patient)
    const pdfBase64 = doc.output('datauristring').split(',')[1]
    const res = await fetch('/api/send-facture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, facture: lastFacture, patient, pdfBase64 })
    })
    if (res.ok) { setEmailSent(true) } else { alert('Erreur envoi email') }
    setSending(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 pt-4 pb-2">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1 text-slate-400 text-sm mb-4">
          <ArrowLeft size={14} /> Retour
        </Link>
        <h1 className="text-xl font-bold text-slate-900 mb-5">Nouvelle facture</h1>
      </div>

      <div className="px-4 space-y-4 pb-8">

        {/* Cabinet */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cabinet</p>
          <div className="grid grid-cols-2 gap-2">
            {[['saint-denis', 'Saint-Denis'], ['livry-gargan', 'Livry-Gargan']].map(([val, label]) => (
              <button key={val} onClick={() => handleCabinetChange(val)}
                className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-colors ${
                  cabinet === val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-600'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Patient & date */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient & date</p>
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">Patient *</label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">Date</label>
              <input type="date" value={dateFact} onChange={e => setDateFact(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">Paiement</label>
              <select value={modePaiement} onChange={e => setModePaiement(e.target.value)}
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Chèque','Espèces','Carte bancaire','Virement','Tiers payant'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <span className="text-xs text-slate-400">N° facture : </span>
            <span className="text-sm font-semibold text-blue-600">{numero}</span>
          </div>
        </div>

        {/* Actes */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actes</p>

          {/* Ajouter depuis tarif */}
          <div className="mb-4">
            <select onChange={e => { ajouterActe(e.target.value); e.target.value = '' }}
              className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">+ Ajouter un acte du tarif...</option>
              {TARIFS[cabinet].map(t => (
                <option key={t.designation} value={t.designation}>{t.designation} — {t.prix_unitaire} €</option>
              ))}
            </select>
          </div>

          {/* Liste des actes - vertical */}
          <div className="space-y-3">
            {actes.map((a, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-slate-800 flex-1 pr-2">{a.designation}</p>
                  <button onClick={() => removeActe(i)} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={16}/>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Quantité</label>
                    <input type="number" min={1} value={a.quantite} onChange={e => updateQte(i, parseInt(e.target.value)||1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 mb-1 block">Prix (€)</label>
                    <input type="number" step="0.01" min={0} value={a.prix_unitaire} onChange={e => updatePrix(i, parseFloat(e.target.value)||0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"/>
                  </div>
                  <div className="flex-1 text-right">
                    <label className="text-xs text-slate-400 mb-1 block">Total</label>
                    <p className="text-sm font-bold text-slate-900 py-2">{(a.quantite * a.prix_unitaire).toFixed(2)} €</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-900">Total</span>
              <span className="text-xl font-bold text-blue-600">{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Mention */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Mention complémentaire</label>
          <textarea value={mention} onChange={e => setMention(e.target.value)}
            placeholder="ex. Reçu pour remboursement mutuelle..." rows={2}
            className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
        </div>

        {saved && (
          <div className="space-y-3">
            <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-2xl border border-emerald-200 flex items-center gap-2">
              <span>✓</span> Facture enregistrée
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Envoyer par email</p>
              <div className="flex gap-2">
                <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                  placeholder="email@patient.com"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <button onClick={sendEmail} disabled={sending || !emailTo || emailSent}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                  {emailSent ? '✓ Envoyé' : sending ? '...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="space-y-2">
          <button onClick={() => handleSubmit(true)} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50">
            <Download size={18}/>{loading ? 'Enregistrement...' : 'Enregistrer + Télécharger PDF'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50">
            <Save size={16}/>Enregistrer sans PDF
          </button>
        </div>

      </div>
    </div>
  )
}
