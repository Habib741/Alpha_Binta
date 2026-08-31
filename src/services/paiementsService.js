import { supabase } from "./supabaseClient";

export async function listerTarifs() {
  const { data, error } = await supabase
    .from("tarifs")
    .select("*, sections(nom), annees_scolaires(libelle)")
    .order("annee_scolaire_id", { ascending: false });

  if (error) throw error;
  return data;
}

export async function creerTarif(tarif) {
  const { data, error } = await supabase.from("tarifs").insert(tarif).select().single();
  if (error) throw error;
  return data;
}

export async function modifierTarif(id, changements) {
  const { data, error } = await supabase.from("tarifs").update(changements).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function supprimerTarif(id) {
  const { error } = await supabase.from("tarifs").delete().eq("id", id);
  if (error) throw error;
}

// Utilise la vue SQL vue_solde_eleve (total dû / payé / reste), voir sql/schema.sql
export async function soldeTousLesEleves() {
  const { data, error } = await supabase
    .from("vue_solde_eleve")
    .select("*")
    .order("nom", { ascending: true });
  if (error) throw error;
  return data;
}

export async function soldeEleve(eleveId) {
  const { data, error } = await supabase
    .from("vue_solde_eleve")
    .select("*")
    .eq("eleve_id", eleveId)
    .single();
  if (error) throw error;
  return data;
}

export async function historiquePaiements(eleveId) {
  const { data, error } = await supabase
    .from("paiements")
    .select("*")
    .eq("eleve_id", eleveId)
    .order("date_paiement", { ascending: false });
  if (error) throw error;
  return data;
}

export async function tousLesPaiementsRecents(limite = 15) {
  const { data, error } = await supabase
    .from("paiements")
    .select("*, eleves(prenom, nom)")
    .order("date_paiement", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function enregistrerPaiement(paiement) {
  const { data, error } = await supabase.from("paiements").insert(paiement).select().single();
  if (error) throw error;
  return data;
}

export async function modifierPaiement(id, changements) {
  const { data, error } = await supabase.from("paiements").update(changements).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function supprimerPaiement(id) {
  const { error } = await supabase.from("paiements").delete().eq("id", id);
  if (error) throw error;
}
