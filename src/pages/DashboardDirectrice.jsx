import { useEffect, useState } from "react";
import AppLayout from "../layout/AppLayout";
import StatCard from "../components/StatCard";
import EmptyState from "../components/EmptyState";
import Loader from "../components/Loader";
import { supabase } from "../services/supabaseClient";
import { listerSections, anneeActive } from "../services/elevesService";
import { soldeTousLesEleves, tousLesPaiementsRecents } from "../services/paiementsService";
import { dateDuJourISO, formaterMontant, formaterDate, libelleTypePaiement, libelleMode } from "../utils/format";

export default function DashboardDirectrice() {
  const [chargement, setChargement] = useState(true);
  const [totalEleves, setTotalEleves] = useState(0);
  const [parSection, setParSection] = useState([]);
  const [presentsJour, setPresentsJour] = useState(0);
  const [absentsJour, setAbsentsJour] = useState(0);
  const [resteARecouvrer, setResteARecouvrer] = useState(0);
  const [encaisseMois, setEncaisseMois] = useState(0);
  const [operations, setOperations] = useState([]);

  useEffect(() => {
    async function charger() {
      try {
        const today = dateDuJourISO();
        const debutMois = today.slice(0, 8) + "01";

        const [{ count: total }, sections, annee, presencesJour, soldes, paiementsMois, recents] =
          await Promise.all([
            supabase.from("eleves").select("*", { count: "exact", head: true }).eq("actif", true),
            listerSections(),
            anneeActive(),
            supabase.from("presences").select("statut").eq("date", today),
            soldeTousLesEleves(),
            supabase.from("paiements").select("montant").gte("date_paiement", debutMois),
            tousLesPaiementsRecents(8),
          ]);

        setTotalEleves(total ?? 0);

        const { data: inscriptions } = await supabase
          .from("inscriptions")
          .select("section_id")
          .eq("annee_scolaire_id", annee.id);

        setParSection(
          sections.map((s) => ({
            nom: s.nom,
            total: (inscriptions ?? []).filter((i) => i.section_id === s.id).length,
          }))
        );

        setPresentsJour((presencesJour.data ?? []).filter((p) => p.statut === "PRESENT").length);
        setAbsentsJour((presencesJour.data ?? []).filter((p) => p.statut === "ABSENT").length);
        setResteARecouvrer((soldes ?? []).reduce((acc, s) => acc + Number(s.reste_a_payer), 0));
        setEncaisseMois((paiementsMois.data ?? []).reduce((acc, p) => acc + Number(p.montant), 0));
        setOperations(recents ?? []);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  return (
    <AppLayout titre="Tableau de bord — Directrice">
      {chargement ? (
        <Loader />
      ) : (
        <>
          <div className="grid-stats">
            <StatCard label="Total élèves" value={totalEleves} />
            <StatCard label="Présents aujourd'hui" value={presentsJour} />
            <StatCard label="Absents aujourd'hui" value={absentsJour} />
            <StatCard label="Encaissé ce mois" value={formaterMontant(encaisseMois)} />
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Élèves par section</h3>
              {parSection.map((s) => (
                <div key={s.nom} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <span>{s.nom}</span>
                  <span className="montant">{s.total}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Reste à recouvrer</h3>
              <div className="stat-value" style={{ color: "var(--color-danger)" }}>
                {formaterMontant(resteARecouvrer)}
              </div>
              <p style={{ fontSize: 13, color: "var(--color-ink-faint)", marginTop: 10 }}>
                Tous élèves confondus, sur l'année scolaire en cours.
              </p>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 14 }}>Dernières opérations</h3>
            {operations.length === 0 ? (
              <EmptyState titre="Aucun paiement enregistré pour le moment" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Élève</th>
                    <th>Type</th>
                    <th>Mode</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op) => (
                    <tr key={op.id}>
                      <td>{formaterDate(op.date_paiement)}</td>
                      <td>{op.eleves ? `${op.eleves.prenom} ${op.eleves.nom}` : "—"}</td>
                      <td>{libelleTypePaiement(op.type, op.date_paiement)}</td>
                      <td>{libelleMode[op.mode]}</td>
                      <td className="montant">{formaterMontant(op.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
