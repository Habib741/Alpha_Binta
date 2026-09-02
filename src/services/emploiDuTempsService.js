import { supabase } from "./supabaseClient";

const BUCKET_NAME = "emploi-du-temps";
export function obtenirUrlEmploiDuTemps(cheminStorage) {
  if (!cheminStorage) return "";
  return supabase.storage.from(BUCKET_NAME).getPublicUrl(cheminStorage).data.publicUrl;
}

export async function listerEmploisDuTemps() {
  const { data, error } = await supabase
    .from("emplois_du_temps")
    .select("*, sections(id, nom)")
    .order("section_id");

  if (error) throw error;
  return data;
}

export async function enregistrerEmploiDuTemps(file, sectionId, utilisateurId) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Veuillez sélectionner une image.");
  }

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const cheminStorage = `emploi-du-temps/${sectionId}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(cheminStorage, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("emplois_du_temps")
    .upsert(
      {
        id: sectionId,
        section_id: sectionId,
        chemin_storage: cheminStorage,
        nom_fichier: file.name,
        mime_type: file.type,
        taille_bytes: file.size,
        publie_par: utilisateurId,
        mis_a_jour_le: new Date().toISOString(),
      },
      { onConflict: "section_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
