import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Loader from "../components/Loader";

/**
 * Garde de routes à deux niveaux :
 * 1. Authentification : pas de session -> /login
 * 2. Rôle : rôle non autorisé pour cette page -> redirection vers son propre dashboard
 *
 * Rappel : ceci est un confort d'UX. La sécurité réelle est appliquée par les
 * politiques RLS de Supabase, indépendamment de ce que fait le Front-End.
 */
export default function ProtectedRoute({ children, rolesAutorises }) {
  const { session, profile, loading, profileError } = useAuth();

  if (loading || session === undefined) {
    return <Loader plein />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profileError) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Erreur de chargement du profil</h2>
        <p>
          Votre compte est authentifié mais aucun profil n'a été trouvé. Contactez
          l'administration de l'école.
        </p>
      </div>
    );
  }

  if (!profile) {
    return <Loader plein />;
  }

  if (rolesAutorises && !rolesAutorises.includes(profile.role)) {
    return <Navigate to={`/dashboard/${profile.role.toLowerCase()}`} replace />;
  }

  return children;
}
