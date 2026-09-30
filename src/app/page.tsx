'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const CARTES = [
  { titre: 'Un vrai bilan podologique', texte: "Saisie par étapes dans l'ordre de votre consultation, schéma des zones douloureuses, tableau gauche et droite des orthèses, et un compte rendu PDF à votre en-tête. La synthèse peut être rédigée pour vous.", fond: '#dde8f6', coul: '#1d4a80', icone: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></> },
  { titre: 'Votre journée Doctolib en une capture', texte: "Une capture d'écran de votre agenda suffit : chaque rendez-vous devient une recette, l'acte est reconnu à sa couleur et le bon tarif du cabinet s'applique.", fond: '#fdebd6', coul: '#9a4a0b', icone: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></> },
  { titre: 'Des factures sans ressaisie', texte: 'Toutes les factures de la journée en un seul PDF, avec une numérotation continue, prêtes à imprimer ou à envoyer par mail.', fond: '#e3f1e7', coul: '#23633a', icone: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></> },
  { titre: 'La compta du libéral, enfin simple', texte: 'Journal jour par jour, charges et charges récurrentes, factures fournisseurs lues en photo, rétrocession calculée par cabinet et votre résultat du mois, en direct.', fond: '#efe4f4', coul: '#6a3f7c', icone: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></> },
  { titre: 'Les photos, depuis votre téléphone', texte: "Scannez un QR code, photographiez le pied ou l'empreinte du podoscope : l'image arrive directement dans le dossier ou le bilan ouvert sur l'ordinateur.", fond: '#fbe3d8', coul: '#9a3b16', icone: <><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13.5" r="3.5" /></> },
  { titre: 'Plusieurs cabinets, vos couleurs', texte: 'Tarifs, part de rétrocession et adresse propres à chaque cabinet. Et un thème de couleurs à choisir selon vos envies.', fond: '#e9eaf2', coul: '#1c1f3f', icone: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /> },
]

const CSS = `
.lp{font-family:Inter,'Helvetica Neue',sans-serif;color:#1b1d2e;background:#f4f4f7;min-height:100vh}
.lp *{box-sizing:border-box}
.lp a:focus-visible,.lp button:focus-visible{outline:2px solid #f08a24;outline-offset:3px}
.lp-serif{font-family:'Playfair Display',Georgia,serif;font-weight:400}
.lp-tete{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(18px,5vw,72px);background:#1c1f3f;color:#fff;position:sticky;top:0;z-index:10}
.lp-logo{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none}
.lp-p{width:36px;height:36px;border-radius:6px;background:#f08a24;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#fff}
.lp-nav{display:flex;gap:30px;font-size:14.5px}
.lp-nav a{color:rgba(255,255,255,.75);text-decoration:none}
.lp-nav a:hover{color:#fff}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;border:1px solid rgba(255,255,255,.25);white-space:nowrap}
.lp-btn-accent{background:#f08a24;border-color:#f08a24;font-weight:600}
.lp-btn-accent:hover{background:#d9730f}
.lp-grand{font-size:16px;padding:15px 22px;border-radius:8px}
.lp-hero{background:#1c1f3f;color:#fff;padding:70px clamp(18px,5vw,72px) 0;display:grid;grid-template-columns:minmax(0,540px) minmax(0,1fr);gap:56px;align-items:end;overflow:hidden}
.lp-hero-texte{display:flex;flex-direction:column;gap:22px;padding-bottom:90px}
.lp-hero h1{margin:0;font-size:clamp(40px,5vw,62px);line-height:1.05}
.lp-hero em{color:#f08a24}
.lp-apercu{background:#f4f4f7;border-radius:8px 8px 0 0;box-shadow:0 -10px 60px rgba(0,0,0,.35);display:flex;height:470px;overflow:hidden}
.lp-sq{border-radius:8px}
.lp-section{padding:90px clamp(18px,5vw,72px) 30px;display:flex;flex-direction:column;gap:34px;max-width:1440px;margin:0 auto}
.lp-h2{margin:0;font-size:clamp(32px,3.5vw,44px);line-height:1.1}
.lp-grille{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.lp-carte{background:#fff;border:1px solid #e1e2ea;border-radius:6px;padding:26px;display:flex;flex-direction:column;gap:10px}
.lp-carte h3{margin:0;font-size:23px}
.lp-carte p{margin:0;font-size:15px;line-height:1.6;color:#3b3f5c}
.lp-pastille{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.lp-temps{display:flex;flex-direction:column;gap:10px;padding-top:18px}
.lp-temps h3{margin:0;font-size:24px}
.lp-temps p{margin:0;font-size:15px;line-height:1.6;color:#3b3f5c}
.lp-auteur{margin:40px clamp(18px,5vw,72px) 0;background:#fff;border:1px solid #e1e2ea;border-radius:6px;padding:44px 52px;display:grid;grid-template-columns:110px minmax(0,1fr);gap:34px;align-items:center}
.lp-final{margin:70px clamp(18px,5vw,72px) 0;background:#1c1f3f;color:#fff;border-radius:6px;padding:52px;display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap}
.lp-pied{padding:44px clamp(18px,5vw,72px) 50px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:13.5px;color:#676b8a}
@media (max-width:1000px){.lp-hero{grid-template-columns:1fr}.lp-hero-texte{padding-bottom:30px}.lp-apercu{height:320px}.lp-grille{grid-template-columns:1fr 1fr}.lp-nav{display:none}}
@media (max-width:640px){.lp-grille{grid-template-columns:1fr}.lp-auteur{grid-template-columns:1fr;padding:28px}.lp-final{padding:32px}.lp-tete .lp-btn:not(.lp-btn-accent){display:none}.lp-apercu-cote{display:none}}
`

export default function Accueil() {
  const [connecte, setConnecte] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await createClient().auth.getSession()
      setConnecte(!!session)
    })()
  }, [])

  const barre = (w: string, h = 12, fond = '#e1e2ea') => <div className="lp-sq" style={{ width: w, height: h, background: fond }} />

  return (
    <div className="lp">
      <style>{CSS}</style>

      <header className="lp-tete">
        <Link href="/" className="lp-logo"><span className="lp-p">P</span><span className="lp-serif" style={{ fontSize: 22 }}>PODian</span></Link>
        <nav className="lp-nav" aria-label="Sections">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#journee">Une journée avec PODian</a>
          <a href="#createur">Qui sommes-nous</a>
        </nav>
        <div style={{ display: 'flex', gap: 10 }}>
          {connecte ? (
            <Link href="/dashboard" className="lp-btn lp-btn-accent">Ouvrir PODian</Link>
          ) : (
            <>
              <Link href="/auth/login" className="lp-btn">Se connecter</Link>
              <Link href="/auth/register" className="lp-btn lp-btn-accent">Créer mon compte</Link>
            </>
          )}
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-texte">
          <div style={{ fontSize: 13.5, color: '#ffc48a', fontWeight: 600 }}>Logiciel de cabinet pour pédicures-podologues</div>
          <h1 className="lp-serif">Moins de paperasse.<br /><em>Plus de soins.</em></h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: 'rgba(255,255,255,.8)' }}>
            Bilans podologiques complets, factures, comptabilité et photos patients, réunis dans un seul outil pensé par un podologue pour sa pratique de tous les jours.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            <Link href={connecte ? '/dashboard' : '/auth/register'} className="lp-btn lp-btn-accent lp-grand" style={{ boxShadow: '0 8px 24px rgba(240,138,36,.35)' }}>{connecte ? 'Ouvrir PODian' : 'Créer mon compte'}</Link>
            <a href="#fonctionnalites" className="lp-btn lp-grand">Voir la démo</a>
          </div>
        </div>

        <div className="lp-apercu" aria-hidden="true">
          <div className="lp-apercu-cote" style={{ width: 172, background: '#151836', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, fontSize: 12.5, color: 'rgba(255,255,255,.72)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: '#f08a24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: "'Playfair Display', Georgia, serif" }}>P</span>PODian
            </div>
            <div style={{ background: '#f08a24', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 600, textAlign: 'center', marginBottom: 12 }}>+ Nouveau</div>
            <div style={{ fontSize: 10.5, opacity: 0.6, margin: '2px 8px 4px' }}>Au cabinet</div>
            {[['Tableau de bord', true, ''], ['Patients', false, ''], ['Agenda', false, ''], ['Bilans', false, '2'], ['Ordonnances', false, '']].map(([t, actif, badge]: any) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: actif ? 'rgba(255,255,255,.1)' : 'transparent', color: actif ? '#fff' : undefined, fontWeight: actif ? 600 : 400 }}>
                {t}{badge && <span style={{ background: '#f08a24', color: '#fff', borderRadius: 10, fontSize: 10, padding: '0 6px', fontWeight: 700 }}>{badge}</span>}
              </div>
            ))}
            <div style={{ fontSize: 10.5, opacity: 0.6, margin: '10px 8px 4px' }}>Gestion</div>
            {['Devis', 'Recettes', 'Journal', 'Charges'].map(t => <div key={t} style={{ padding: '6px 8px' }}>{t}</div>)}
          </div>
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, color: '#1b1d2e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span className="lp-serif" style={{ fontSize: 22 }}>Ton activité</span>
              <span style={{ fontSize: 11.5, color: '#676b8a' }}>Septembre, tous cabinets</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8 }}>
              <div style={{ background: '#1c1f3f', color: '#fff', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, opacity: 0.7 }}>Chiffre d'affaires</div>
                <div className="lp-serif" style={{ fontSize: 24, lineHeight: 1.15 }}>5 842 €</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.15)', borderRadius: 4, marginTop: 6 }}><div style={{ width: '97%', height: '100%', background: '#f08a24', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>97 % de l'objectif</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e1e2ea', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, color: '#676b8a' }}>Ma part</div>
                <div className="lp-serif" style={{ fontSize: 20, lineHeight: 1.2 }}>4 817 €</div>
                <div style={{ fontSize: 10, color: '#676b8a', marginTop: 4 }}>après rétrocession</div>
              </div>
              <div style={{ background: '#fdebd6', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10.5, color: '#9a4a0b' }}>Résultat</div>
                <div className="lp-serif" style={{ fontSize: 20, lineHeight: 1.2, color: '#9a4a0b' }}>3 214 €</div>
                <div style={{ fontSize: 10, color: '#9a4a0b', marginTop: 4 }}>charges déduites</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
              <div style={{ background: '#fff', border: '1px solid #e1e2ea', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
                <div style={{ fontSize: 11, color: '#676b8a' }}>Chiffre d'affaires par mois</div>
                <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6, alignItems: 'end' }}>
                  {[[48, 'J'], [55, 'F'], [62, 'M'], [58, 'A'], [70, 'M'], [66, 'J'], [52, 'J'], [78, 'A'], [92, 'S']].map(([h, m], i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ width: '100%', height: h + '%', background: i === 8 ? '#f08a24' : '#1c1f3f', borderRadius: 3 }} />
                      <span style={{ fontSize: 9.5, color: '#676b8a' }}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e1e2ea', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 11, color: '#676b8a' }}>Aujourd'hui</div>
                {[['09:00', 'Claire M.', 'Soin', '#e3f1e7', '#23633a'], ['09:30', 'Idrissa D.', 'Bilan', '#dde8f6', '#1d4a80'], ['10:30', 'Luc B.', 'Orthonyxie', '#fbe3d8', '#9a3b16'], ['11:00', 'Thi N.', 'Soin', '#e3f1e7', '#23633a'], ['14:15', 'Marc R.', 'Semelles', '#efe4f4', '#6a3f7c'], ['15:00', 'Sofia M.', 'Soin', '#e3f1e7', '#23633a']].map(([h, n, a, f, c]) => (
                  <div key={h} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                    <span style={{ color: '#676b8a', width: 32, flexShrink: 0 }}>{h}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                    <span style={{ fontSize: 10, background: f, color: c, borderRadius: 20, padding: '2px 7px', fontWeight: 600 }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="fonctionnalites">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700 }}>
          <h2 className="lp-serif lp-h2">Tout ce qu'il faut au cabinet, rien de superflu</h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: '#3b3f5c' }}>Chaque fonction répond à une tâche réelle de la journée d'un podologue.</p>
        </div>
        <div className="lp-grille">
          {CARTES.map(c => (
            <article key={c.titre} className="lp-carte">
              <div className="lp-pastille" style={{ background: c.fond, color: c.coul }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{c.icone}</svg>
              </div>
              <h3 className="lp-serif">{c.titre}</h3>
              <p>{c.texte}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section" id="journee">
        <h2 className="lp-serif lp-h2">Une journée avec PODian</h2>
        <div className="lp-grille">
          <div className="lp-temps" style={{ borderTop: '3px solid #f08a24' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#c4610a' }}>Le matin</span><h3 className="lp-serif">Vous importez votre agenda</h3><p>Une capture Doctolib, et la journée est prête : patients, actes et tarifs.</p></div>
          <div className="lp-temps" style={{ borderTop: '3px solid #1c1f3f' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#1c1f3f' }}>En consultation</span><h3 className="lp-serif">Vous saisissez le bilan</h3><p>En quelques clics, photos comprises, sans jamais revenir sur papier.</p></div>
          <div className="lp-temps" style={{ borderTop: '3px solid #3f8f5a' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#23633a' }}>Le soir</span><h3 className="lp-serif">Tout est déjà à jour</h3><p>Factures éditées, journal rempli, résultat du mois calculé.</p></div>
        </div>
      </section>

      <section className="lp-auteur" id="createur">
        <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#f08a24', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }} className="lp-serif">AL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="lp-serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.35 }}>Conçu par un podologue, pour les podologues.</p>
          <span style={{ fontSize: 16, lineHeight: 1.6, color: '#3b3f5c' }}>PODian a été créé par Arthur Le Neué, pédicure-podologue D.E., qui l'utilise chaque jour dans ses deux cabinets.</span>
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-serif" style={{ margin: 0, fontSize: 'clamp(30px,3.5vw,40px)', lineHeight: 1.15 }}>Prêt à ranger le papier ?</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href={connecte ? '/dashboard' : '/auth/register'} className="lp-btn lp-btn-accent lp-grand">{connecte ? 'Ouvrir PODian' : 'Créer mon compte'}</Link>
          <a href="#fonctionnalites" className="lp-btn lp-grand">Voir la démo</a>
        </div>
      </section>

      <footer className="lp-pied">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="lp-p" style={{ width: 24, height: 24, fontSize: 13, borderRadius: 7 }}>P</span>PODian, conçu par un podologue pour les podologues</span>
        <span>© {new Date().getFullYear()} PODian</span>
      </footer>
    </div>
  )
}
