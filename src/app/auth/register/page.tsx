'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (form.password.length < 6) { setError('Mot de passe trop court (6 caractères minimum)'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { nom: form.nom, prenom: form.prenom } }
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('praticiens').upsert({
        id: data.user.id, nom: form.nom, prenom: form.prenom, email: form.email
      })
    }
    router.push('/dashboard/settings?welcome=1')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', background: '#2a2018', border: '1px solid #3a3028',
    borderRadius: '12px', fontSize: '14px', color: '#f5f2ee', outline: 'none', fontFamily: 'Inter, sans-serif'
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: '#9b8f7e', letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: '7px'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1410', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ width: '52px', height: '52px', background: '#c8b89a', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontFamily: 'Playfair Display, serif', fontSize: '22px', color: '#1a1410' }}>P</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', color: '#f5f2ee', fontWeight: '400', marginBottom: '6px' }}>Créer un compte</h1>
          <p style={{ fontSize: '13px', color: '#9b8f7e' }}>PODian — Gestion de cabinet podologique</p>
        </div>

        <form onSubmit={handleRegister}>
          {error && <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '10px', padding: '11px 14px', marginBottom: '16px', fontSize: '13px', color: '#f09595', textAlign: 'center' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Nom</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Le Neué" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Arthur" required style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Email professionnel</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@cabinet.fr" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Mot de passe</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#c8b89a', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: '#1a1410', cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#9b8f7e' }}>
            Déjà un compte ?{' '}
            <Link href="/auth/login" style={{ color: '#c8b89a', textDecoration: 'none' }}>Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
