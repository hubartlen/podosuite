'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

export default function NewPatientPage() {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [dateNaissance, setDateNaissance] = useState('')
  const [sexe, setSexe] = useState('F')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [adresse, setAdresse] = useState('')
  const [numSecu, setNumSecu] = useState('')
  const [mutuelle, setMutuelle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || !prenom.trim()) { setError('Nom et prénom requis'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('patients').insert({
      praticien_id: user!.id,
      nom: nom.toUpperCase().trim(),
      prenom: prenom.trim(),
      date_naissance: dateNaissance || null,
      sexe,
      telephone: telephone || null,
      email: email || null,
      adresse: adresse || null,
      num_secu: numSecu || null,
      mutuelle: mutuelle || null,
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard/patients')
    router.refresh()
  }, [nom, prenom, dateNaissance, sexe, telephone, email, adresse, numSecu, mutuelle, router])

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour aux patients
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Nouveau patient</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4">{error}</div>}

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Identité</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
              <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="NOM"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom <span className="text-red-500">*</span></label>
              <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Prénom"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de naissance</label>
              <input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sexe</label>
              <select value={sexe} onChange={e => setSexe(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
              <input type="text" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 XX XX XX XX"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@email.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse</label>
              <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse complète"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Couverture sociale</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">N° Sécurité Sociale</label>
              <input type="text" value={numSecu} onChange={e => setNumSecu(e.target.value)} placeholder="1 85 12 75 123 456 78"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mutuelle</label>
              <input type="text" value={mutuelle} onChange={e => setMutuelle(e.target.value)} placeholder="ex. MGEN, Alan..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            <Save size={15}/>{loading ? 'Enregistrement...' : 'Enregistrer le patient'}
          </button>
          <Link href="/dashboard/patients"
            className="px-5 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
