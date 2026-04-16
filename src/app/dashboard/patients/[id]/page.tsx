'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Receipt, Edit, Phone, Mail, MapPin, CreditCard } from 'lucide-react'

export default function PatientPage() {
  const params = useParams()
  const id = params.id as string
  const [patient, setPatient] = useState<any>(null)
  const [bilans, setBilans] = useState<any[]>([])
  const [factures, setFactures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const [{ data: p }, { data: b }, { data: f }] = await Promise.all([
        supabase.from('patients').select('*').eq('id', id).eq('praticien_id', session.user.id).single(),
        supabase.from('bilans').select('*').eq('patient_id', id).order('date_bilan', { ascending: false }),
        supabase.from('factures').select('*').eq('patient_id', id).order('date_facture', { ascending: false }),
      ])
      if (!p) { router.push('/dashboard/patients'); return }
      setPatient(p); setBilans(b ?? []); setFactures(f ?? [])
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <div className="p-8 text-sm text-slate-400">Chargement...</div>

  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const historique = [
    ...bilans.map(b => ({ ...b, _type: 'bilan', _date: b.date_bilan })),
    ...factures.map(f => ({ ...f, _type: 'facture', _date: f.date_facture })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Retour aux patients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center text-lg font-semibold">
            {patient.prenom?.[0]}{patient.nom?.[0]}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">{patient.nom} {patient.prenom}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {age ? `${age} ans` : 'Âge non renseigné'}
              {patient.mutuelle ? ` · ${patient.mutuelle}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/patients/${id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Edit size={14} /> Modifier
          </Link>
          <Link href={`/dashboard/bilans/new?patient=${id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <FileText size={14} /> Nouveau bilan
          </Link>
          <Link href={`/dashboard/factures/new?patient=${id}`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Receipt size={14} /> Nouvelle facture
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Informations</p>
          <div className="grid grid-cols-2 gap-4">
            {patient.date_naissance && <div><p className="text-xs text-slate-400 mb-1">Date de naissance</p><p className="text-sm font-medium text-slate-800">{new Date(patient.date_naissance).toLocaleDateString('fr-FR')}</p></div>}
            {patient.telephone && <div><p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone size={10}/> Téléphone</p><p className="text-sm font-medium text-slate-800">{patient.telephone}</p></div>}
            {patient.email && <div className="col-span-2"><p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail size={10}/> Email</p><p className="text-sm font-medium text-slate-800">{patient.email}</p></div>}
            {patient.adresse && <div className="col-span-2"><p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin size={10}/> Adresse</p><p className="text-sm font-medium text-slate-800">{patient.adresse}</p></div>}
            {patient.num_secu && <div className="col-span-2"><p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><CreditCard size={10}/> N° SS</p><p className="text-sm font-mono text-slate-800">{patient.num_secu}</p></div>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Statistiques</p>
          <div className="space-y-4">
            <div><p className="text-3xl font-semibold text-slate-800">{bilans.length}</p><p className="text-sm text-slate-500">bilan(s)</p></div>
            <div><p className="text-3xl font-semibold text-slate-800">{factures.length}</p><p className="text-sm text-slate-500">facture(s)</p></div>
            {factures.length > 0 && <div><p className="text-3xl font-semibold text-slate-800">{factures.reduce((s, f) => s + (f.total || 0), 0).toFixed(0)} €</p><p className="text-sm text-slate-500">total facturé</p></div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="font-medium text-slate-800 text-sm">Historique · {historique.length} entrée(s)</p>
        </div>
        {historique.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun historique</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historique.map((item: any) => (
              <div key={item.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${item._type === 'bilan' ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                onClick={() => item._type === 'bilan' && router.push(`/dashboard/bilans/${item.id}`)}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${item._type === 'bilan' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {item._type === 'bilan' ? <FileText size={14}/> : <Receipt size={14}/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item._type === 'bilan' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {item._type === 'bilan' ? 'Bilan' : 'Facture'}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(item._date)}</span>
                  </div>
                  {item._type === 'bilan' ? (
                    <p className="text-sm text-slate-600">
                      {[item.semelles_hci && 'HCI', item.semelles_hce && 'HCE', item.talonnette_mm && `Talonnette ${item.talonnette_mm}mm`].filter(Boolean).join(' · ') || 'Bilan podologique'}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">{item.numero} · {(item.total||0).toFixed(2)} € · {item.mode_paiement}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
