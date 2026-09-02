import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import { supabase } from "../services/supabaseClient";
import { listerSections, anneeActive } from "../services/elevesService";
import { dateDuJourISO } from "../utils/format";

export default function DashboardEnseignant() {
  const [chargement, setChargement] = useState(true);
  const [sectionsStatut, setSectionsStatut] = useState([]);
  const [absentsJour, setAbsentsJour] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function charger() {
      try {
        const today = dateDuJourISO();
        const [sections, annee] = await Promise.all([listerSections(), anneeActive()]);

        const [{ data: inscrits }, { data: presencesFaites }] = await Promise.all([
          supabase
            .from("inscriptions")
            .select("section_id, eleve_id")
            .eq("annee_scolaire_id", annee.id),
          supabase.from("presences").select("eleve_id").eq("date", today),
        ]);
        const presenceIds = new Set((presencesFaites ?? []).map((presence) => presence.eleve_id));
        const statuts = sections.map((section) => {
          const eleveIds = (inscrits ?? [])
            .filter((inscription) => inscription.section_id === section.id)
            .map((inscription) => inscription.eleve_id);
          return {
            id: section.id,
            nom: section.nom,
            total: eleveIds.length,
            fait: eleveIds.length > 0 && eleveIds.every((eleveId) => presenceIds.has(eleveId)),
          };
        });
        setSectionsStatut(statuts);

        const { data: presencesJour } = await supabase
          .from("presences")
          .select("statut")
          .eq("date", today);
        setAbsentsJour((presencesJour ?? []).filter((p) => p.statut === "ABSENT").length);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  return (
    <AppLayout titre="Tableau de bord — Enseignant">
      {chargement ? (
        <Loader />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 14 }}>Appel du jour</h3>
            <div className="appel-list">
              {sectionsStatut.map((s) => (
                <div className="appel-row" key={s.id}>
                  <div>
                    <span className="eleve-name">{s.nom}</span>
                    <span style={{ color: "var(--color-ink-faint)", marginLeft: 8 }}>
                      ({s.total} élève{s.total > 1 ? "s" : ""})
                    </span>
                  </div>
                  {s.fait ? (
                    <span className="badge badge-success">Appel fait ✔</span>
                  ) : (
                    <button className="btn btn-accent" onClick={() => navigate(`/presences?section=${s.id}`)}>
                      Faire l'appel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <StatCard label="Absences aujourd'hui" value={absentsJour} />
            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => navigate("/eleves")}>
                Voir la liste des élèves
              </button>
              <button className="btn btn-ghost" onClick={() => navigate("/presences")}>
                Historique des présences
              </button>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
