import { supabase } from "./supabaseClient";

// Élèves d'une section pour l'année scolaire donnée, avec leur présence du jour si elle existe déjà.
export async function elevesPourAppel(sectionId, anneeScolaireId, date) {
  const { data: inscrits, error: err1 } = await supabase
    .from("inscriptions")
    .select("eleve_id, eleves(id, prenom, nom)")
    .eq("section_id", sectionId)
    .eq("annee_scolaire_id", anneeScolaireId);
  if (err1) throw err1;

  const eleveIds = inscrits.map((i) => i.eleve_id);
  let presencesDuJour = [];
  if (eleveIds.length > 0) {
    const { data, error: err2 } = await supabase
      .from("presences")
      .select("*")
      .in("eleve_id", eleveIds)
      .eq("date", date);
    if (err2) throw err2;
    presencesDuJour = data;
  }

  return inscrits
    .map((i) => i.eleves)
    .filter(Boolean)
    .map((eleve) => ({
      ...eleve,
      statut: presencesDuJour.find((p) => p.eleve_id === eleve.id)?.statut ?? null,
    }));
}

export async function enregistrerPresence({ eleve_id, date, statut, enregistre_par }) {
  const { data, error } = await supabase
    .from("presences")
    .upsert({ eleve_id, date, statut, enregistre_par }, { onConflict: "eleve_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function historiquePresences(eleveId) {
  const { data, error } = await supabase
    .from("presences")
    .select("*")
    .eq("eleve_id", eleveId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function presencesDuJour(date) {
  const { data, error } = await supabase.from("presences").select("statut").eq("date", date);
  if (error) throw error;
  return data;
}
