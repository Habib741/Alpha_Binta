import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import { listerInformations, publierInformation } from "../../services/informationsService";
import { formaterDate } from "../../utils/format";

export default function InformationsPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";

  const [chargement, setChargement] = useState(true);
  const [infos, setInfos] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [form, setForm] = useState({ titre: "", contenu: "", visible: true });
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
      await publierInformation({ ...form, auteur_id: profile.id });
      notifier("Information publiée.");
      setForm({ titre: "", contenu: "", visible: true });
      setFormulaireOuvert(false);
      charger();
    } catch (err) {
      notifier("Erreur lors de la publication.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AppLayout titre="Informations école">
      <div className="page-header">
        <h1>Informations école</h1>
        {estDirectrice && (
          <button className="btn btn-accent" onClick={() => setFormulaireOuvert((v) => !v)}>
            {formulaireOuvert ? "Annuler" : "+ Publier une information"}
          </button>
        )}
      </div>

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
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
              {envoi ? "Publication…" : "Publier"}
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
          </div>
        ))
      )}
    </AppLayout>
  );
}
