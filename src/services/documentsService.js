import { supabase } from "./supabaseClient";

export const DOC_TYPES = {
  PHOTO_IDENTITE_1: "PHOTO_IDENTITE_1",
  PHOTO_IDENTITE_2: "PHOTO_IDENTITE_2",
  EXTRAIT_NAISSANCE: "EXTRAIT_NAISSANCE",
  CNI_PARENT: "CNI_PARENT",
  CARNET_SANTE: "CARNET_SANTE",
};

const BUCKET_NAME = "documents-enfants";

function buildStoragePath(eleveId, typeDocument, fileName) {
  const extension = (fileName?.split(".").pop() || "bin").toLowerCase();
  return `eleves/${eleveId}/${typeDocument}.${extension}`;
}

export async function televerserDocumentEleve({ eleveId, typeDocument, file, obligatoire = true }) {
  if (!file) return null;

  const path = buildStoragePath(eleveId, typeDocument, file.name);

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from("documents_enfants")
    .upsert(
      {
        eleve_id: eleveId,
        type_document: typeDocument,
        nom_fichier: file.name,
        chemin_storage: path,
        mime_type: file.type || null,
        taille_bytes: file.size || null,
        obligatoire,
      },
      { onConflict: "eleve_id,type_document" }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listerDocumentsEleve(eleveId) {
  const { data, error } = await supabase
    .from("documents_enfants")
    .select("*")
    .eq("eleve_id", eleveId)
    .order("cree_le", { ascending: true });

  if (error) throw error;
  return data;
}
