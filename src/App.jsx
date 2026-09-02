import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Loader from "./components/Loader";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const DashboardDirectrice = lazy(() => import("./pages/DashboardDirectrice"));
const DashboardEnseignant = lazy(() => import("./pages/DashboardEnseignant"));
const DashboardParent = lazy(() => import("./pages/DashboardParent"));
const ElevesPage = lazy(() => import("./features/eleves/ElevesPage"));
const PresencesPage = lazy(() => import("./features/presences/PresencesPage"));
const PaiementsPage = lazy(() => import("./features/paiements/PaiementsPage"));
const MesPaiementsPage = lazy(() => import("./features/paiements/MesPaiementsPage"));
const ParentsPage = lazy(() => import("./features/parents/ParentsPage"));
const MesEnfantsPage = lazy(() => import("./features/parents/MesEnfantsPage"));
const InformationsPage = lazy(() => import("./features/informations-ecole/InformationsPage"));
const NotesPage = lazy(() => import("./features/notes/NotesPage"));
const MesNotesPage = lazy(() => import("./features/notes/MesNotesPage"));
const EmploiDuTempsPage = lazy(() => import("./features/emploi-du-temps/EmploiDuTempsPage"));
const EnseignantsPage = lazy(() => import("./features/enseignants/EnseignantsPage"));

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
    <Suspense fallback={<Loader plein />}>
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
        path="/enseignants"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE"]}>
            <EnseignantsPage />
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
        path="/emploi-du-temps"
        element={
          <ProtectedRoute rolesAutorises={["DIRECTRICE", "ENSEIGNANT", "PARENT"]}>
            <EmploiDuTempsPage />
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
    </Suspense>
  );
}
