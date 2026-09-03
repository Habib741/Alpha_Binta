-- Migration Notes : à exécuter dans Supabase SQL Editor.
-- Cette migration peut être rejouée sans erreur.

-- Le bucket doit être public pour permettre l'affichage des photos et
-- l'ouverture des documents via leurs URLs Storage.
insert into storage.buckets (id, name, public)
values ('documents-enfants', 'documents-enfants', false)
on conflict (id) do update set public = false;

drop policy if exists documents_enfants_select on storage.objects;
create policy documents_enfants_select on storage.objects
for select
using (
  bucket_id = 'documents-enfants'
  and (
    public.mon_role() = 'DIRECTRICE'
    or (
      public.mon_role() = 'PARENT'
      and name ~ '^eleves/[0-9a-f-]{36}/'
      and exists (select 1 from public.parents_eleves pe join public.parents p on p.id = pe.parent_id where pe.eleve_id = split_part(name, '/', 2)::uuid and p.profile_id = auth.uid())
    )
  )
);

drop policy if exists documents_enfants_insert_directrice on storage.objects;
drop policy if exists documents_enfants_update_directrice on storage.objects;
drop policy if exists documents_enfants_delete_directrice on storage.objects;
create policy documents_enfants_insert_directrice on storage.objects
for insert with check (bucket_id = 'documents-enfants' and public.mon_role() = 'DIRECTRICE');
create policy documents_enfants_update_directrice on storage.objects
for update using (bucket_id = 'documents-enfants' and public.mon_role() = 'DIRECTRICE')
with check (bucket_id = 'documents-enfants' and public.mon_role() = 'DIRECTRICE');
create policy documents_enfants_delete_directrice on storage.objects
for delete using (bucket_id = 'documents-enfants' and public.mon_role() = 'DIRECTRICE');

insert into storage.buckets (id, name, public)
values ('emploi-du-temps', 'emploi-du-temps', true)
on conflict (id) do update set public = true;

create table if not exists public.emplois_du_temps (
  id uuid primary key,
  section_id uuid references public.sections(id) on delete cascade,
  chemin_storage text not null,
  nom_fichier text not null,
  mime_type text not null,
  taille_bytes bigint,
  publie_par uuid not null references public.profiles(id),
  mis_a_jour_le timestamptz not null default now()
);

alter table public.emplois_du_temps add column if not exists section_id uuid references public.sections(id) on delete cascade;
create unique index if not exists emplois_du_temps_section_unique on public.emplois_du_temps(section_id);

alter table public.emplois_du_temps enable row level security;
drop policy if exists emplois_du_temps_select on public.emplois_du_temps;
drop policy if exists emplois_du_temps_insert_directrice on public.emplois_du_temps;
drop policy if exists emplois_du_temps_update_directrice on public.emplois_du_temps;
create policy emplois_du_temps_select on public.emplois_du_temps for select
using (auth.uid() is not null);
create policy emplois_du_temps_insert_directrice on public.emplois_du_temps for insert
with check (public.mon_role() = 'DIRECTRICE');
create policy emplois_du_temps_update_directrice on public.emplois_du_temps for update
using (public.mon_role() = 'DIRECTRICE')
with check (public.mon_role() = 'DIRECTRICE');

drop policy if exists emploi_du_temps_select on storage.objects;
drop policy if exists emploi_du_temps_insert_directrice on storage.objects;
drop policy if exists emploi_du_temps_update_directrice on storage.objects;
drop policy if exists emploi_du_temps_delete_directrice on storage.objects;
create policy emploi_du_temps_select on storage.objects
for select using (bucket_id = 'emploi-du-temps' and auth.uid() is not null);
create policy emploi_du_temps_insert_directrice on storage.objects
for insert with check (
  bucket_id = 'emploi-du-temps'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'DIRECTRICE')
);
create policy emploi_du_temps_update_directrice on storage.objects
for update using (
  bucket_id = 'emploi-du-temps'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'DIRECTRICE')
)
with check (
  bucket_id = 'emploi-du-temps'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'DIRECTRICE')
);
create policy emploi_du_temps_delete_directrice on storage.objects
for delete using (
  bucket_id = 'emploi-du-temps'
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'DIRECTRICE')
);

drop policy if exists eleves_update_directrice on public.eleves;
drop policy if exists eleves_delete_directrice on public.eleves;
create policy eleves_update_directrice on public.eleves for update
using (public.mon_role() = 'DIRECTRICE')
with check (public.mon_role() = 'DIRECTRICE');
create policy eleves_delete_directrice on public.eleves for delete
using (public.mon_role() = 'DIRECTRICE');

drop policy if exists inscriptions_update_directrice on public.inscriptions;
create policy inscriptions_update_directrice on public.inscriptions for update
using (public.mon_role() = 'DIRECTRICE')
with check (public.mon_role() = 'DIRECTRICE');

drop policy if exists parents_eleves_insert_directrice on public.parents_eleves;
create policy parents_eleves_insert_directrice on public.parents_eleves for insert
with check (public.mon_role() = 'DIRECTRICE');

drop policy if exists parents_eleves_delete_directrice on public.parents_eleves;
create policy parents_eleves_delete_directrice on public.parents_eleves for delete
using (public.mon_role() = 'DIRECTRICE');

drop policy if exists parents_delete_directrice on public.parents;
create policy parents_delete_directrice on public.parents for delete
using (public.mon_role() = 'DIRECTRICE');

drop policy if exists documents_enfants_select_staff on public.documents_enfants;
drop policy if exists documents_enfants_select_directrice on public.documents_enfants;
create policy documents_enfants_select_directrice on public.documents_enfants for select
using (public.mon_role() = 'DIRECTRICE');

alter table public.matieres enable row level security;
alter table public.compositions enable row level security;
alter table public.notes enable row level security;

drop policy if exists matieres_select on public.matieres;
drop policy if exists matieres_insert_staff on public.matieres;
drop policy if exists matieres_update_staff on public.matieres;
drop policy if exists matieres_delete_staff on public.matieres;

drop policy if exists compositions_select_staff on public.compositions;
drop policy if exists compositions_select_parent on public.compositions;
drop policy if exists compositions_insert_staff on public.compositions;
drop policy if exists compositions_update_staff on public.compositions;
drop policy if exists compositions_delete_staff on public.compositions;

drop policy if exists notes_select_staff on public.notes;
drop policy if exists notes_select_parent on public.notes;
drop policy if exists notes_insert_staff on public.notes;
drop policy if exists notes_update_staff on public.notes;
drop policy if exists notes_delete_staff on public.notes;

create policy matieres_select on public.matieres for select
using (auth.uid() is not null);
create policy matieres_insert_staff on public.matieres for insert
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy matieres_update_staff on public.matieres for update
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'))
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy matieres_delete_staff on public.matieres for delete
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));

create policy compositions_select_staff on public.compositions for select
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy compositions_select_parent on public.compositions for select
using (
  public.mon_role() = 'PARENT'
  and statut = 'PUBLIEE'
  and exists (
    select 1
    from public.inscriptions i
    join public.parents_eleves pe on pe.eleve_id = i.eleve_id
    join public.parents p on p.id = pe.parent_id
    where i.section_id = compositions.section_id
      and i.annee_scolaire_id = compositions.annee_scolaire_id
      and p.profile_id = auth.uid()
  )
);
create policy compositions_insert_staff on public.compositions for insert
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy compositions_update_staff on public.compositions for update
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'))
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy compositions_delete_staff on public.compositions for delete
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));

create policy notes_select_staff on public.notes for select
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy notes_select_parent on public.notes for select
using (
  public.mon_role() = 'PARENT'
  and exists (
    select 1
    from public.compositions c
    join public.parents_eleves pe on pe.eleve_id = notes.eleve_id
    join public.parents p on p.id = pe.parent_id
    where c.id = notes.composition_id
      and c.statut = 'PUBLIEE'
      and p.profile_id = auth.uid()
  )
);
create policy notes_insert_staff on public.notes for insert
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy notes_update_staff on public.notes for update
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'))
with check (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));
create policy notes_delete_staff on public.notes for delete
using (public.mon_role() in ('DIRECTRICE', 'ENSEIGNANT'));

alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, prenom, nom, telephone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'PARENT'),
    coalesce(new.raw_user_meta_data->>'prenom', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'nom', 'Sans nom'),
    new.raw_user_meta_data->>'telephone',
    new.email
  )
  on conflict (id) do update
  set role = excluded.role,
      prenom = excluded.prenom,
      nom = excluded.nom,
      telephone = coalesce(excluded.telephone, public.profiles.telephone),
      email = coalesce(excluded.email, public.profiles.email);

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute procedure public.sync_profile_email();

update public.profiles p
set email = au.email
from auth.users au
where p.id = au.id
  and p.email is null;

-- Vérification facultative : cette requête doit retourner une ligne avec email.
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name = 'email';

-- Diagnostic facultatif : le résultat doit être DIRECTRICE ou ENSEIGNANT.
-- select auth.uid(), public.mon_role();
