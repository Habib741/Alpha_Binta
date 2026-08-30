import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { mesEnfants } from "../../services/parentsService";
import { historiquePresences } from "../../services/presencesService";
import { formaterDate } from "../../utils/format";

export default function MesEnfantsPage() {
  const [chargement, setChargement] = useState(true);
  const [enfants, setEnfants] = useState([]);

  useEffect(() => {
    async function charger() {
      try {
        const liste = await mesEnfants();
        const enrichis = await Promise.all(
          liste.map(async (e) => ({
            ...e,
            presences: await historiquePresences(e.id).catch(() => []),
          }))
        );
        setEnfants(enrichis);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  return (
    <AppLayout titre="Mes enfants">
      <h1 style={{ marginBottom: 20 }}>Mes enfants</h1>
      {chargement ? (
        <Loader />
      ) : enfants.length === 0 ? (
        <EmptyState titre="Aucun enfant associé à votre compte" />
      ) : (
        enfants.map((enfant) => (
          <div className="card" key={enfant.id} style={{ marginBottom: 20 }}>
            <h3>{enfant.prenom} {enfant.nom}</h3>
            <p style={{ color: "var(--color-ink-faint)" }}>
              {enfant.inscriptions?.[0]?.sections?.nom ?? "Section non définie"}
            </p>

            <h4 style={{ marginTop: 16, marginBottom: 8, fontFamily: "var(--font-body)", fontSize: 14 }}>
              Historique des présences (10 dernières)
            </h4>
            {enfant.presences.length === 0 ? (
              <EmptyState titre="Aucune présence enregistrée pour le moment" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {enfant.presences.slice(0, 10).map((p) => (
                    <tr key={p.id}>
                      <td>{formaterDate(p.date)}</td>
                      <td>
                        <span className={`badge ${p.statut === "PRESENT" ? "badge-success" : "badge-danger"}`}>
                          {p.statut === "PRESENT" ? "Présent(e)" : "Absent(e)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </AppLayout>
  );
}
