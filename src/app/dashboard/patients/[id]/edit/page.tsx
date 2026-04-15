'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function EditPatientPage() {
  const params = useParams()
  const [form, setForm] = useState({
    nom: '', prenom: '', date_naissance: '', sexe: 'F',
    telephone: '', email: '', adresse: '', num_secu: '', mutuelle: ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('patients').select('*').eq('id', params.id as string).single()
      if (data) {
        setForm({
          nom: data.nom || '',
          prenom: data.prenom || '',
          date_naissance: data.date_naissance || '',
          sexe: data.sexe || 'F',
          telephone: data.telephone || '',
          email: data.email || '',
          adresse: data.adresse || '',
          num_secu: data.num_secu || '',
          mutuelle: data.mutuelle || '',
        })
      }
      setLoadingData(false)
    }
    load()
  }, [params.id])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('patients').update({
      nom: form.nom.toUpperCase().trim(),
      prenom: form.prenom.trim(),
      date_naissance: form.date_naissance || null,
      sexe: form.sexe,
      telephone: form.telephone || null,
      email: form.email || null,
      adresse: form.adresse || null,
      num_secu: form.num_secu || null,
      mutuelle: form.mutuelle || null,
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

  const F = ({ label, id, type = 'text', placeholder = '' }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={(form as any)[id]} onChange={e => set(id, e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
    </div>
  )

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
            <F label="Nom" id="nom" placeholder="NOM"/>
            <F label="Prénom" id="prenom" placeholder="Prénom"/>
            <F label="Date de naissance" id="date_naissance" type="date"/>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sexe</label>
              <select value={form.sexe} onChange={e => set('sexe', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="F">Femme</option>
                <option value="M">Homme</option>
              </select>
            </div>
            <F label="Téléphone" id="telephone" placeholder="06 XX XX XX XX"/>
            <F label="Email" id="email" type="email" placeholder="patient@email.com"/>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse</label>
              <input type="text" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Adresse complète"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Couverture sociale</p>
          <div className="grid grid-cols-2 gap-4">
            <F label="N° Sécurité Sociale" id="num_secu" placeholder="1 85 12 75 123 456 78"/>
            <F label="Mutuelle" id="mutuelle" placeholder="ex. MGEN"/>
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
