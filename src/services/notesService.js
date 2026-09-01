import { supabase } from "./supabaseClient";

export async function listerMatieres(sectionId = "") {
  let requete = supabase.from("matieres").select("*, sections(nom)").order("ordre").order("nom");
  if (sectionId) requete = requete.eq("section_id", sectionId);
  const { data, error } = await requete;
  if (error) throw error;
  return data ?? [];
}

export async function creerMatiere(matiere) {
  const { data, error } = await supabase.from("matieres").insert(matiere).select().single();
  if (error) throw error;
  return data;
}

export async function modifierMatiere(id, changements) {
  const { data, error } = await supabase.from("matieres").update(changements).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function supprimerMatiere(id) {
  const { error } = await supabase.from("matieres").delete().eq("id", id);
  if (error) throw error;
}

export async function obtenirOuCreerComposition(sectionId, anneeScolaireId, creeePar) {
  const { data: existante, error: lectureError } = await supabase
    .from("compositions")
    .select("*")
    .eq("section_id", sectionId)
    .eq("annee_scolaire_id", anneeScolaireId)
    .maybeSingle();
  if (lectureError) throw lectureError;
  if (existante) return existante;

  const { data, error } = await supabase
    .from("compositions")
    .insert({ section_id: sectionId, annee_scolaire_id: anneeScolaireId, creee_par: creeePar })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function modifierComposition(id, changements) {
  const { data, error } = await supabase.from("compositions").update(changements).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function supprimerComposition(id) {
  const { error } = await supabase.from("compositions").delete().eq("id", id);
  if (error) throw error;
}

export async function listerNotes(compositionId) {
  const { data, error } = await supabase
    .from("notes")
    .select("*, eleves(id, prenom, nom), matieres(id, nom, section_id)")
    .eq("composition_id", compositionId);
  if (error) throw error;
  return data ?? [];
}

export async function enregistrerNote(note) {
  const { data, error } = await supabase
    .from("notes")
    .upsert(note, { onConflict: "composition_id,eleve_id,matiere_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function supprimerNote(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function notesDeMesEnfants() {
  const { data, error } = await supabase
    .from("notes")
    .select("id, valeur, commentaire, eleves(id, prenom, nom), matieres(nom), compositions(id, libelle, statut, section_id, annee_scolaire_id, annees_scolaires(libelle))")
    .order("id");
  if (error) throw error;
  return data ?? [];
}
