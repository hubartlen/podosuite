import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Paramètres</h1>
      <p className="text-slate-500 text-sm mb-8">Informations du cabinet</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Praticien</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Nom', 'Le Neué'],
            ['Prénom', 'Arthur'],
            ['Titre', 'Pédicure Podologue DE'],
            ['Email', user?.email || ''],
            ['Téléphone', '06 89 40 51 05'],
            ['N° RPPS', '10111902820'],
            ['N° AM', '938002623'],
            ['Adresse', '4 rue saint Just'],
            ['Code postal', '93210'],
            ['Ville', 'La Plaine Saint Denis'],
          ].map(([label, value]) => (
            <div key={label} className={label === 'Adresse' || label === 'Email' ? 'col-span-2' : ''}>
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-sm font-medium text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Pour modifier ces informations, contacte le support ou édite directement les fichiers de configuration.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Compte</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Email de connexion</p>
            <p className="text-sm font-medium text-slate-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Statut</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Actif
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
