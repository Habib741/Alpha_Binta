import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  listerEmploisDuTemps,
  enregistrerEmploiDuTemps,
  obtenirUrlEmploiDuTemps,
} from "../../services/emploiDuTempsService";
import { listerSections } from "../../services/elevesService";

export default function EmploiDuTempsPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";
  const [emploisDuTemps, setEmploisDuTemps] = useState([]);
  const [sections, setSections] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    setChargement(true);
    try {
      const [listeSections, listeEmplois] = await Promise.all([listerSections(), listerEmploisDuTemps()]);
      setSections(listeSections);
      setEmploisDuTemps(listeEmplois);
    } catch (error) {
      notifier("Erreur lors du chargement de l'emploi du temps.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleChange(event, sectionId) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setEnvoi(true);
    try {
      if (!sectionId) throw new Error("Veuillez sélectionner une section.");
      const resultat = await enregistrerEmploiDuTemps(file, sectionId, profile.id);
      setEmploisDuTemps((liste) => [...liste.filter((emploi) => emploi.section_id !== resultat.section_id), resultat]);
      notifier("Emploi du temps enregistré.");
    } catch (error) {
      notifier(error?.message || "Erreur lors de l'enregistrement de l'emploi du temps.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AppLayout titre="Emploi du temps">
      <div className="page-header">
        <h1>Emploi du temps</h1>
      </div>

      {chargement ? (
        <Loader />
      ) : (
        <div className="schedule-grid">
          {sections.length === 0 ? <EmptyState titre="Aucune section disponible" /> : sections.map((section) => {
            const emploi = emploisDuTemps.find((element) => element.section_id === section.id);
            const imageUrl = obtenirUrlEmploiDuTemps(emploi?.chemin_storage);
            return (
              <article className="schedule-card" key={section.id}>
                <h3>{section.nom}</h3>
                {imageUrl ? (
                  <img src={imageUrl} alt={`Emploi du temps - ${section.nom}`} />
                ) : (
                  <p className="schedule-empty">Aucun emploi du temps publié.</p>
                )}
                {estDirectrice && (
                  <label className="btn btn-ghost schedule-upload">
                    {emploi ? "Remplacer" : "Ajouter"}
                    <input type="file" accept="image/*" hidden disabled={envoi} onChange={(event) => handleChange(event, section.id)} />
                  </label>
                )}
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
