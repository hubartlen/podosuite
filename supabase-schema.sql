-- ============================================================
-- PodoSuite — Schéma Supabase
-- À coller dans SQL Editor → Run
-- ============================================================

create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  praticien_id uuid references auth.users(id) on delete cascade not null,
  nom text not null,
  prenom text not null,
  date_naissance date,
  sexe text default 'F',
  telephone text,
  email text,
  adresse text,
  num_secu text,
  mutuelle text,
  created_at timestamptz default now()
);

create table if not exists bilans (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade not null,
  praticien_id uuid references auth.users(id) on delete cascade not null,
  date_bilan date not null default current_date,
  infection_tegumentaire text not null default 'aucune',
  hyperkeratose text not null default 'aucune',
  ongles text not null default 'normaux',
  deformations text not null default 'aucune',
  valgus_calcaneen text not null default 'absent',
  patellas text not null default 'zenith',
  genou text not null default 'normal',
  bassin text not null default 'absent',
  ceinture_scapulaire text not null default 'absent',
  semelles_hci boolean default false,
  semelles_hce boolean default false,
  semelles_barre boolean default false,
  semelles_coins boolean default false,
  talonnette_cote text default 'aucune',
  talonnette_mm integer,
  remarques text,
  created_at timestamptz default now()
);

create table if not exists factures (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id) on delete cascade not null,
  praticien_id uuid references auth.users(id) on delete cascade not null,
  numero text not null unique,
  date_facture date not null default current_date,
  actes jsonb not null default '[]',
  mode_paiement text not null default 'Chèque',
  mention text,
  total numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists rendez_vous (
  id uuid default gen_random_uuid() primary key,
  praticien_id uuid references auth.users(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete set null,
  date_heure timestamptz not null,
  duree integer not null default 30,
  type text not null default 'consultation',
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table patients enable row level security;
alter table bilans enable row level security;
alter table factures enable row level security;
alter table rendez_vous enable row level security;

-- Policies : chaque praticien voit uniquement ses données
create policy "patients_own" on patients
  for all using (auth.uid() = praticien_id);

create policy "bilans_own" on bilans
  for all using (auth.uid() = praticien_id);

create policy "factures_own" on factures
  for all using (auth.uid() = praticien_id);

create policy "rendez_vous_own" on rendez_vous
  for all using (auth.uid() = praticien_id);
