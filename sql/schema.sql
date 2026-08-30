-- ============================================================================
-- ÉCOLE ALPHA ET BINTA — SCHÉMA SUPABASE (V1)
-- ============================================================================
-- À exécuter dans l'éditeur SQL de votre projet Supabase, dans l'ordre.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES DE RÉFÉRENCE
-- ============================================================================

create table sections (
  id uuid primary key default gen_random_uuid(),
  nom text unique not null,
  ordre smallint not null
);

create table annees_scolaires (
  id uuid primary key default gen_random_uuid(),
  libelle text unique not null,
  date_debut date not null,
  date_fin date not null,
  est_active boolean not null default false
);
create unique index one_annee_active on annees_scolaires (est_active) where est_active;

-- ============================================================================
-- 2. PROFILS / UTILISATEURS
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('DIRECTRICE','ENSEIGNANT','PARENT')),
  prenom text not null,
  nom text not null,
  telephone text,
  fonction text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);

-- ============================================================================
-- 3. ÉLÈVES ET INSCRIPTIONS
-- ============================================================================

create table eleves (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  date_naissance date not null,
  sexe text check (sexe in ('M','F')),
  informations_complementaires text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_eleves_nom_prenom on eleves(nom, prenom);

create table inscriptions (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete restrict,
  section_id uuid not null references sections(id),
  annee_scolaire_id uuid not null references annees_scolaires(id),
  date_inscription date not null default now(),
  unique (eleve_id, annee_scolaire_id)
);
create index idx_inscriptions_annee_section on inscriptions(annee_scolaire_id, section_id);

-- ============================================================================
-- 4. TARIFS
-- ============================================================================

create table tarifs (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id),
  annee_scolaire_id uuid not null references annees_scolaires(id),
  type text not null check (type in ('INSCRIPTION','MENSUALITE','COTISATION')),
  libelle text,
  montant numeric(10,2) not null check (montant >= 0),
  unique (section_id, annee_scolaire_id, type, libelle)
);

-- ============================================================================
-- 5. PARENTS
-- ============================================================================

create table parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references profiles(id) on delete set null,
  prenom text not null,
  nom text not null,
  telephone text not null,
  adresse text
);
create index idx_parents_profile on parents(profile_id);

create table parents_eleves (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete restrict,
  eleve_id uuid not null references eleves(id) on delete restrict,
  lien text,
  unique (parent_id, eleve_id)
);
create index idx_parents_eleves_eleve on parents_eleves(eleve_id);
create index idx_parents_eleves_parent on parents_eleves(parent_id);

-- ============================================================================
-- 6. PRÉSENCES
-- ============================================================================

create table presences (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete restrict,
  date date not null,
  statut text not null check (statut in ('PRESENT','ABSENT')),
  enregistre_par uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (eleve_id, date)
);
create index idx_presences_date on presences(date);
create index idx_presences_eleve on presences(eleve_id);

-- ============================================================================
-- 7. PAIEMENTS
-- ============================================================================

create table paiements (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves(id) on delete restrict,
  type text not null check (type in ('INSCRIPTION','MENSUALITE','COTISATION')),
  montant numeric(10,2) not null check (montant > 0),
  mode text not null check (mode in ('ESPECES','WAVE','ORANGE_MONEY')),
  date_paiement date not null default now(),
  enregistre_par uuid not null references profiles(id),
  commentaire text
);
create index idx_paiements_eleve on paiements(eleve_id);
create index idx_paiements_date on paiements(date_paiement);

-- ============================================================================
-- 8. INFORMATIONS ÉCOLE
-- ============================================================================

create table informations_ecole (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  contenu text not null,
  date_publication timestamptz not null default now(),
  auteur_id uuid not null references profiles(id),
  visible boolean not null default true
);
create index idx_infos_ecole_date on informations_ecole(date_publication desc);

-- ============================================================================
-- 9. VUE — SOLDE PAR ÉLÈVE (total dû / payé / reste, pour l'année active)
-- ============================================================================

create or replace view vue_solde_eleve as
select
  e.id as eleve_id,
  e.prenom,
  e.nom,
  i.section_id,
  i.annee_scolaire_id,
  coalesce((
    select sum(t.montant) from tarifs t
    where t.section_id = i.section_id
      and t.annee_scolaire_id = i.annee_scolaire_id
  ), 0) as total_du,
  coalesce((
    select sum(p.montant) from paiements p
    where p.eleve_id = e.id
  ), 0) as total_paye,
  coalesce((
    select sum(t.montant) from tarifs t
    where t.section_id = i.section_id
      and t.annee_scolaire_id = i.annee_scolaire_id
  ), 0)
  -
  coalesce((
    select sum(p.montant) from paiements p
    where p.eleve_id = e.id
  ), 0) as reste_a_payer
from eleves e
join inscriptions i on i.eleve_id = e.id
join annees_scolaires a on a.id = i.annee_scolaire_id and a.est_active = true
where e.actif = true;

-- ============================================================================
-- 10. FONCTIONS UTILITAIRES (security definer, pour éviter la récursion RLS)
-- ============================================================================

create or replace function public.mon_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.est_mon_enfant(p_eleve_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.parents_eleves pe
    join public.parents p on p.id = pe.parent_id
    where pe.eleve_id = p_eleve_id
      and p.profile_id = auth.uid()
  );
$$;

-- ============================================================================
-- 11. TRIGGER — protection du champ "role" dans profiles
-- ============================================================================

create or replace function public.proteger_role()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role is distinct from old.role and mon_role() <> 'DIRECTRICE' then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_role
before update on profiles
for each row execute function proteger_role();

-- ============================================================================
-- 12. ACTIVATION DE ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table eleves enable row level security;
alter table inscriptions enable row level security;
alter table sections enable row level security;
alter table annees_scolaires enable row level security;
alter table tarifs enable row level security;
alter table parents enable row level security;
alter table parents_eleves enable row level security;
alter table presences enable row level security;
alter table paiements enable row level security;
alter table informations_ecole enable row level security;

-- ============================================================================
-- 13. POLITIQUES RLS
-- ============================================================================

-- PROFILES
create policy profiles_select on profiles for select
using (id = auth.uid() or mon_role() = 'DIRECTRICE');

create policy profiles_update_self on profiles for update
using (id = auth.uid());

create policy profiles_update_directrice on profiles for update
using (mon_role() = 'DIRECTRICE');

create policy profiles_insert_directrice on profiles for insert
with check (mon_role() = 'DIRECTRICE');

-- SECTIONS
create policy sections_select on sections for select
using (auth.uid() is not null);
create policy sections_insert on sections for insert
with check (mon_role() = 'DIRECTRICE');
create policy sections_update on sections for update
using (mon_role() = 'DIRECTRICE');
create policy sections_delete on sections for delete
using (mon_role() = 'DIRECTRICE');

-- ANNEES SCOLAIRES
create policy annees_select on annees_scolaires for select
using (auth.uid() is not null);
create policy annees_insert on annees_scolaires for insert
with check (mon_role() = 'DIRECTRICE');
create policy annees_update on annees_scolaires for update
using (mon_role() = 'DIRECTRICE');
create policy annees_delete on annees_scolaires for delete
using (mon_role() = 'DIRECTRICE');

-- TARIFS
create policy tarifs_select on tarifs for select
using (auth.uid() is not null);
create policy tarifs_insert on tarifs for insert
with check (mon_role() = 'DIRECTRICE');
create policy tarifs_update on tarifs for update
using (mon_role() = 'DIRECTRICE');
create policy tarifs_delete on tarifs for delete
using (mon_role() = 'DIRECTRICE');

-- ELEVES
create policy eleves_select_staff on eleves for select
using (mon_role() in ('DIRECTRICE','ENSEIGNANT'));
create policy eleves_select_parent on eleves for select
using (mon_role() = 'PARENT' and est_mon_enfant(id));
create policy eleves_insert on eleves for insert
with check (mon_role() = 'DIRECTRICE');
create policy eleves_update on eleves for update
using (mon_role() = 'DIRECTRICE');

-- INSCRIPTIONS
create policy inscriptions_select_staff on inscriptions for select
using (mon_role() in ('DIRECTRICE','ENSEIGNANT'));
create policy inscriptions_select_parent on inscriptions for select
using (mon_role() = 'PARENT' and est_mon_enfant(eleve_id));
create policy inscriptions_insert on inscriptions for insert
with check (mon_role() = 'DIRECTRICE');
create policy inscriptions_update on inscriptions for update
using (mon_role() = 'DIRECTRICE');

-- PARENTS
create policy parents_select_directrice on parents for select
using (mon_role() = 'DIRECTRICE');
create policy parents_select_self on parents for select
using (profile_id = auth.uid());
create policy parents_insert on parents for insert
with check (mon_role() = 'DIRECTRICE');
create policy parents_update on parents for update
using (mon_role() = 'DIRECTRICE' or profile_id = auth.uid());

-- PARENTS_ELEVES
create policy parents_eleves_select_directrice on parents_eleves for select
using (mon_role() = 'DIRECTRICE');
create policy parents_eleves_select_self on parents_eleves for select
using (
  exists (
    select 1 from parents p
    where p.id = parents_eleves.parent_id
    and p.profile_id = auth.uid()
  )
);
create policy parents_eleves_insert on parents_eleves for insert
with check (mon_role() = 'DIRECTRICE');

-- PRESENCES
create policy presences_select_staff on presences for select
using (mon_role() in ('DIRECTRICE','ENSEIGNANT'));
create policy presences_select_parent on presences for select
using (mon_role() = 'PARENT' and est_mon_enfant(eleve_id));
create policy presences_insert on presences for insert
with check (mon_role() in ('DIRECTRICE','ENSEIGNANT'));
create policy presences_update on presences for update
using (mon_role() in ('DIRECTRICE','ENSEIGNANT'));

-- PAIEMENTS
create policy paiements_select_directrice on paiements for select
using (mon_role() = 'DIRECTRICE');
create policy paiements_select_parent on paiements for select
using (mon_role() = 'PARENT' and est_mon_enfant(eleve_id));
create policy paiements_insert on paiements for insert
with check (mon_role() = 'DIRECTRICE');
create policy paiements_update on paiements for update
using (mon_role() = 'DIRECTRICE');

-- INFORMATIONS ECOLE
create policy infos_select_directrice on informations_ecole for select
using (mon_role() = 'DIRECTRICE');
create policy infos_select_public on informations_ecole for select
using (mon_role() in ('ENSEIGNANT','PARENT') and visible = true);
create policy infos_insert on informations_ecole for insert
with check (mon_role() = 'DIRECTRICE');
create policy infos_update on informations_ecole for update
using (mon_role() = 'DIRECTRICE');
create policy infos_delete on informations_ecole for delete
using (mon_role() = 'DIRECTRICE');

-- ============================================================================
-- 14. DONNÉES DE RÉFÉRENCE INITIALES
-- ============================================================================

insert into sections (nom, ordre) values
  ('Petite Section', 1),
  ('Moyenne Section', 2),
  ('Grande Section', 3);

insert into annees_scolaires (libelle, date_debut, date_fin, est_active) values
  ('2025-2026', '2025-10-01', '2026-07-31', true);
