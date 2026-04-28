'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Patient } from '@/types'

const Toggle = ({ label, options, value, onChange }: any) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([val, txt]: [string, string]) => (
        <button key={val} type="button" onClick={() => onChange(val)} style={{
          padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          border: `1.5px solid ${value === val ? 'var(--dark)' : 'var(--line)'}`,
          background: value === val ? 'var(--dark)' : 'var(--surface)',
          color: value === val ? 'var(--accent)' : 'var(--fg-2)',
          cursor: 'pointer', transition: 'all .12s',
        }}>{txt}</button>
      ))}
    </div>
  </div>
)

const Check = ({ label, checked, onChange }: any) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <div onClick={onChange} style={{
      width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? 'var(--dark)' : 'var(--line)'}`,
      background: checked ? 'var(--dark)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{label}</span>
  </label>
)

const Section = ({ title, children }: any) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 24, marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>{title}</p>
    {children}
  </div>
)

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--line)',
  borderRadius: 10, fontSize: 13, color: 'var(--fg)', background: 'var(--surface)',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

export default function NewBilanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lastBilan, setLastBilan] = useState<any>(null)

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      if (data) setPatients(data)
    }
    load()
  }, [router])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: bilan, error } = await supabase.from('bilans').insert({
      patient_id: patientId, praticien_id: session.user.id, ...form,
      talonnette_mm: form.talonnette_mm ? parseInt(form.talonnette_mm) : null,
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }
    if (dl && bilan) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFBilan } = await import('@/lib/pdf-bilan')
      const doc = genererPDFBilan(bilan, patient)
      doc.save(`Bilan_${patient.nom}_${patient.prenom}_${form.date_bilan}.pdf`)
    }
    setSaved(true); setLastBilan(bilan)
    const p = patients.find(x => x.id === patientId)
    if (p?.email) setEmailTo(p.email)
    setLoading(false)
  }

  const sendEmail = async () => {
    if (!emailTo || !lastBilan) return
    setSending(true)
    const patient = patients.find(p => p.id === patientId)!
    const { genererPDFBilan } = await import('@/lib/pdf-bilan')
    const doc = genererPDFBilan(lastBilan, patient)
    const pdfBase64 = doc.output('datauristring').split(',')[1]
    const res = await fetch('/api/send-bilan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, bilan: lastBilan, patient, pdfBase64 })
    })
    if (res.ok) setEmailSent(true); else alert('Erreur envoi email')
    setSending(false)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760 }}>
      <Link href="/dashboard/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Retour
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--fg)', marginBottom: 24 }}>Nouveau bilan podologique</h1>

      <Section title="Patient & date">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Patient *</label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Date du bilan</label>
            <input type="date" value={form.date_bilan} onChange={e => set('date_bilan', e.target.value)} style={inp} />
          </div>
        </div>
      </Section>

      <Section title="Examen tégumentaire">
        <Toggle label="Infection tégumentaire" value={form.infection_tegumentaire} onChange={(v: string) => set('infection_tegumentaire', v)}
          options={[['aucune','Aucune'],['mycose','Mycose'],['verrue','Verrue(s)'],['intertrigo','Intertrigo']]}/>
        <Toggle label="Hyperkératose" value={form.hyperkeratose} onChange={(v: string) => set('hyperkeratose', v)}
          options={[['aucune','Aucune'],['plantaire','Plantaire'],['cors','Cors / Durillons'],['talons','Talons fissurés']]}/>
        <Toggle label="Ongles" value={form.ongles} onChange={(v: string) => set('ongles', v)}
          options={[['normaux','Normaux'],['dystrophie','Onychodystrophie'],['incarne','Ongle incarné'],['onychogryphose','Onychogryphose']]}/>
        <Toggle label="Déformations" value={form.deformations} onChange={(v: string) => set('deformations', v)}
          options={[['aucune','Aucune notoire'],['hallux','Hallux valgus'],['orteils','Orteils en griffe'],['pied_plat','Pied plat'],['pied_creux','Pied creux']]}/>
      </Section>

      <Section title="Examen postural et morphostatique">
        <Toggle label="Valgus calcanéen" value={form.valgus_calcaneen} onChange={(v: string) => set('valgus_calcaneen', v)}
          options={[['absent','Absent'],['bilateral','Bilatéral'],['droit','Droit'],['gauche','Gauche']]}/>
        <Toggle label="Patellas" value={form.patellas} onChange={(v: string) => set('patellas', v)}
          options={[['zenith','Au zénith'],['internes','En dedans'],['externes','En dehors']]}/>
        <Toggle label="Genou" value={form.genou} onChange={(v: string) => set('genou', v)}
          options={[['normal','Normal'],['flexion_g','Flexion gauche'],['flexion_d','Flexion droite'],['genu_valgum','Genu valgum'],['genu_varum','Genu varum']]}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Toggle label="Bascule du bassin" value={form.bassin} onChange={(v: string) => set('bassin', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
          <Toggle label="Ceinture scapulaire" value={form.ceinture_scapulaire} onChange={(v: string) => set('ceinture_scapulaire', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
        </div>
      </Section>

      <Section title="Traitement orthopédique">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Check label="Hémi-coupole interne (HCI)" checked={form.semelles_hci} onChange={() => set('semelles_hci', !form.semelles_hci)}/>
          <Check label="Hémi-coupole externe (HCE)" checked={form.semelles_hce} onChange={() => set('semelles_hce', !form.semelles_hce)}/>
          <Check label="Barre métatarsale" checked={form.semelles_barre} onChange={() => set('semelles_barre', !form.semelles_barre)}/>
          <Check label="Coins de talonnière" checked={form.semelles_coins} onChange={() => set('semelles_coins', !form.semelles_coins)}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talonnette</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['aucune','Aucune'],['gauche','Gauche'],['droite','Droite'],['bilat','Bilatérale']].map(([v, t]) => (
                <button key={v} type="button" onClick={() => set('talonnette_cote', v)} style={{
                  padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${form.talonnette_cote === v ? 'var(--dark)' : 'var(--line)'}`,
                  background: form.talonnette_cote === v ? 'var(--dark)' : 'var(--surface)',
                  color: form.talonnette_cote === v ? 'var(--accent)' : 'var(--fg-2)',
                  cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
          </div>
          {form.talonnette_cote !== 'aucune' && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hauteur (mm)</p>
              <input type="number" value={form.talonnette_mm} onChange={e => set('talonnette_mm', e.target.value)}
                placeholder="ex. 4" min="1" max="20" style={{ ...inp, width: 100 }}/>
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Remarques</label>
          <textarea value={form.remarques} onChange={e => set('remarques', e.target.value)}
            placeholder="Observations libres..." rows={3} style={{ ...inp, resize: 'none' }}/>
        </div>
      </Section>

      {saved && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid #b8dfc0', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 10 }}>
            ✓ Bilan enregistré
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Envoyer par email</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                placeholder="email@patient.com" style={{ ...inp, flex: 1 }}/>
              <button onClick={sendEmail} disabled={sending || !emailTo || emailSent} style={{
                padding: '10px 18px', background: 'var(--dark)', color: 'var(--accent)',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', opacity: sending || emailSent ? 0.6 : 1, whiteSpace: 'nowrap',
              }}>{emailSent ? '✓ Envoyé' : sending ? '...' : 'Envoyer'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{
          padding: '11px 22px', background: 'var(--dark)', color: 'var(--accent)',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
        <button onClick={() => handleSubmit(true)} disabled={loading} style={{
          padding: '11px 22px', background: 'var(--accent)', color: 'var(--dark)',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>Enregistrer + PDF</button>
        <Link href="/dashboard/patients" style={{
          padding: '11px 20px', borderRadius: 12, fontSize: 13,
          border: '1px solid var(--line)', color: 'var(--fg-2)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
        }}>Annuler</Link>
      </div>
    </div>
  )
}
EOFcat > src/app/dashboard/bilans/new/client.tsx << 'EOF'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Patient } from '@/types'

const Toggle = ({ label, options, value, onChange }: any) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([val, txt]: [string, string]) => (
        <button key={val} type="button" onClick={() => onChange(val)} style={{
          padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          border: `1.5px solid ${value === val ? 'var(--dark)' : 'var(--line)'}`,
          background: value === val ? 'var(--dark)' : 'var(--surface)',
          color: value === val ? 'var(--accent)' : 'var(--fg-2)',
          cursor: 'pointer', transition: 'all .12s',
        }}>{txt}</button>
      ))}
    </div>
  </div>
)

const Check = ({ label, checked, onChange }: any) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <div onClick={onChange} style={{
      width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? 'var(--dark)' : 'var(--line)'}`,
      background: checked ? 'var(--dark)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
    <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{label}</span>
  </label>
)

const Section = ({ title, children }: any) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 24, marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>{title}</p>
    {children}
  </div>
)

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--line)',
  borderRadius: 10, fontSize: 13, color: 'var(--fg)', background: 'var(--surface)',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

export default function NewBilanClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lastBilan, setLastBilan] = useState<any>(null)

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      if (data) setPatients(data)
    }
    load()
  }, [router])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: bilan, error } = await supabase.from('bilans').insert({
      patient_id: patientId, praticien_id: session.user.id, ...form,
      talonnette_mm: form.talonnette_mm ? parseInt(form.talonnette_mm) : null,
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }
    if (dl && bilan) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFBilan } = await import('@/lib/pdf-bilan')
      const doc = genererPDFBilan(bilan, patient)
      doc.save(`Bilan_${patient.nom}_${patient.prenom}_${form.date_bilan}.pdf`)
    }
    setSaved(true); setLastBilan(bilan)
    const p = patients.find(x => x.id === patientId)
    if (p?.email) setEmailTo(p.email)
    setLoading(false)
  }

  const sendEmail = async () => {
    if (!emailTo || !lastBilan) return
    setSending(true)
    const patient = patients.find(p => p.id === patientId)!
    const { genererPDFBilan } = await import('@/lib/pdf-bilan')
    const doc = genererPDFBilan(lastBilan, patient)
    const pdfBase64 = doc.output('datauristring').split(',')[1]
    const res = await fetch('/api/send-bilan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, bilan: lastBilan, patient, pdfBase64 })
    })
    if (res.ok) setEmailSent(true); else alert('Erreur envoi email')
    setSending(false)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760 }}>
      <Link href="/dashboard/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Retour
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--fg)', marginBottom: 24 }}>Nouveau bilan podologique</h1>

      <Section title="Patient & date">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Patient *</label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inp}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Date du bilan</label>
            <input type="date" value={form.date_bilan} onChange={e => set('date_bilan', e.target.value)} style={inp} />
          </div>
        </div>
      </Section>

      <Section title="Examen tégumentaire">
        <Toggle label="Infection tégumentaire" value={form.infection_tegumentaire} onChange={(v: string) => set('infection_tegumentaire', v)}
          options={[['aucune','Aucune'],['mycose','Mycose'],['verrue','Verrue(s)'],['intertrigo','Intertrigo']]}/>
        <Toggle label="Hyperkératose" value={form.hyperkeratose} onChange={(v: string) => set('hyperkeratose', v)}
          options={[['aucune','Aucune'],['plantaire','Plantaire'],['cors','Cors / Durillons'],['talons','Talons fissurés']]}/>
        <Toggle label="Ongles" value={form.ongles} onChange={(v: string) => set('ongles', v)}
          options={[['normaux','Normaux'],['dystrophie','Onychodystrophie'],['incarne','Ongle incarné'],['onychogryphose','Onychogryphose']]}/>
        <Toggle label="Déformations" value={form.deformations} onChange={(v: string) => set('deformations', v)}
          options={[['aucune','Aucune notoire'],['hallux','Hallux valgus'],['orteils','Orteils en griffe'],['pied_plat','Pied plat'],['pied_creux','Pied creux']]}/>
      </Section>

      <Section title="Examen postural et morphostatique">
        <Toggle label="Valgus calcanéen" value={form.valgus_calcaneen} onChange={(v: string) => set('valgus_calcaneen', v)}
          options={[['absent','Absent'],['bilateral','Bilatéral'],['droit','Droit'],['gauche','Gauche']]}/>
        <Toggle label="Patellas" value={form.patellas} onChange={(v: string) => set('patellas', v)}
          options={[['zenith','Au zénith'],['internes','En dedans'],['externes','En dehors']]}/>
        <Toggle label="Genou" value={form.genou} onChange={(v: string) => set('genou', v)}
          options={[['normal','Normal'],['flexion_g','Flexion gauche'],['flexion_d','Flexion droite'],['genu_valgum','Genu valgum'],['genu_varum','Genu varum']]}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Toggle label="Bascule du bassin" value={form.bassin} onChange={(v: string) => set('bassin', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
          <Toggle label="Ceinture scapulaire" value={form.ceinture_scapulaire} onChange={(v: string) => set('ceinture_scapulaire', v)}
            options={[['absent','Absente'],['gauche','Gauche'],['droit','Droite']]}/>
        </div>
      </Section>

      <Section title="Traitement orthopédique">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Check label="Hémi-coupole interne (HCI)" checked={form.semelles_hci} onChange={() => set('semelles_hci', !form.semelles_hci)}/>
          <Check label="Hémi-coupole externe (HCE)" checked={form.semelles_hce} onChange={() => set('semelles_hce', !form.semelles_hce)}/>
          <Check label="Barre métatarsale" checked={form.semelles_barre} onChange={() => set('semelles_barre', !form.semelles_barre)}/>
          <Check label="Coins de talonnière" checked={form.semelles_coins} onChange={() => set('semelles_coins', !form.semelles_coins)}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talonnette</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['aucune','Aucune'],['gauche','Gauche'],['droite','Droite'],['bilat','Bilatérale']].map(([v, t]) => (
                <button key={v} type="button" onClick={() => set('talonnette_cote', v)} style={{
                  padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${form.talonnette_cote === v ? 'var(--dark)' : 'var(--line)'}`,
                  background: form.talonnette_cote === v ? 'var(--dark)' : 'var(--surface)',
                  color: form.talonnette_cote === v ? 'var(--accent)' : 'var(--fg-2)',
                  cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
          </div>
          {form.talonnette_cote !== 'aucune' && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hauteur (mm)</p>
              <input type="number" value={form.talonnette_mm} onChange={e => set('talonnette_mm', e.target.value)}
                placeholder="ex. 4" min="1" max="20" style={{ ...inp, width: 100 }}/>
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>Remarques</label>
          <textarea value={form.remarques} onChange={e => set('remarques', e.target.value)}
            placeholder="Observations libres..." rows={3} style={{ ...inp, resize: 'none' }}/>
        </div>
      </Section>

      {saved && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid #b8dfc0', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 10 }}>
            ✓ Bilan enregistré
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Envoyer par email</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                placeholder="email@patient.com" style={{ ...inp, flex: 1 }}/>
              <button onClick={sendEmail} disabled={sending || !emailTo || emailSent} style={{
                padding: '10px 18px', background: 'var(--dark)', color: 'var(--accent)',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', opacity: sending || emailSent ? 0.6 : 1, whiteSpace: 'nowrap',
              }}>{emailSent ? '✓ Envoyé' : sending ? '...' : 'Envoyer'}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{
          padding: '11px 22px', background: 'var(--dark)', color: 'var(--accent)',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
        <button onClick={() => handleSubmit(true)} disabled={loading} style={{
          padding: '11px 22px', background: 'var(--accent)', color: 'var(--dark)',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>Enregistrer + PDF</button>
        <Link href="/dashboard/patients" style={{
          padding: '11px 20px', borderRadius: 12, fontSize: 13,
          border: '1px solid var(--line)', color: 'var(--fg-2)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
        }}>Annuler</Link>
      </div>
    </div>
  )
}
