import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);
  const requeteProfil = useRef(0);

  const chargerProfil = useCallback(async (userId) => {
    const numeroRequete = ++requeteProfil.current;
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (numeroRequete !== requeteProfil.current) return;

    if (error && error.code !== "PGRST116") {
      setProfileError(error);
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setProfileError(new Error("Aucun profil trouvé pour cet utilisateur."));
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfileError(null);
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialiserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      if (session?.user) {
        await chargerProfil(session.user.id);
      } else {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    };

    initialiserSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      setSession(session);
      if (session?.user) {
        await chargerProfil(session.user.id);
      } else {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [chargerProfil]);

  const seConnecter = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    const { data: profil, error: profilError } = await supabase
      .from("profiles")
      .select("actif")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profilError || profil?.actif === false) {
      await supabase.auth.signOut();
      return { error: new Error("Ce compte est désactivé.") };
    }
    return { error: null };
  };

  const seDeconnecter = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    profileError,
    loading,
    seConnecter,
    seDeconnecter,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
