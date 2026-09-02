import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { mesEnfants } from "../../services/parentsService";
import { soldeEleve, historiquePaiements } from "../../services/paiementsService";
import { formaterMontant, formaterDate, libelleTypePaiement, libelleMode } from "../../utils/format";

export default function MesPaiementsPage() {
  const [chargement, setChargement] = useState(true);
  const [enfants, setEnfants] = useState([]);

  useEffect(() => {
    async function charger() {
      try {
        const liste = await mesEnfants();
        const enrichis = await Promise.all(
          liste.map(async (e) => ({
            ...e,
            solde: await soldeEleve(e.id).catch(() => null),
            historique: await historiquePaiements(e.id).catch(() => []),
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
    <AppLayout titre="Paiements">
      <h1 style={{ marginBottom: 20 }}>Paiements</h1>
      {chargement ? (
        <Loader />
      ) : enfants.length === 0 ? (
        <EmptyState titre="Aucun enfant associé à votre compte" />
      ) : (
        enfants.map((enfant) => (
          <div className="card" key={enfant.id} style={{ marginBottom: 20 }}>
            <h3>{enfant.prenom} {enfant.nom}</h3>
            {enfant.solde && (
              <div style={{ display: "flex", gap: 32, margin: "14px 0" }}>
                <div>
                  <div className="stat-label">Total dû</div>
                  <div className="montant">{formaterMontant(enfant.solde.total_du)}</div>
                </div>
                <div>
                  <div className="stat-label">Total payé</div>
                  <div className="montant">{formaterMontant(enfant.solde.total_paye)}</div>
                </div>
                <div>
                  <div className="stat-label">Reste à payer</div>
                  <div className="montant" style={{ color: "var(--color-danger)" }}>
                    {formaterMontant(enfant.solde.reste_a_payer)}
                  </div>
                </div>
              </div>
            )}

            {enfant.historique.length === 0 ? (
              <EmptyState titre="Aucun paiement enregistré pour le moment" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {enfant.historique.map((p) => (
                    <tr key={p.id}>
                      <td>{formaterDate(p.date_paiement)}</td>
                      <td>{libelleTypePaiement(p.type, p.date_paiement)}</td>
                      <td className="montant">{formaterMontant(p.montant)}</td>
                      <td>{libelleMode[p.mode]}</td>
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
