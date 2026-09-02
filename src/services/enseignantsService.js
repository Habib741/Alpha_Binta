import { supabase } from "./supabaseClient";

export async function listerEnseignants() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, prenom, nom, telephone, email, fonction, actif")
    .eq("role", "ENSEIGNANT")
    .order("nom");

  if (error) throw error;
  return data ?? [];
}

export async function creerCompteEnseignant({ prenom, nom, telephone, email, fonction, mot_de_passe }) {
  const motDePasse = String(mot_de_passe || "").trim();
  if (!motDePasse) {
    throw new Error("Le mot de passe de l'enseignant est obligatoire.");
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
        telephone,
        fonction: fonction || null,
        role: "ENSEIGNANT",
      },
    },
  });

  if (authError) throw authError;

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error("La création du compte enseignant a échoué.");
  }

  if (sessionDirectrice?.user?.id && sessionDirectrice.user.id !== userId) {
    for (let tentative = 0; tentative < 2; tentative += 1) {
      const { error: restaurationError } = await supabase.auth.setSession({
        access_token: sessionDirectrice.access_token,
        refresh_token: sessionDirectrice.refresh_token,
      });
      if (restaurationError) throw restaurationError;

      const { data: sessionVerifiee } = await supabase.auth.getSession();
      if (sessionVerifiee.session?.user?.id === sessionDirectrice.user.id) break;
    }

    const { data: sessionFinale } = await supabase.auth.getSession();
    if (sessionFinale.session?.user?.id !== sessionDirectrice.user.id) {
      throw new Error("La session de la directrice n'a pas pu être restaurée.");
    }
  } else if (!sessionDirectrice) {
    await supabase.auth.signOut();
  }

  const { data: profil, error: profilError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: "ENSEIGNANT",
        prenom,
        nom,
        telephone: telephone || null,
        email,
        fonction: fonction || null,
        actif: true,
      },
      { onConflict: "id" }
    )
    .select("id, prenom, nom, telephone, email, fonction, actif")
    .single();

  if (profilError) throw profilError;

  return { user: authData.user, profil, password: motDePasse };
}
