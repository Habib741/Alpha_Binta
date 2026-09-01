import { supabase } from "./supabaseClient";

export async function listerInformations() {
  const { data, error } = await supabase
    .from("informations_ecole")
    .select("*")
    .order("date_publication", { ascending: false });
  if (error) throw error;
  return data;
}

export async function publierInformation(info) {
  const { data, error } = await supabase
    .from("informations_ecole")
    .insert(info)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function modifierInformation(id, changements) {
  const { data, error } = await supabase
    .from("informations_ecole")
    .update(changements)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function supprimerInformation(id) {
  const { error } = await supabase
    .from("informations_ecole")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
