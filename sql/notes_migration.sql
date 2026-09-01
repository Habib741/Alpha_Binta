-- Migration Notes : à exécuter dans Supabase SQL Editor.
-- Cette migration peut être rejouée sans erreur.

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

-- Diagnostic facultatif : le résultat doit être DIRECTRICE ou ENSEIGNANT.
-- select auth.uid(), public.mon_role();
