import { useState } from "react";
import AppLayout from "../layout/AppLayout";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastContext";
import { supabase } from "../services/supabaseClient";

const libelleRole = {
  DIRECTRICE: "Directrice",
  ENSEIGNANT: "Enseignant·e",
  PARENT: "Parent",
};

export default function ProfilPage() {
  const { profile, user } = useAuth();
  const notifier = useToast();
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (nouveauMdp.length < 8) {
      notifier("Le mot de passe doit contenir au moins 8 caractères.", "error");
      return;
    }
    if (nouveauMdp !== confirmation) {
      notifier("Les deux mots de passe ne correspondent pas.", "error");
      return;
    }
    setEnvoi(true);
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp });
    setEnvoi(false);
    if (error) {
      notifier("Erreur lors de la modification du mot de passe.", "error");
    } else {
      notifier("Mot de passe modifié.");
      setNouveauMdp("");
      setConfirmation("");
    }
  }

  return (
    <AppLayout titre="Mon profil">
      <h1 style={{ marginBottom: 20 }}>Mon profil</h1>

      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 14 }}>Informations</h3>
        <p><strong>Nom :</strong> {profile?.prenom} {profile?.nom}</p>
        <p><strong>Rôle :</strong> {libelleRole[profile?.role]}</p>
        {profile?.fonction && <p><strong>Fonction :</strong> {profile.fonction}</p>}
        <p><strong>Email :</strong> {user?.email}</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginBottom: 14 }}>Modifier mon mot de passe</h3>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={envoi}>
            {envoi ? "Modification…" : "Modifier mon mot de passe"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
