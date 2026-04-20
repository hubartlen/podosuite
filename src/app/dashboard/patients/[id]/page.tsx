'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Receipt, Edit, Phone, Mail, MapPin, CreditCard, ChevronRight } from 'lucide-react'

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

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Chargement...</div>

  const age = patient.date_naissance
    ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const historique = [
    ...bilans.map(b => ({ ...b, _type: 'bilan', _date: b.date_bilan })),
    ...factures.map(f => ({ ...f, _type: 'facture', _date: f.date_facture })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-8">

      {/* Retour */}
      <Link href="/dashboard/patients"
        className="inline-flex items-center gap-1 text-slate-500 text-sm mb-4">
        <ArrowLeft size={15} /> Patients
      </Link>

      {/* Identité */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-3">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            {patient.prenom?.[0]}{patient.nom?.[0]}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 leading-tight">{patient.nom} {patient.prenom}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {age ? `${age} ans` : ''}
              {patient.mutuelle ? ` · ${patient.mutuelle}` : ''}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link href={`/dashboard/patients/${id}/edit`}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium">
            <Edit size={18} />
            Modifier
          </Link>
          <Link href={`/dashboard/bilans/new?patient=${id}`}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white text-xs font-medium">
            <FileText size={18} />
            Bilan
          </Link>
          <Link href={`/dashboard/factures/new?patient=${id}`}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-emerald-600 text-white text-xs font-medium">
            <Receipt size={18} />
            Facture
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{bilans.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">bilan(s)</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{factures.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">facture(s)</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{factures.reduce((s, f) => s + (f.total || 0), 0).toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">€ total</p>
        </div>
      </div>

      {/* Infos */}
      <div className="bg-white rounded-2xl border border-slate-200 mb-3 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Informations</p>
        </div>
        <div className="divide-y divide-slate-50">
          {patient.date_naissance && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Date de naissance</p>
                <p className="text-sm font-medium text-slate-800">{new Date(patient.date_naissance).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          )}
          {patient.telephone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <Phone size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Téléphone</p>
                <p className="text-sm font-medium text-slate-800">{patient.telephone}</p>
              </div>
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <Mail size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-800">{patient.email}</p>
              </div>
            </div>
          )}
          {patient.adresse && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Adresse</p>
                <p className="text-sm font-medium text-slate-800">{patient.adresse}</p>
              </div>
            </div>
          )}
          {patient.num_secu && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard size={14} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">N° Sécurité Sociale</p>
                <p className="text-sm font-mono text-slate-800">{patient.num_secu}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historique · {historique.length} entrée(s)</p>
        </div>
        {historique.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Aucun historique</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historique.map((item: any) => (
              <div key={item.id}
                className={`flex items-center gap-3 px-4 py-4 ${item._type === 'bilan' ? 'cursor-pointer active:bg-slate-50' : ''}`}
                onClick={() => item._type === 'bilan' && router.push(`/dashboard/bilans/${item.id}`)}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  item._type === 'bilan' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {item._type === 'bilan' ? <FileText size={16}/> : <Receipt size={16}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item._type === 'bilan' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item._type === 'bilan' ? 'Bilan' : 'Facture'}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(item._date)}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">
                    {item._type === 'bilan'
                      ? ([item.semelles_hci && 'HCI', item.semelles_hce && 'HCE', item.talonnette_mm && `Talonnette ${item.talonnette_mm}mm`].filter(Boolean).join(' · ') || 'Bilan podologique')
                      : `${item.numero} · ${(item.total||0).toFixed(2)} €`
                    }
                  </p>
                </div>
                {item._type === 'bilan' && <ChevronRight size={16} className="text-slate-300 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
