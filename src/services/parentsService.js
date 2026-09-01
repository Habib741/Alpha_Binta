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
  const [{ data, error }, { data: liens, error: liensError }] = await Promise.all([
    supabase
    .from("eleves")
    .select("id, prenom, nom, actif, inscriptions(section_id, sections(nom))")
    .eq("actif", true)
    .order("nom", { ascending: true }),
    supabase.from("parents_eleves").select("eleve_id"),
  ]);
  if (error) throw error;
  if (liensError) throw liensError;

  const enfantsDejaLies = new Set((liens ?? []).map((lien) => lien.eleve_id));
  return (data ?? []).filter((eleve) => !enfantsDejaLies.has(eleve.id));
}

export async function creerCompteParent({ prenom, nom, telephone, email, adresse, mot_de_passe, enfants = [] }) {
  const motDePasse = String(mot_de_passe || "").trim();
  if (!motDePasse) {
    throw new Error("Le mot de passe du parent est obligatoire.");
  }

  const { data: sessionActuelle } = await supabase.auth.getSession();
  const sessionDirectrice = sessionActuelle?.session;

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

  if (sessionDirectrice?.user?.id && sessionDirectrice.user.id !== userId) {
    const { error: restaurationError } = await supabase.auth.setSession({
      access_token: sessionDirectrice.access_token,
      refresh_token: sessionDirectrice.refresh_token,
    });
    if (restaurationError) throw restaurationError;
  } else if (!sessionDirectrice) {
    await supabase.auth.signOut();
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: "PARENT",
        prenom,
        nom,
        telephone,
      },
      { onConflict: "id" }
    )
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
    .select("*, inscriptions(section_id, annee_scolaire_id, date_inscription, sections(nom), annees_scolaires(libelle)), documents_enfants(*)")
    .eq("actif", true);
  if (error) throw error;
  return data;
}
