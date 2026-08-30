import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../auth/AuthContext";
import { mesEnfants } from "../services/parentsService";
import { soldeEleve } from "../services/paiementsService";
import { listerInformations } from "../services/informationsService";
import { historiquePresences } from "../services/presencesService";
import { formaterMontant, formaterDate } from "../utils/format";

export default function DashboardParent() {
  const { profile } = useAuth();
  const [chargement, setChargement] = useState(true);
  const [enfants, setEnfants] = useState([]);
  const [annonces, setAnnonces] = useState([]);

  useEffect(() => {
    async function charger() {
      try {
        const [listeEnfants, infos] = await Promise.all([mesEnfants(), listerInformations()]);

        const enrichis = await Promise.all(
          listeEnfants.map(async (e) => {
            const [solde, presences] = await Promise.all([
              soldeEleve(e.id).catch(() => null),
              historiquePresences(e.id).catch(() => []),
            ]);
            const total = presences.length;
            const presents = presences.filter((p) => p.statut === "PRESENT").length;
            const taux = total > 0 ? Math.round((presents / total) * 100) : null;
            return { ...e, solde, taux };
          })
        );
        setEnfants(enrichis);
        setAnnonces(infos.slice(0, 5));
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  return (
    <AppLayout titre="Tableau de bord — Espace parent">
      {chargement ? (
        <Loader />
      ) : (
        <>
          <h2 style={{ marginBottom: 16 }}>Bonjour {profile?.prenom} {profile?.nom}</h2>

          {enfants.length === 0 ? (
            <EmptyState titre="Aucun enfant associé à votre compte pour le moment" description="Contactez l'administration de l'école." />
          ) : (
            <div className="grid-2" style={{ marginBottom: 20 }}>
              {enfants.map((enfant) => (
                <div className="card" key={enfant.id}>
                  <h3>{enfant.prenom} {enfant.nom}</h3>
                  <p style={{ color: "var(--color-ink-faint)", marginTop: 2 }}>
                    {enfant.inscriptions?.[0]?.sections?.nom ?? "Section non définie"}
                  </p>
                  <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
                    <div>
                      <div className="stat-label">Présence</div>
                      <div className="stat-value" style={{ fontSize: 22 }}>
                        {enfant.taux !== null ? `${enfant.taux}%` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="stat-label">Reste à payer</div>
                      <div className="stat-value" style={{ fontSize: 22, color: "var(--color-danger)" }}>
                        {enfant.solde ? formaterMontant(enfant.solde.reste_a_payer) : "—"}
                      </div>
                    </div>
                  </div>
                  <Link to="/mes-paiements" className="btn btn-ghost" style={{ marginTop: 16 }}>
                    Voir le détail
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Dernières annonces de l'école</h3>
            {annonces.length === 0 ? (
              <EmptyState titre="Aucune annonce publiée pour le moment" />
            ) : (
              annonces.map((a) => (
                <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <div style={{ fontWeight: 600 }}>{a.titre}</div>
                  <div style={{ fontSize: 13, color: "var(--color-ink-faint)" }}>{formaterDate(a.date_publication)}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
