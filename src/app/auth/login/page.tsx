'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div style={{minHeight:'100vh',background:'#1a1410',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:'380px'}}>
        <div style={{textAlign:'center',marginBottom:'40px'}}>
          <div style={{width:'56px',height:'56px',background:'#c8b89a',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontFamily:'Playfair Display, serif',fontSize:'24px',color:'#1a1410',fontWeight:'500'}}>P</div>
          <h1 style={{fontFamily:'Playfair Display, serif',fontSize:'28px',color:'#f5f2ee',fontWeight:'400',letterSpacing:'-0.01em',marginBottom:'6px'}}>PODian</h1>
          <p style={{fontSize:'13px',color:'#9b8f7e',letterSpacing:'0.04em'}}>Cabinet Arthur Le Neué</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{background:'rgba(226,75,74,0.1)',border:'1px solid rgba(226,75,74,0.3)',borderRadius:'12px',padding:'12px 16px',marginBottom:'16px',fontSize:'13px',color:'#f09595',textAlign:'center'}}>
              {error}
            </div>
          )}
          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',fontSize:'11px',color:'#9b8f7e',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'8px'}}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required
              style={{width:'100%',padding:'14px 16px',background:'#2a2018',border:'1px solid #3a3028',borderRadius:'14px',fontSize:'14px',color:'#f5f2ee',outline:'none',fontFamily:'Inter, sans-serif'}}
            />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',fontSize:'11px',color:'#9b8f7e',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:'8px'}}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{width:'100%',padding:'14px 16px',background:'#2a2018',border:'1px solid #3a3028',borderRadius:'14px',fontSize:'14px',color:'#f5f2ee',outline:'none',fontFamily:'Inter, sans-serif'}}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'15px',background:'#c8b89a',border:'none',borderRadius:'14px',fontSize:'14px',fontWeight:'500',color:'#1a1410',cursor:loading?'not-allowed':'pointer',fontFamily:'Inter, sans-serif',letterSpacing:'0.02em',opacity:loading?0.7:1}}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
