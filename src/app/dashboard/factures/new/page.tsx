'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Download, Save } from 'lucide-react'
import { Patient } from '@/types'

interface Acte { designation: string; quantite: number; prix_unitaire: number }

export default function NewFacturePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    date_facture: new Date().toISOString().split('T')[0],
    mode_paiement: 'Chèque',
    mention: '',
  })
  const [actes, setActes] = useState<Acte[]>([
    { designation: 'Séance de soins podologiques', quantite: 1, prix_unitaire: 35 }
  ])
  const [annee, setAnnee] = useState(new Date().getFullYear().toString())
  const [seq, setSeq] = useState(1)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', user!.id).order('nom')
      if (data) setPatients(data)
      const { count } = await supabase.from('factures').select('*', { count: 'exact', head: true }).eq('praticien_id', user!.id)
      setSeq((count ?? 0) + 1)
    }
    load()
  }, [])

  const numero = `FAC-${annee}-${String(seq).padStart(4, '0')}`
  const total = actes.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)
  const secu = total * 0.7
  const patient_part = total - secu

  const addActe = () => setActes(a => [...a, { designation: '', quantite: 1, prix_unitaire: 0 }])
  const removeActe = (i: number) => setActes(a => a.filter((_, idx) => idx !== i))
  const updateActe = (i: number, k: keyof Acte, v: any) =>
    setActes(a => a.map((acte, idx) => idx === i ? { ...acte, [k]: v } : acte))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    if (actes.length === 0) { alert('Ajoute au moins un acte'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: facture, error } = await supabase.from('factures').insert({
      patient_id: patientId,
      praticien_id: user!.id,
      numero,
      date_facture: form.date_facture,
      actes,
      mode_paiement: form.mode_paiement,
      mention: form.mention || null,
      total,
    }).select().single()

    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }

    if (dl && facture) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFFacture } = await import('@/lib/pdf-facture')
      const doc = genererPDFFacture(facture, patient)
      doc.save(`Facture_${numero}_${patient.nom}_${patient.prenom}.pdf`)
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push(`/dashboard/patients/${patientId}`), 800)
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/patients" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15}/> Retour
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Nouvelle facture</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Référence</p>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Année</label>
            <input type="text" value={annee} onChange={e => setAnnee(e.target.value)} maxLength={4}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">N° séquentiel</label>
            <input type="number" value={seq} onChange={e => setSeq(parseInt(e.target.value))} min={1}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
            <input type="date" value={form.date_facture} onChange={e => setForm(f => ({ ...f, date_facture: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-4 py-2.5">
          <span className="text-xs text-slate-500">Numéro généré : </span>
          <span className="text-sm font-semibold text-blue-600">{numero}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Patient</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient <span className="text-red-500">*</span></label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode de paiement</label>
            <select value={form.mode_paiement} onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Chèque','Espèces','Carte bancaire','Virement','Tiers payant'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actes</p>
          <button type="button" onClick={addActe}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={13}/> Ajouter un acte
          </button>
        </div>

        <div className="mb-2 grid grid-cols-12 gap-2 px-1">
          {['Désignation','Qté','Prix unit.',''].map((h, i) => (
            <div key={i} className={`text-xs font-medium text-slate-400 ${i === 0 ? 'col-span-6' : i === 3 ? 'col-span-1' : 'col-span-2'}`}>{h}</div>
          ))}
          <div className="col-span-1 text-xs font-medium text-slate-400 text-right">Total</div>
        </div>

        <div className="space-y-2">
          {actes.map((a, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input className="col-span-6 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={a.designation} onChange={e => updateActe(i, 'designation', e.target.value)} placeholder="Désignation"/>
              <input className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number" min={1} value={a.quantite} onChange={e => updateActe(i, 'quantite', parseInt(e.target.value) || 1)}/>
              <input className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number" step="0.01" min={0} value={a.prix_unitaire} onChange={e => updateActe(i, 'prix_unitaire', parseFloat(e.target.value) || 0)}/>
              <button type="button" onClick={() => removeActe(i)} className="col-span-1 flex justify-center text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={14}/>
              </button>
              <div className="col-span-1 text-sm font-medium text-slate-700 text-right">{(a.quantite * a.prix_unitaire).toFixed(2)} €</div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between text-sm text-slate-500"><span>Sous-total</span><span>{total.toFixed(2)} €</span></div>
          <div className="flex justify-between text-sm text-slate-500"><span>Part Sécu (70%)</span><span>{secu.toFixed(2)} €</span></div>
          <div className="flex justify-between text-sm text-slate-500"><span>Part patient</span><span>{patient_part.toFixed(2)} €</span></div>
          <div className="flex justify-between text-base font-semibold text-slate-800 pt-1.5 border-t border-slate-200">
            <span>Total TTC</span><span>{total.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Mention complémentaire</label>
        <textarea value={form.mention} onChange={e => setForm(f => ({ ...f, mention: e.target.value }))}
          placeholder="ex. Reçu pour remboursement mutuelle, bon de prise en charge..."
          rows={2}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
      </div>

      {saved && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200 mb-4">
          Facture enregistrée. Redirection...
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => handleSubmit(false)} disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          <Save size={15}/>{loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button onClick={() => handleSubmit(true)} disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          <Download size={15}/>Enregistrer + PDF
        </button>
        <Link href="/dashboard/patients"
          className="px-5 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          Annuler
        </Link>
      </div>
    </div>
  )
}
