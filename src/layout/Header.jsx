import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const libelleRole = {
  DIRECTRICE: "Directrice",
  ENSEIGNANT: "Enseignant·e",
  PARENT: "Parent",
};

export default function Header({ titre, onToggleSidebar }) {
  const { profile, seDeconnecter } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const navigate = useNavigate();

  const initiales = profile ? `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}` : "";

  const handleDeconnexion = async () => {
    await seDeconnecter();
    navigate("/login");
  };

  return (
    <header className="app-header">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="mobile-menu-btn" onClick={onToggleSidebar} aria-label="Ouvrir le menu">
          ☰
        </button>
        <span className="header-title">{titre}</span>
      </div>

      <div className="header-user" onClick={() => setMenuOuvert((v) => !v)}>
        <div className="avatar">{initiales}</div>
        <div>
          <div style={{ fontWeight: 600 }}>
            {profile?.prenom} {profile?.nom}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-ink-faint)" }}>
            {libelleRole[profile?.role] ?? ""}
          </div>
        </div>

        {menuOuvert && (
          <div className="header-menu" onClick={(e) => e.stopPropagation()}>
            <a href="/profil">Mon profil</a>
            <button onClick={handleDeconnexion}>Déconnexion</button>
          </div>
        )}
      </div>
    </header>
  );
}
