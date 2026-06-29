'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Patient } from '@/types'

interface Acte { designation: string; quantite: number; prix_unitaire: number }

const TARIFS: Record<string, Acte[]> = {
  'saint-denis': [
    { designation: 'Soin de pédicurie au cabinet', quantite: 1, prix_unitaire: 38 },
    { designation: 'Soin de pédicurie + massage relaxant 20min', quantite: 1, prix_unitaire: 55 },
    { designation: 'Soin de pédicurie à domicile', quantite: 1, prix_unitaire: 44 },
    { designation: 'Soin de pédicurie diabétique POD (avec ordonnance)', quantite: 1, prix_unitaire: 30 },
    { designation: "Pose d'orthonixie (appareil correcteur)", quantite: 1, prix_unitaire: 35 },
    { designation: "Pose d'onychoplastie (faux ongle)", quantite: 1, prix_unitaire: 35 },
    { designation: 'Traitement verrue verrucide (la séance)', quantite: 1, prix_unitaire: 25 },
    { designation: 'Traitement verrue cryothérapie (la séance)', quantite: 1, prix_unitaire: 35 },
    { designation: 'Bilan podologique', quantite: 1, prix_unitaire: 50 },
    { designation: 'Semelles orthopédiques (supérieur à 37)', quantite: 1, prix_unitaire: 150 },
    { designation: 'Semelles orthopédiques (entre 28 et 37)', quantite: 1, prix_unitaire: 140 },
    { designation: 'Semelles orthopédiques (inférieur à 28)', quantite: 1, prix_unitaire: 135 },
  ],
  'livry-gargan': [
    { designation: 'Soin de pédicurie', quantite: 1, prix_unitaire: 45 },
    { designation: 'Bilan podologique + semelles orthopédiques', quantite: 1, prix_unitaire: 190 },
  ],
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid var(--line)',
  borderRadius: 10, fontSize: 13, color: 'var(--fg)', background: 'var(--surface)',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--fg-3)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7,
}

const Section = ({ title, children }: any) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 24, marginBottom: 12 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>{title}</p>
    {children}
  </div>
)

export default function NewFactureClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState(searchParams.get('patient') || '')
  const [cabinet, setCabinet] = useState('saint-denis')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lastFacture, setLastFacture] = useState<any>(null)
  const [dateFact, setDateFact] = useState(new Date().toISOString().split('T')[0])
  const [modePaiement, setModePaiement] = useState('Chèque')
  const [mention, setMention] = useState('')
  const [actes, setActes] = useState<Acte[]>([TARIFS['saint-denis'][0]])
  const [seq, setSeq] = useState(1)
  const [praticienData, setPraticienData] = useState<any>(null)
  const annee = new Date().getFullYear().toString()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [{ data }, { data: pratData }] = await Promise.all([
      supabase.from('patients').select('*').eq('praticien_id', session.user.id).order('nom')
      if (data) setPatients(data)
      const { data: prat } = await supabase.from('praticiens').select('*').eq('id', session.user.id).single()
      if (prat) setPraticienData(prat)
      const { data: last } = await supabase.from('factures').select('numero')
        .eq('praticien_id', session.user.id).order('created_at', { ascending: false }).limit(1)
      if (last?.length) {
        const parts = last[0].numero.split('-')
        setSeq((parseInt(parts[parts.length - 1]) || 0) + 1)
      }
    }
    load()
  }, [])

  const numero = `FAC-${annee}-${String(seq).padStart(4, '0')}`
  const total = actes.reduce((s, a) => s + a.quantite * a.prix_unitaire, 0)

  const handleCabinetChange = (val: string) => { setCabinet(val); setActes([TARIFS[val][0]]) }
  const ajouterActe = (designation: string) => {
    if (!designation) return
    const tarif = TARIFS[cabinet].find(t => t.designation === designation)
    if (tarif) setActes(a => [...a, { ...tarif }])
  }
  const removeActe = (i: number) => setActes(a => a.filter((_, idx) => idx !== i))
  const updateQte = (i: number, v: number) => setActes(a => a.map((acte, idx) => idx === i ? { ...acte, quantite: v } : acte))
  const updatePrix = (i: number, v: number) => setActes(a => a.map((acte, idx) => idx === i ? { ...acte, prix_unitaire: v } : acte))

  const handleSubmit = async (dl = false) => {
    if (!patientId) { alert('Sélectionne un patient'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: facture, error } = await supabase.from('factures').insert({
      patient_id: patientId, praticien_id: session.user.id, numero,
      date_facture: dateFact, actes, mode_paiement: modePaiement,
      mention: mention || null, total, cabinet,
    }).select().single()
    if (error) { alert('Erreur : ' + error.message); setLoading(false); return }
    if (dl && facture) {
      const patient = patients.find(p => p.id === patientId)!
      const { genererPDFFacture } = await import('@/lib/pdf-facture')
      const doc = genererPDFFacture(facture, patient, praticienData)
      doc.save(`Facture_${numero}_${patient.nom}_${patient.prenom}.pdf`)
    }
    setSaved(true); setLastFacture(facture)
    const patient = patients.find(p => p.id === patientId)
    if (patient?.email) setEmailTo(patient.email)
    setLoading(false)
  }

  const sendEmail = async () => {
    if (!emailTo || !lastFacture) return
    setSending(true)
    const patient = patients.find(p => p.id === patientId)!
    const { genererPDFFacture } = await import('@/lib/pdf-facture')
    const doc = genererPDFFacture(lastFacture, patient, praticienData)
    const pdfBase64 = doc.output('datauristring').split(',')[1]
    const res = await fetch('/api/send-facture', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: emailTo, facture: lastFacture, patient, pdfBase64 })
    })
    if (res.ok) setEmailSent(true)
    else { const d = await res.json().catch(() => ({})); alert('Erreur : ' + ((d as any).error || 'Échec')) }
    setSending(false)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680 }}>
      <Link href="/dashboard/patients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--fg-3)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Retour
      </Link>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--fg)', marginBottom: 24 }}>Nouvelle facture</h1>

      <Section title="Cabinet">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['saint-denis', 'Saint-Denis'], ['livry-gargan', 'Livry-Gargan']].map(([val, label]) => (
            <button key={val} onClick={() => handleCabinetChange(val)} style={{
              padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 500,
              border: `2px solid ${cabinet === val ? 'var(--dark)' : 'var(--line)'}`,
              background: cabinet === val ? 'var(--dark)' : 'var(--surface)',
              color: cabinet === val ? 'var(--accent)' : 'var(--fg-2)',
              cursor: 'pointer', transition: 'all .12s',
            }}>{label}</button>
          ))}
        </div>
      </Section>

      <Section title="Patient & date">
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Patient *</label>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} style={inp}>
            <option value="">Sélectionner un patient...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={dateFact} onChange={e => setDateFact(e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>Paiement</label>
            <select value={modePaiement} onChange={e => setModePaiement(e.target.value)} style={inp}>
              {['Chèque','Espèces','Carte bancaire','Virement','Tiers payant'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>N° facture : </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{numero}</span>
        </div>
      </Section>

      <Section title="Actes">
        <select onChange={e => { ajouterActe(e.target.value); e.target.value = '' }} style={{ ...inp, marginBottom: 16 }}>
          <option value="">+ Ajouter un acte du tarif...</option>
          {TARIFS[cabinet].map(t => (
            <option key={t.designation} value={t.designation}>{t.designation} — {t.prix_unitaire} €</option>
          ))}
        </select>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actes.map((a, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', flex: 1, paddingRight: 12 }}>{a.designation}</p>
                <button onClick={() => removeActe(i)} style={{ background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ ...lbl, marginBottom: 5 }}>Quantité</label>
                  <input type="number" min={1} value={a.quantite} onChange={e => updateQte(i, parseInt(e.target.value)||1)} style={{ ...inp, textAlign: 'center' }}/>
                </div>
                <div>
                  <label style={{ ...lbl, marginBottom: 5 }}>Prix (€)</label>
                  <input type="number" step="0.01" min={0} value={a.prix_unitaire} onChange={e => updatePrix(i, parseFloat(e.target.value)||0)} style={{ ...inp, textAlign: 'center' }}/>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label style={{ ...lbl, marginBottom: 5 }}>Total</label>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', paddingTop: 10 }}>{(a.quantite * a.prix_unitaire).toFixed(2)} €</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>Total</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--fg)' }}>{total.toFixed(2)} €</span>
        </div>
      </Section>

      <Section title="Mention complémentaire">
        <textarea value={mention} onChange={e => setMention(e.target.value)}
          placeholder="ex. Reçu pour remboursement mutuelle..." rows={2}
          style={{ ...inp, resize: 'none' }}/>
      </Section>

      {saved && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid #b8dfc0', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 10 }}>
            ✓ Facture enregistrée
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
        <button onClick={() => handleSubmit(true)} disabled={loading} style={{
          flex: 1, padding: '13px 20px', background: 'var(--dark)', color: 'var(--accent)',
          border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>{loading ? 'Enregistrement...' : 'Enregistrer + PDF'}</button>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{
          padding: '13px 20px', background: 'var(--surface-3)', color: 'var(--fg-2)',
          border: '1px solid var(--line)', borderRadius: 12, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', opacity: loading ? 0.6 : 1,
        }}>Sans PDF</button>
      </div>
    </div>
  )
}
