'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewPatientPage() {
  const [form, setForm] = useState({
    nom: '', prenom: '', date_naissance: '', sexe: 'F',
    telephone: '', email: '', adresse: '', num_secu: '', mutuelle: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim() || !form.prenom.trim()) { setError('Nom et prénom requis'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('patients').insert({
      praticien_id: user!.id,
      nom: form.nom.toUpperCase().trim(),
      prenom: form.prenom.trim(),
      date_naissance: form.date_naissance || null,
      sexe: form.sexe,
      telephone: form.telephone || null,
      email: form.email || null,
      adresse: form.adresse || null,
      num_secu: form.num_secu || null,
      mutuelle: form.mutuelle || null,
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard/patients')
    router.refresh()
  }

  const Field = ({ label, id, type = 'text', placeholder = '', required = false, half = false }: any) => (
    <div className={half ? '' : 'md:col-span-2'}>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={(form as any)[id]} onChange={e => set(id, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour aux patients
      </Link>

      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Nouveau patient</h1>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Identité</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom" id="nom" placeholder="NOM" required half />
            <Field label="Prénom" id="prenom" placeholder="Prénom" required half />
            <Field label="Date de naissance" id="date_naissance" type="date" half />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sexe</label>
              <select value={form.sexe} onChange={e => set('sexe', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </div>
            <Field label="Téléphone" id="telephone" placeholder="06 XX XX XX XX" half />
            <Field label="Email" id="email" type="email" placeholder="patient@email.com" half />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse</label>
              <input type="text" value={form.adresse} onChange={e => set('adresse', e.target.value)}
                placeholder="Adresse complète"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Couverture sociale</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="N° Sécurité Sociale" id="num_secu" placeholder="1 85 12 75 123 456 78" half />
            <Field label="Mutuelle" id="mutuelle" placeholder="ex. MGEN, Alan..." half />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            <Save size={15} />
            {loading ? 'Enregistrement...' : 'Enregistrer le patient'}
          </button>
          <Link href="/dashboard/patients"
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
