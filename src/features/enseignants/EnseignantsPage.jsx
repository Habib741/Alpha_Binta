import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../components/ToastContext";
import { creerCompteEnseignant, listerEnseignants } from "../../services/enseignantsService";

const formulaireInitial = {
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  fonction: "",
  mot_de_passe: "",
};

export default function EnseignantsPage() {
  const notifier = useToast();
  const [enseignants, setEnseignants] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [form, setForm] = useState(formulaireInitial);
  const [recherche, setRecherche] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [enseignantSelectionne, setEnseignantSelectionne] = useState(null);

  async function charger() {
    setChargement(true);
    try {
      setEnseignants(await listerEnseignants());
    } catch (error) {
      notifier("Erreur lors du chargement des enseignants.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setEnvoi(true);
    try {
      const resultat = await creerCompteEnseignant(form);
      notifier(`Compte créé pour ${resultat.profil.prenom} ${resultat.profil.nom}. Identifiant : ${form.email} | Mot de passe : ${resultat.password}`);
      setForm(formulaireInitial);
      setFormulaireOuvert(false);
      await charger();
    } catch (error) {
      notifier(error?.message || "Erreur lors de la création du compte enseignant.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  const enseignantsFiltres = enseignants.filter((enseignant) => {
    const texte = `${enseignant.prenom} ${enseignant.nom} ${enseignant.email || ""}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  return (
    <AppLayout titre="Enseignants">
      <div className="page-header">
        <h1>Enseignants</h1>
        <button className="btn btn-accent" onClick={() => setFormulaireOuvert((ouvert) => !ouvert)}>
          {formulaireOuvert ? "Annuler" : "+ Ajouter un enseignant"}
        </button>
      </div>

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Nouveau compte enseignant</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field"><label>Prénom</label><input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div className="field"><label>Nom</label><input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div className="field"><label>Email / identifiant</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="field"><label>Téléphone</label><input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="field"><label>Fonction</label><input placeholder="Ex. Enseignant(e)" value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} /></div>
              <div className="field"><label>Mot de passe provisoire</label><input required type="password" minLength={8} value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={envoi}>{envoi ? "Création…" : "Créer le compte"}</button>
          </form>
        </div>
      )}

      <div>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h3>Liste des enseignants</h3>
          <input type="search" placeholder="Rechercher un enseignant" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        {chargement ? <Loader /> : enseignantsFiltres.length === 0 ? <EmptyState titre="Aucun enseignant trouvé" /> : (
          <div className="parents-grid">
            {enseignantsFiltres.map((enseignant) => (
              <button
                className="card teacher-card"
                key={enseignant.id}
                type="button"
                onClick={() => setEnseignantSelectionne(enseignant)}
              >
                <strong style={{ fontSize: 18, color: "var(--color-primary)" }}>{enseignant.prenom} {enseignant.nom}</strong>
                <div style={{ marginTop: 8, color: "var(--color-ink-soft)", fontSize: 13 }}>{enseignant.fonction || "Enseignant(e)"}</div>
                <div style={{ marginTop: 5, color: "var(--color-ink-faint)", fontSize: 13 }}>{enseignant.email || "Email non renseigné"}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {enseignantSelectionne && (
        <div className="modal-backdrop" onClick={() => setEnseignantSelectionne(null)}>
          <div className="card modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h3>{enseignantSelectionne.prenom} {enseignantSelectionne.nom}</h3>
                <p>{enseignantSelectionne.fonction || "Enseignant(e)"}</p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setEnseignantSelectionne(null)}>Fermer</button>
            </div>
            <div className="details-grid">
              <div><strong>Prénom :</strong> {enseignantSelectionne.prenom || "—"}</div>
              <div><strong>Nom :</strong> {enseignantSelectionne.nom || "—"}</div>
              <div><strong>Email :</strong> {enseignantSelectionne.email || "—"}</div>
              <div><strong>Téléphone :</strong> {enseignantSelectionne.telephone || "—"}</div>
              <div className="details-full"><strong>Fonction :</strong> {enseignantSelectionne.fonction || "Enseignant(e)"}</div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
