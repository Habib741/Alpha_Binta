import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import { listerSections, anneeActive } from "../../services/elevesService";
import { elevesPourAppel, enregistrerPresence } from "../../services/presencesService";
import { dateDuJourISO } from "../../utils/format";

export default function PresencesPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const [searchParams] = useSearchParams();

  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState(searchParams.get("section") || "");
  const [date, setDate] = useState(dateDuJourISO());
  const [eleves, setEleves] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState({});

  useEffect(() => {
    async function init() {
      const listeSections = await listerSections();
      setSections(listeSections);
      if (!sectionId && listeSections.length > 0) {
        setSectionId(listeSections[0].id);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    async function charger() {
      setChargement(true);
      try {
        const annee = await anneeActive();
        const liste = await elevesPourAppel(sectionId, annee.id, date);
        setEleves(liste);
      } catch (e) {
        notifier("Erreur lors du chargement de l'appel.", "error");
      } finally {
        setChargement(false);
      }
    }
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, date]);

  async function marquer(eleveId, statut) {
    setEnregistrement((e) => ({ ...e, [eleveId]: true }));
    try {
      await enregistrerPresence({
        eleve_id: eleveId,
        date,
        statut,
        enregistre_par: profile.id,
      });
      setEleves((prev) => prev.map((e) => (e.id === eleveId ? { ...e, statut } : e)));
    } catch (e) {
      notifier("Erreur lors de l'enregistrement.", "error");
    } finally {
      setEnregistrement((e) => ({ ...e, [eleveId]: false }));
    }
  }

  return (
    <AppLayout titre="Présences — Appel">
      <div className="page-header">
        <h1>Faire l'appel</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <label>Section</label>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        {chargement ? (
          <Loader />
        ) : eleves.length === 0 ? (
          <EmptyState titre="Aucun élève inscrit dans cette section" />
        ) : (
          <div className="appel-list">
            {eleves.map((e) => (
              <div className="appel-row" key={e.id}>
                <span className="eleve-name">{e.prenom} {e.nom}</span>
                <div className="appel-toggle">
                  <button
                    className={e.statut === "PRESENT" ? "present-selected" : ""}
                    disabled={enregistrement[e.id]}
                    onClick={() => marquer(e.id, "PRESENT")}
                  >
                    Présent(e)
                  </button>
                  <button
                    className={e.statut === "ABSENT" ? "absent-selected" : ""}
                    disabled={enregistrement[e.id]}
                    onClick={() => marquer(e.id, "ABSENT")}
                  >
                    Absent(e)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
