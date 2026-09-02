import { supabase } from "./supabaseClient";

export async function listerEleves() {
  const { data, error } = await supabase
    .from("eleves")
    .select("*, inscriptions(section_id, annee_scolaire_id, sections(nom), annees_scolaires(libelle))")
    .eq("actif", true)
    .order("nom", { ascending: true });
  if (error) throw error;
  return data;
}

export async function creerEleve(eleve) {
  const { data, error } = await supabase.from("eleves").insert(eleve).select().single();
  if (error) throw error;
  return data;
}

export async function modifierEleve(id, changements) {
  const { data, error } = await supabase
    .from("eleves")
    .update(changements)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function desactiverEleve(id) {
  return modifierEleve(id, { actif: false });
}

export async function creerInscription(inscription) {
  const { data, error } = await supabase
    .from("inscriptions")
    .insert(inscription)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function modifierInscription(id, changements) {
  const { data, error } = await supabase
    .from("inscriptions")
    .update(changements)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listerSections() {
  const { data, error } = await supabase.from("sections").select("*").order("ordre");
  if (error) throw error;
  return data;
}

export async function listerAnneesScolaires() {
  const { data, error } = await supabase
    .from("annees_scolaires")
    .select("*")
    .order("date_debut", { ascending: false });
  if (error) throw error;
  return data;
}

export async function anneeActive() {
  const { data, error } = await supabase
    .from("annees_scolaires")
    .select("*")
    .eq("est_active", true)
    .single();
  if (error) throw error;
  return data;
}
