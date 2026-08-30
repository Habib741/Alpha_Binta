import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { session, profile, seConnecter, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const navigate = useNavigate();

  // Déjà connecté -> direction le dashboard correspondant à son rôle
  if (!loading && session && profile) {
    return <Navigate to={`/dashboard/${profile.role.toLowerCase()}`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const { error } = await seConnecter(email, password);
    setEnvoi(false);
    if (error) {
      setErreur("Identifiants incorrects. Vérifiez votre email et votre mot de passe.");
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-visual">
          <div className="brand-mark">A&B</div>
          <p className="eyebrow">Espace réservé</p>
          <h1>École Alpha et Binta</h1>
          <p className="visual-subtitle">Gestion scolaire centralisée</p>

          <ul className="feature-list">
            <li>Suivi des élèves</li>
            <li>Présences et paiements</li>
            <li>Parents et administration</li>
          </ul>
        </div>

        <div className="login-card">
          <div className="login-header">
            <span className="login-badge">Accès sécurisé</span>
            <h2>Connexion</h2>
          </div>

          {erreur && <div className="login-error">{erreur}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="field">
              <label htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@ecole-alphabinta.sn"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={envoi}>
              {envoi ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="login-note">
            Vos identifiants ont été communiqués par l’administration de l’école.
          </p>
        </div>
      </div>
    </div>
  );
}
