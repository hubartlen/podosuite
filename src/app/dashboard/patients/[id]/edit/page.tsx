'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function EditPatientPage() {
  const params = useParams()
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
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('patients').select('*').eq('id', params.id as string).single()
      if (data) {
        setNom(data.nom || '')
        setPrenom(data.prenom || '')
        setDateNaissance(data.date_naissance || '')
        setSexe(data.sexe || 'F')
        setTelephone(data.telephone || '')
        setEmail(data.email || '')
        setAdresse(data.adresse || '')
        setNumSecu(data.num_secu || '')
        setMutuelle(data.mutuelle || '')
      }
      setLoadingData(false)
    }
    load()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('patients').update({
      nom: nom.toUpperCase().trim(),
      prenom: prenom.trim(),
      date_naissance: dateNaissance || null,
      sexe,
      telephone: telephone || null,
      email: email || null,
      adresse: adresse || null,
      num_secu: numSecu || null,
      mutuelle: mutuelle || null,
    }).eq('id', params.id as string)
    router.push(`/dashboard/patients/${params.id}`)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer ce patient et tout son historique ? Cette action est irréversible.')) return
    const supabase = createClient()
    await supabase.from('patients').delete().eq('id', params.id as string)
    router.push('/dashboard/patients')
    router.refresh()
  }

  if (loadingData) return <div className="p-8 text-slate-400 text-sm">Chargement...</div>

  return (
    <div className="p-8 max-w-2xl">
      <Link href={`/dashboard/patients/${params.id}`}
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour à la fiche
      </Link>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Modifier le patient</h1>
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Identité</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom</label>
              <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="NOM"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom</label>
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
              <input type="text" value={mutuelle} onChange={e => setMutuelle(e.target.value)} placeholder="ex. MGEN"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <Save size={15}/>{loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <Link href={`/dashboard/patients/${params.id}`}
              className="px-5 py-2.5 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              Annuler
            </Link>
          </div>
          <button type="button" onClick={handleDelete}
            className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm transition-colors">
            <Trash2 size={14}/> Supprimer le patient
          </button>
        </div>
      </form>
    </div>
  )
}
