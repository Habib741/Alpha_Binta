import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  listerInformations,
  publierInformation,
  modifierInformation,
  supprimerInformation,
} from "../../services/informationsService";
import { formaterDate } from "../../utils/format";

export default function InformationsPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";

  const [chargement, setChargement] = useState(true);
  const [infos, setInfos] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", visible: true });
  const [informationEnCours, setInformationEnCours] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    setChargement(true);
    const liste = await listerInformations();
    setInfos(liste);
    setChargement(false);
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      if (informationEnCours) {
        await modifierInformation(informationEnCours.id, form);
        notifier(form.visible ? "Information publiée." : "Brouillon enregistré.");
      } else {
        await publierInformation({ ...form, auteur_id: profile.id });
        notifier(form.visible ? "Information publiée." : "Brouillon enregistré.");
      }
      setForm({ titre: "", contenu: "", visible: true });
      setInformationEnCours(null);
      setFormulaireOuvert(false);
      await charger();
    } catch (err) {
      notifier("Erreur lors de l'enregistrement.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirEdition(info) {
    setInformationEnCours(info);
    setForm({ titre: info.titre, contenu: info.contenu, visible: info.visible });
    setFormulaireOuvert(true);
  }

  function annulerEdition() {
    setInformationEnCours(null);
    setForm({ titre: "", contenu: "", visible: true });
    setFormulaireOuvert(false);
  }

  async function publierBrouillon(info) {
    setEnvoi(true);
    try {
      await modifierInformation(info.id, { visible: true });
      notifier("Information publiée.");
      await charger();
    } catch (err) {
      notifier("Erreur lors de la publication.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(info) {
    if (!window.confirm(`Supprimer l'information « ${info.titre} » ?`)) return;

    setEnvoi(true);
    try {
      await supprimerInformation(info.id);
      notifier("Information supprimée.");
      await charger();
    } catch (err) {
      notifier("Erreur lors de la suppression.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AppLayout titre="Informations école">
      <div className="page-header">
        <h1>Informations école</h1>
        {estDirectrice && (
          <button className="btn btn-accent" onClick={formulaireOuvert ? annulerEdition : () => setFormulaireOuvert(true)}>
            {formulaireOuvert ? "Annuler" : "+ Nouvelle information"}
          </button>
        )}
      </div>

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>{informationEnCours ? "Modifier l'information" : "Nouvelle information"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Titre</label>
              <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
            </div>
            <div className="field">
              <label>Contenu</label>
              <textarea required rows={4} value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
            </div>
            <div className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="visible"
                checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
              />
              <label htmlFor="visible" style={{ margin: 0 }}>Publier immédiatement (sinon reste en brouillon)</label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={envoi}>
              {envoi ? "Enregistrement…" : form.visible ? "Publier" : "Enregistrer comme brouillon"}
            </button>
          </form>
        </div>
      )}

      {chargement ? (
        <Loader />
      ) : infos.length === 0 ? (
        <EmptyState titre="Aucune information publiée pour le moment" />
      ) : (
        infos.map((info) => (
          <div className="card" key={info.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16 }}>{info.titre}</h3>
              {!info.visible && <span className="badge badge-accent">Brouillon</span>}
            </div>
            <p style={{ marginTop: 8, color: "var(--color-ink-soft)" }}>{info.contenu}</p>
            <div style={{ fontSize: 12.5, color: "var(--color-ink-faint)", marginTop: 8 }}>
              {formaterDate(info.date_publication)}
            </div>
            {estDirectrice && (
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" onClick={() => ouvrirEdition(info)} disabled={envoi}>
                  Modifier
                </button>
                {!info.visible && (
                  <button className="btn btn-primary" onClick={() => publierBrouillon(info)} disabled={envoi}>
                    Publier
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => supprimer(info)} disabled={envoi}>
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </AppLayout>
  );
}
