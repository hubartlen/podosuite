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

function formatHeure(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function toDateInput(date: Date) {
  return date.toISOString().split('T')[0]
}

function getMondayOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

function timeSlots() {
  const slots: string[] = []
  for (let h = 7; h <= 19; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
    if (h < 19) slots.push(`${h.toString().padStart(2, '0')}:30`)
  }
  return slots
}

interface PatientMin { id: string; nom: string; prenom: string }

const emptyForm = { patient_id: '', date: '', heure: '09:00', duree: 30, type: 'consultation', notes: '' }

export default function CalendrierPage() {
  const router = useRouter()
  const [today] = useState(new Date())
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<'month' | 'week'>('week')
  const [isMobile, setIsMobile] = useState(false)
  const [rdvs, setRdvs] = useState<RendezVous[]>([])
  const [patients, setPatients] = useState<PatientMin[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; rdv?: RendezVous }>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [current, setCurrent] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }
    setUserId(session.user.id)

    const year = current.getFullYear()
    const month = current.getMonth()
    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month + 2, 0, 23, 59, 59).toISOString()

    const [{ data: rdvData }, { data: patData }] = await Promise.all([
      supabase.from('rendez_vous').select('*, patient:patients(nom, prenom)')
        .eq('praticien_id', session.user.id).gte('date_heure', start).lte('date_heure', end).order('date_heure'),
      supabase.from('patients').select('id, nom, prenom').eq('praticien_id', session.user.id).order('nom'),
    ])

    setRdvs(rdvData ?? [])
    setPatients(patData ?? [])
    setLoading(false)
  }, [current, router])

  useEffect(() => { load() }, [load])

  const weekDays = getWeekDays(weekStart)

  const rdvByDay: Record<string, RendezVous[]> = {}
  for (const rdv of rdvs) {
    const key = new Date(rdv.date_heure).toISOString().split('T')[0]
    if (!rdvByDay[key]) rdvByDay[key] = []
    rdvByDay[key].push(rdv)
  }

  function openCreate(day?: Date, heure?: string) {
    const date = day ? toDateInput(day) : toDateInput(new Date())
    setForm({ ...emptyForm, date, heure: heure || '09:00' })
    setModal({ mode: 'create' })
  }

  function openEdit(rdv: RendezVous) {
    const d = new Date(rdv.date_heure)
    setForm({
      patient_id: rdv.patient_id ?? '',
      date: toDateInput(d),
      heure: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      duree: rdv.duree, type: rdv.type, notes: rdv.notes ?? '',
    })
    setModal({ mode: 'edit', rdv })
  }

  async function handleSave() {
    if (!form.date || !form.heure) return
    setSaving(true)
    const supabase = createClient()
    const date_heure = new Date(`${form.date}T${form.heure}:00`).toISOString()
    const payload = { praticien_id: userId, patient_id: form.patient_id || null, date_heure, duree: form.duree, type: form.type, notes: form.notes || null }
    if (modal?.mode === 'create') await supabase.from('rendez_vous').insert(payload)
    else if (modal?.rdv) await supabase.from('rendez_vous').update(payload).eq('id', modal.rdv.id)
    setSaving(false); setModal(null); load()
  }

  async function handleDelete() {
    if (!modal?.rdv) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('rendez_vous').delete().eq('id', modal.rdv.id)
    setSaving(false); setModal(null); load()
  }

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
    borderRadius: 10, fontSize: 14, color: 'var(--fg)', background: 'var(--surface)', fontFamily: 'Inter, sans-serif', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--fg-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: '28px', height: '28px', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── VUE SEMAINE MOBILE ──────────────────────────────────────────────
  if (isMobile) {
    const weekLabel = `${weekDays[0].getDate()} ${MOIS[weekDays[0].getMonth()].slice(0,3)} – ${weekDays[6].getDate()} ${MOIS[weekDays[6].getMonth()].slice(0,3)}`
    const slots = timeSlots()
    const todayRdvs = rdvByDay[toDateInput(today)] ?? []

    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--fg)', margin: 0 }}>Calendrier</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/dashboard/calendrier/import" style={{ padding: '7px 12px', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--fg-2)', textDecoration: 'none' }}>
                ↑ Import
              </Link>
              <button onClick={() => openCreate()} style={{ padding: '7px 12px', background: 'var(--dark)', border: 'none', borderRadius: 8, fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>
                + RDV
              </button>
            </div>
          </div>

          {/* Sélecteur semaine */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{weekLabel}</span>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            <button onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11, color: 'var(--fg-3)' }}>Auj.</button>
          </div>
        </div>

        {/* Jours de la semaine - tabs horizontaux */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', background: 'var(--surface)', overflowX: 'auto' }}>
          {weekDays.map((day, i) => {
            const key = toDateInput(day)
            const count = (rdvByDay[key] ?? []).length
            const active = isToday(day)
            return (
              <button key={i} onClick={() => openCreate(day)}
                style={{ flex: 1, minWidth: 44, padding: '8px 4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 10, color: active ? 'var(--accent)' : 'var(--fg-3)', fontWeight: 500, textTransform: 'uppercase' }}>{JOURS[i].slice(0,2)}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: active ? 'var(--dark)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--accent)' : 'var(--fg)' }}>{day.getDate()}</span>
                </div>
                {count > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              </button>
            )
          })}
        </div>

        {/* Liste RDV de la semaine */}
        <div style={{ padding: '12px 16px' }}>
          {weekDays.map((day, di) => {
            const key = toDateInput(day)
            const dayRdvs = rdvByDay[key] ?? []
            if (dayRdvs.length === 0) return null
            return (
              <div key={di} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: isToday(day) ? 'var(--dark)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isToday(day) ? 'var(--accent)' : 'var(--fg-2)' }}>{day.getDate()}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>{JOURS[di]} {day.getDate()} {MOIS[day.getMonth()].slice(0,3)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 32 }}>
                  {dayRdvs.sort((a,b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()).map(rdv => (
                    <div key={rdv.id} onClick={() => openEdit(rdv)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', borderLeft: `3px solid ${getTypeColor(rdv.type)}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', minWidth: 40 }}>{formatHeure(rdv.date_heure)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rdv.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : 'Sans patient'}
                        </p>
                        {rdv.notes && <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rdv.notes}</p>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>{rdv.duree}min</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {weekDays.every(d => (rdvByDay[toDateInput(d)] ?? []).length === 0) && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-3)', fontSize: 13 }}>
              Aucun rendez-vous cette semaine
            </div>
          )}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', flexWrap: 'wrap', borderTop: '1px solid var(--line)' }}>
          {TYPES.map(t => (
            <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
              <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Modal */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
            onClick={() => setModal(null)}>
            <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 20px' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--fg)', marginBottom: 20 }}>
                {modal.mode === 'create' ? 'Nouveau rendez-vous' : 'Modifier'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Patient</label>
                  <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} style={inputStyle}>
                    <option value="">— Sans patient —</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle}/>
                  </div>
                  <div>
                    <label style={labelStyle}>Heure</label>
                    <select value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={inputStyle}>
                      {timeSlots().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Durée</label>
                    <select value={form.duree} onChange={e => setForm(f => ({ ...f, duree: Number(e.target.value) }))} style={inputStyle}>
                      {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d/60}h`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    placeholder="Informations complémentaires..." style={{ ...inputStyle, resize: 'none' }}/>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  {modal.mode === 'edit' && (
                    <button onClick={handleDelete} disabled={saving}
                      style={{ padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>
                      Supprimer
                    </button>
                  )}
                  <button onClick={() => setModal(null)}
                    style={{ flex: 1, padding: '12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--surface)', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 13 }}>
                    Annuler
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 12, background: 'var(--dark)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VUE DESKTOP (mois) ──────────────────────────────────────────────
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDayMon = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDayMon).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--fg)', fontWeight: '400', letterSpacing: '-0.01em' }}>Calendrier</h1>
          <p style={{ fontSize: '13px', color: 'var(--fg-3)', marginTop: '4px' }}>{rdvs.length} rendez-vous ce mois</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/dashboard/calendrier/import" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', fontSize: '13px', color: 'var(--fg-2)', textDecoration: 'none', fontWeight: '500' }}>
            ↑ Import Doctolib
          </Link>
          <button onClick={() => openCreate()} style={{ padding: '10px 18px', background: 'var(--dark)', borderRadius: '10px', border: 'none', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', fontWeight: '500' }}>
            + Nouveau RDV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: '18px', color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--fg)', fontWeight: '400', minWidth: '220px', textAlign: 'center' }}>
          {MOIS[month]} {year}
        </h2>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: '18px', color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        <button onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setCurrent(d) }}
          style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: '12px', color: 'var(--fg-3)', marginLeft: '4px' }}>
          Aujourd'hui
        </button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--line)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
          {JOURS.map(j => (
            <div key={j} style={{ padding: '10px', textAlign: 'center', fontSize: '11px', fontWeight: '500', color: 'var(--fg-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{j}</div>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < cells.length / 7 - 1 ? '1px solid var(--line-2)' : 'none' }}>
            {cells.slice(wi * 7, wi * 7 + 7).map((day, di) => {
              const dateKey = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : ''
              const dayRdvs = day ? (rdvByDay[dateKey] ?? []) : []
              const todayCell = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              return (
                <div key={di} onClick={() => day && openCreate(new Date(year, month, day))}
                  style={{ minHeight: '110px', padding: '8px', borderRight: di < 6 ? '1px solid var(--line-2)' : 'none', cursor: day ? 'pointer' : 'default', background: !day ? 'var(--surface-2)' : todayCell ? '#faf6f0' : 'transparent' }}>
                  {day && (
                    <>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: todayCell ? '600' : '400', background: todayCell ? 'var(--dark)' : 'transparent', color: todayCell ? 'var(--accent)' : 'var(--fg-2)', marginBottom: '4px' }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {dayRdvs.slice(0, 3).map(rdv => (
                          <div key={rdv.id} onClick={e => { e.stopPropagation(); openEdit(rdv) }}
                            style={{ padding: '2px 6px', borderRadius: '5px', fontSize: '11px', background: getTypeColor(rdv.type) + '20', color: getTypeColor(rdv.type), borderLeft: `2px solid ${getTypeColor(rdv.type)}`, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {formatHeure(rdv.date_heure)}{rdv.patient ? ` · ${rdv.patient.prenom} ${rdv.patient.nom}` : ''}
                          </div>
                        ))}
                        {dayRdvs.length > 3 && <div style={{ fontSize: '10px', color: 'var(--fg-3)', padding: '2px 6px' }}>+{dayRdvs.length - 3} autre{dayRdvs.length - 3 > 1 ? 's' : ''}</div>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: t.color }} />
            <span style={{ fontSize: '11px', color: 'var(--fg-3)' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setModal(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '28px', width: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--fg)', fontWeight: '400', marginBottom: '22px' }}>
              {modal.mode === 'create' ? 'Nouveau rendez-vous' : 'Modifier le rendez-vous'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Patient</label>
                <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} style={inputStyle}>
                  <option value="">— Sans patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, boxSizing: 'border-box' as const }}/>
                </div>
                <div>
                  <label style={labelStyle}>Heure</label>
                  <select value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={inputStyle}>
                    {timeSlots().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Durée</label>
                  <select value={form.duree} onChange={e => setForm(f => ({ ...f, duree: Number(e.target.value) }))} style={inputStyle}>
                    {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d/60}h`}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Informations complémentaires..." style={{ ...inputStyle, resize: 'vertical', boxSizing: 'border-box' as const, height: 'auto' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                {modal.mode === 'edit' ? (
                  <button onClick={handleDelete} disabled={saving}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '13px', color: 'var(--danger)', cursor: 'pointer' }}>
                    Supprimer
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setModal(null)}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '13px', color: 'var(--fg-2)', cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'var(--dark)', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', fontWeight: '500', opacity: saving ? 0.7 : 1 }}>
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
