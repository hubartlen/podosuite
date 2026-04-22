'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { RendezVous } from '@/types'

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const TYPES = [
  { value: 'consultation', label: 'Consultation', color: '#c8b89a' },
  { value: 'suivi', label: 'Suivi', color: '#639922' },
  { value: 'bilan', label: 'Bilan podologique', color: '#BA7517' },
  { value: 'semelles', label: 'Semelles', color: '#4a7fa5' },
  { value: 'urgence', label: 'Urgence', color: '#c0392b' },
]

function getTypeColor(type: string) {
  return TYPES.find(t => t.value === type)?.color ?? '#9b8f7e'
}

function timeSlots() {
  const slots: string[] = []
  for (let h = 7; h <= 19; h++) {
    const minutes = h === 19 ? [0] : [0, 15, 30, 45]
    for (const m of minutes) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

function formatHeure(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function toDateInput(date: Date) {
  return date.toISOString().split('T')[0]
}

interface PatientMin {
  id: string
  nom: string
  prenom: string
}

const emptyForm = {
  patient_id: '',
  date: '',
  heure: '09:00',
  duree: 30,
  type: 'consultation',
  notes: '',
}

export default function CalendrierPage() {
  const router = useRouter()
  const [today] = useState(new Date())
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [rdvs, setRdvs] = useState<RendezVous[]>([])
  const [patients, setPatients] = useState<PatientMin[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; rdv?: RendezVous }>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }
    setUserId(session.user.id)

    const year = current.getFullYear()
    const month = current.getMonth()
    const start = new Date(year, month, 1).toISOString()
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    const [{ data: rdvData }, { data: patData }] = await Promise.all([
      supabase.from('rendez_vous')
        .select('*, patient:patients(nom, prenom)')
        .eq('praticien_id', session.user.id)
        .gte('date_heure', start)
        .lte('date_heure', end)
        .order('date_heure'),
      supabase.from('patients')
        .select('id, nom, prenom')
        .eq('praticien_id', session.user.id)
        .order('nom'),
    ])

    setRdvs(rdvData ?? [])
    setPatients(patData ?? [])
    setLoading(false)
  }, [current, router])

  useEffect(() => { load() }, [load])

  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDayMon = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayMon).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const rdvByDay: Record<number, RendezVous[]> = {}
  for (const rdv of rdvs) {
    const d = new Date(rdv.date_heure).getDate()
    if (!rdvByDay[d]) rdvByDay[d] = []
    rdvByDay[d].push(rdv)
  }

  function openCreate(day?: number) {
    const date = day ? new Date(year, month, day) : new Date()
    setForm({ ...emptyForm, date: toDateInput(date) })
    setModal({ mode: 'create' })
  }

  function openEdit(rdv: RendezVous) {
    const d = new Date(rdv.date_heure)
    setForm({
      patient_id: rdv.patient_id ?? '',
      date: toDateInput(d),
      heure: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      duree: rdv.duree,
      type: rdv.type,
      notes: rdv.notes ?? '',
    })
    setModal({ mode: 'edit', rdv })
  }

  async function handleSave() {
    if (!form.date || !form.heure) return
    setSaving(true)
    const supabase = createClient()
    const date_heure = new Date(`${form.date}T${form.heure}:00`).toISOString()
    const payload = {
      praticien_id: userId,
      patient_id: form.patient_id || null,
      date_heure,
      duree: form.duree,
      type: form.type,
      notes: form.notes || null,
    }
    if (modal?.mode === 'create') {
      await supabase.from('rendez_vous').insert(payload)
    } else if (modal?.rdv) {
      await supabase.from('rendez_vous').update(payload).eq('id', modal.rdv.id)
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function handleDelete() {
    if (!modal?.rdv) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('rendez_vous').delete().eq('id', modal.rdv.id)
    setSaving(false)
    setModal(null)
    load()
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid #e2dbd0', borderTopColor: '#c8b89a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', color: '#1a1410', fontWeight: '400', letterSpacing: '-0.01em' }}>Calendrier</h1>
          <p style={{ fontSize: '13px', color: '#9b8f7e', marginTop: '4px' }}>{rdvs.length} rendez-vous ce mois</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/calendrier/import" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: '#fff', border: '1px solid #e2dbd0', borderRadius: '10px', fontSize: '13px', color: '#4a3f35', textDecoration: 'none', fontWeight: '500' }}>
            ↑ Import Doctolib
          </Link>
          <button onClick={() => openCreate()} style={{ padding: '10px 18px', background: '#1a1410', borderRadius: '10px', border: 'none', fontSize: '13px', color: '#f5f2ee', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>
            + Nouveau RDV
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e2dbd0', background: '#fff', cursor: 'pointer', fontSize: '18px', color: '#4a3f35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ‹
        </button>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#1a1410', fontWeight: '400', minWidth: '220px', textAlign: 'center' }}>
          {MOIS[month]} {year}
        </h2>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e2dbd0', background: '#fff', cursor: 'pointer', fontSize: '18px', color: '#4a3f35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ›
        </button>
        <button
          onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCurrent(d) }}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2dbd0', background: '#fff', cursor: 'pointer', fontSize: '12px', color: '#4a3f35', marginLeft: '4px', fontFamily: 'Inter, sans-serif' }}>
          Aujourd'hui
        </button>
      </div>

      {/* Calendar */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2dbd0', overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e2dbd0' }}>
          {JOURS.map(j => (
            <div key={j} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: '#9b8f7e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {j}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < cells.length / 7 - 1 ? '1px solid #f0ebe4' : 'none' }}>
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const dayRdvs = day ? (rdvByDay[day] ?? []) : []
              const todayCell = day !== null && isToday(day)
              return (
                <div
                  key={di}
                  onClick={() => day && openCreate(day)}
                  style={{
                    minHeight: '110px', padding: '8px',
                    borderRight: di < 6 ? '1px solid #f0ebe4' : 'none',
                    cursor: day ? 'pointer' : 'default',
                    background: !day ? '#f9f7f4' : todayCell ? '#faf6f0' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (day) (e.currentTarget as HTMLElement).style.background = todayCell ? '#f5f0e8' : '#faf8f5' }}
                  onMouseLeave={e => { if (day) (e.currentTarget as HTMLElement).style.background = todayCell ? '#faf6f0' : 'transparent' }}>
                  {day && (
                    <>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: todayCell ? '600' : '400',
                        background: todayCell ? '#1a1410' : 'transparent',
                        color: todayCell ? '#c8b89a' : '#4a3f35',
                        marginBottom: '4px',
                      }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {dayRdvs.slice(0, 3).map(rdv => (
                          <div
                            key={rdv.id}
                            onClick={e => { e.stopPropagation(); openEdit(rdv) }}
                            style={{
                              padding: '2px 6px', borderRadius: '5px', fontSize: '11px',
                              background: getTypeColor(rdv.type) + '20',
                              color: getTypeColor(rdv.type),
                              borderLeft: `2px solid ${getTypeColor(rdv.type)}`,
                              cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                            {formatHeure(rdv.date_heure)}{rdv.patient ? ` · ${rdv.patient.prenom} ${rdv.patient.nom}` : ''}
                          </div>
                        ))}
                        {dayRdvs.length > 3 && (
                          <div style={{ fontSize: '10px', color: '#9b8f7e', padding: '2px 6px' }}>
                            +{dayRdvs.length - 3} autre{dayRdvs.length - 3 > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: t.color }} />
            <span style={{ fontSize: '11px', color: '#9b8f7e' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setModal(null)}>
          <div
            style={{ background: '#fff', borderRadius: '16px', padding: '28px', width: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#1a1410', fontWeight: '400', marginBottom: '22px' }}>
              {modal.mode === 'create' ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Patient */}
              <div>
                <label style={labelStyle}>Patient</label>
                <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} style={inputStyle}>
                  <option value="">— Sans patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              </div>

              {/* Date + Heure */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={labelStyle}>Heure</label>
                  <select value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={inputStyle}>
                    {timeSlots().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Durée + Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Durée</label>
                  <select value={form.duree} onChange={e => setForm(f => ({ ...f, duree: Number(e.target.value) }))} style={inputStyle}>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h30</option>
                    <option value={120}>2h</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Informations complémentaires..."
                  style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' as const, height: 'auto' }} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                {modal.mode === 'edit' ? (
                  <button onClick={handleDelete} disabled={saving}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #f0ebe4', background: '#fff', fontSize: '13px', color: '#c0392b', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Supprimer
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setModal(null)}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2dbd0', background: '#fff', fontSize: '13px', color: '#4a3f35', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    Annuler
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#1a1410', fontSize: '13px', color: '#f5f2ee', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: '500', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer le RDV' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px', color: '#9b8f7e', fontWeight: '500',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2dbd0',
  borderRadius: '10px', fontSize: '14px', color: '#1a1410',
  background: '#faf8f5', fontFamily: 'Inter, sans-serif', outline: 'none',
}
