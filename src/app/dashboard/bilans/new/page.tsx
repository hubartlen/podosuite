'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Save } from 'lucide-react'
import { Patient } from '@/types'

const Toggle = ({ label, group, options, value, onChange }: any) => (
  <div className="mb-4">
    <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map(([val, txt]: [string, string]) => (
        <button key={val} type="button" onClick={() => onChange(val)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === val
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}>
          {txt}
        </button>
      ))}
    </div>
  </div>
)

const Check = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-2.5 cursor-pointer group">
    <div onClick={onChange}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
        checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-slate-400'
      }`}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <span className="text-sm text-slate-700">{label}</span>
  </label>
)

export default function NewBilanPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    date_bilan: new Date().toISOString().split('T')[0],
    infection_tegumentaire: 'aucune',
    hyperkeratose: 'aucune',
    ongles: 'normaux',
    deformations: 'aucune',
    valgus_calcaneen: 'absent',
    patellas: 'zenith',
    genou: 'normal',
    bassin: 'absent',
    ceinture_scapulaire: 'absent',
    semelles_hci: false,
    semelles_hce: false,
    semelles_barre: false,
    semelles_coins: false,
    talonnette_cote: 'aucune',
    talonnette_mm: '',
    remarques: '',
  })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', user!.id).order('nom')
      if (data) setPatients(data)
    }
    load()
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: bilan, error } = await supabase.from('bilans').insert({
      patient_id: patientId,
      praticien_id: user!.id,
      ...form,
      talonnette_mm: form.talonnette_mm ? parseInt(form.talonnette_mm) : null,
    }).select().single()

    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }

    if (dl && bilan) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFBilan } = await import('@/lib/pdf-bilan')
      const doc = genererPDFBilan(bilan, patient)
      doc.save(`Bilan_${patient.nom}_${patient.prenom}_${form.date_bilan}.pdf`)
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => router.push(`/dashboard/patients/${patientId}`), 800)
  }

  const patient = patients.find(p => p.id === patientId)

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/patients" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15}/> Retour
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Nouveau bilan podologique</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Patient & date</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient <span className="text-red-500">*</span></label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date du bilan</label>
            <input type="date" value={form.date_bilan} onChange={e => set('date_bilan', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Examen tégumentaire</p>
        <Toggle label="Infection tégumentaire" value={form.infection_tegumentaire} onChange={(v: string) => set('infection_tegumentaire', v)}
          options={[['aucune','Aucune'],['mycose','Mycose'],['verrue','Verrue(s)'],['intertrigo','Intertrigo']]}/>
        <Toggle label="Hyperkératose" value={form.hyperkeratose} onChange={(v: string) => set('hyperkeratose', v)}
          options={[['aucune','Aucune'],['plantaire','Plantaire'],['cors','Cors / Durillons'],['talons','Talons fissurés']]}/>
        <Toggle label="Ongles" value={form.ongles} onChange={(v: string) => set('ongles', v)}
          options={[['normaux','Normaux'],['dystrophie','Onychodystrophie'],['incarne','Ongle incarné'],['onychogryphose','Onychogryphose']]}/>
        <Toggle label="Déformations" value={form.deformations} onChange={(v: string) => set('deformations', v)}
          options={[['aucune','Aucune notoire'],['hallux','Hallux valgus'],['orteils','Orteils en griffe'],['pied_plat','Pied plat'],['pied_creux','Pied creux']]}/>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Examen postural et morphostatique</p>
        <Toggle label="Valgus calcanéen" value={form.valgus_calcaneen} onChange={(v: string) => set('valgus_calcaneen', v)}
          options={[['absent','Absent'],['bilateral','Bilatéral'],['droit','Droit'],['gauche','Gauche']]}/>
        <Toggle label="Patellas" value={form.patellas} onChange={(v: string) => set('patellas', v)}
          options={[['zenith','Au zénith'],['internes','En dedans'],['externes','En dehors']]}/>
        <Toggle label="Genou" value={form.genou} onChange={(v: string) => set('genou', v)}
          options={[['normal','Normal'],['flexion_g','Flexion gauche'],['flexion_d','Flexion droite'],['genu_valgum','Genu valgum'],['genu_varum','Genu varum']]}/>
        <div className="grid grid-cols-2 gap-6">
          <Toggle label="Bascule du bassin" value={form.bassin} onChange={(v: string) => set('bassin', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
          <Toggle label="Ceinture scapulaire" value={form.ceinture_scapulaire} onChange={(v: string) => set('ceinture_scapulaire', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Traitement orthopédique</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Check label="Hémi-coupole interne (HCI)" checked={form.semelles_hci} onChange={() => set('semelles_hci', !form.semelles_hci)}/>
          <Check label="Hémi-coupole externe (HCE)" checked={form.semelles_hce} onChange={() => set('semelles_hce', !form.semelles_hce)}/>
          <Check label="Barre métatarsale" checked={form.semelles_barre} onChange={() => set('semelles_barre', !form.semelles_barre)}/>
          <Check label="Coins de talonnière" checked={form.semelles_coins} onChange={() => set('semelles_coins', !form.semelles_coins)}/>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Talonnette</p>
            <div className="flex gap-2">
              {[['aucune','Aucune'],['gauche','Gauche'],['droite','Droite'],['bilat','Bilatérale']].map(([v, t]) => (
                <button key={v} type="button" onClick={() => set('talonnette_cote', v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.talonnette_cote === v ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          {form.talonnette_cote !== 'aucune' && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Hauteur (mm)</p>
              <input type="number" value={form.talonnette_mm} onChange={e => set('talonnette_mm', e.target.value)}
                placeholder="ex. 4" min="1" max="20"
                className="w-24 px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-2">Remarques complémentaires</label>
          <textarea value={form.remarques} onChange={e => set('remarques', e.target.value)}
            placeholder="Observations libres, conseils au patient..."
            rows={3}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200 mb-4">
          Bilan enregistré avec succès. Redirection...
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
