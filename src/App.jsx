import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Loader from "./components/Loader";

import LoginPage from "./pages/LoginPage";
import ProfilPage from "./pages/ProfilPage";
import DashboardDirectrice from "./pages/DashboardDirectrice";
import DashboardEnseignant from "./pages/DashboardEnseignant";
import DashboardParent from "./pages/DashboardParent";

import ElevesPage from "./features/eleves/ElevesPage";
import PresencesPage from "./features/presences/PresencesPage";
import PaiementsPage from "./features/paiements/PaiementsPage";
import MesPaiementsPage from "./features/paiements/MesPaiementsPage";
import ParentsPage from "./features/parents/ParentsPage";
import MesEnfantsPage from "./features/parents/MesEnfantsPage";
import InformationsPage from "./features/informations-ecole/InformationsPage";
import NotesPage from "./features/notes/NotesPage";
import MesNotesPage from "./features/notes/MesNotesPage";

function RedirectionRacine() {
  const { session, profile, loading, profileError } = useAuth();

  if (loading || session === undefined) return <Loader plein />;
  if (!session) return <Navigate to="/login" replace />;
  if (profileError || !profile) {
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

  return <Navigate to={`/dashboard/${profile.role.toLowerCase()}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RedirectionRacine />} />

      <Route
        path="/dashboard/directrice"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE"]}>
            <DashboardDirectrice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/enseignant"
        element={
          <ProtectedRoute rolesAutorises={["ENSEIGNANT"]}>
            <DashboardEnseignant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/parent"
        element={
          <ProtectedRoute rolesAutorises={["PARENT"]}>
            <DashboardParent />
          </ProtectedRoute>
        }
      />

      <Route
        path="/eleves"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE", "ENSEIGNANT"]}>
            <ElevesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/presences"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE", "ENSEIGNANT"]}>
            <PresencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/paiements"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE"]}>
            <PaiementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parents"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE"]}>
            <ParentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/informations"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE", "ENSEIGNANT", "PARENT"]}>
            <InformationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE", "ENSEIGNANT"]}>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mes-enfants"
        element={
          <ProtectedRoute rolesAutorises={["PARENT"]}>
            <MesEnfantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mes-paiements"
        element={
          <ProtectedRoute rolesAutorises={["PARENT"]}>
            <MesPaiementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mes-notes"
        element={
          <ProtectedRoute rolesAutorises={["PARENT"]}>
            <MesNotesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profil"
        element={
          <ProtectedRoute>
            <ProfilPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
