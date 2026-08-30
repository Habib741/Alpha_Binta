import { supabase } from "./supabaseClient";

export async function listerParents() {
  const { data, error } = await supabase
    .from("parents")
    .select("*, parents_eleves(eleve_id, lien, eleves(prenom, nom))")
    .order("nom");
  if (error) throw error;
  return data;
}

export async function listerEnfantsDisponibles() {
  const { data, error } = await supabase
    .from("eleves")
    .select("id, prenom, nom, actif, inscriptions(section_id, sections(nom))")
    .eq("actif", true)
    .order("nom", { ascending: true });
  if (error) throw error;
  return data;
}

export async function creerCompteParent({ prenom, nom, telephone, email, adresse, enfants = [] }) {
  const motDePasse = `AB-${prenom.slice(0, 2).toUpperCase()}-${Math.random().toString(36).slice(-8).toUpperCase()}`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      data: {
        prenom,
        nom,
        role: "PARENT",
      },
    },
  });

  if (authError) throw authError;

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error("La création du compte parent a échoué : aucun utilisateur n’a été renvoyé par Supabase.");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: "PARENT",
      prenom,
      nom,
      telephone,
    })
    .select()
    .single();

  if (profileError) throw profileError;

  const { data: parentData, error: parentError } = await supabase
    .from("parents")
    .insert({
      profile_id: userId,
      prenom,
      nom,
      telephone,
      adresse: adresse || null,
    })
    .select()
    .single();

  if (parentError) throw parentError;

  if (enfants.length > 0) {
    const liens = enfants.map((eleveId) => ({
      parent_id: parentData.id,
      eleve_id: eleveId,
      lien: "Parent",
    }));

    const { error: lienError } = await supabase.from("parents_eleves").insert(liens);
    if (lienError) throw lienError;
  }

  return {
    user: authData.user,
    profile: profileData,
    parent: parentData,
    password: motDePasse,
  };
}

// Enfants du parent actuellement connecté (RLS restreint déjà le résultat).
export async function mesEnfants() {
  const { data, error } = await supabase
    .from("eleves")
    .select("*, inscriptions(section_id, annee_scolaire_id, sections(nom))")
    .eq("actif", true);
  if (error) throw error;
  return data;
}
