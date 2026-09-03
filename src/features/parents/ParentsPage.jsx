import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  listerParents,
  listerEnfantsDisponibles,
  creerCompteParent,
  lierEnfantParent,
  modifierParent,
  supprimerParent,
} from "../../services/parentsService";

export default function ParentsPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";

  const [chargement, setChargement] = useState(true);
  const [parents, setParents] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [parentSelectionne, setParentSelectionne] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [enfantALier, setEnfantALier] = useState("");
  const [parentEnEdition, setParentEnEdition] = useState(false);
  const [formParent, setFormParent] = useState(null);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    email: "",
    mot_de_passe: "",
    adresse: "",
    enfants: [],
  });

  async function chargerDonnees() {
    setChargement(true);
    try {
      const [listeParents, listeEleves] = await Promise.all([
        listerParents(),
        listerEnfantsDisponibles(),
      ]);
      setParents(listeParents);
      setEleves(listeEleves);
    } catch (e) {
      notifier("Erreur lors du chargement des parents.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parentsFiltres = parents.filter((parent) => {
    const texte = `${parent.prenom || ""} ${parent.nom || ""}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  function toggleEnfant(eleveId) {
    setForm((f) => ({
      ...f,
      enfants: f.enfants.includes(eleveId)
        ? f.enfants.filter((id) => id !== eleveId)
        : [...f.enfants, eleveId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);

    try {
      const resultat = await creerCompteParent(form);
      notifier(
        `Compte parent créé pour ${resultat.parent.prenom} ${resultat.parent.nom}. Mot de passe provisoire : ${resultat.password}`
      );
      setFormulaireOuvert(false);
      setForm({
        prenom: "",
        nom: "",
        telephone: "",
        email: "",
        mot_de_passe: "",
        adresse: "",
        enfants: [],
      });
      await chargerDonnees();
    } catch (err) {
      notifier(err?.message || "Erreur lors de la création du compte parent.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function ajouterEnfantAuParent() {
    if (!parentSelectionne || !enfantALier) return;
    setEnvoi(true);
    try {
      await lierEnfantParent(parentSelectionne.id, enfantALier);
      notifier("Enfant lié au parent.");
      setEnfantALier("");
      await chargerDonnees();
      const parentActualise = (await listerParents()).find((parent) => parent.id === parentSelectionne.id);
      setParentSelectionne(parentActualise || parentSelectionne);
    } catch (error) {
      notifier(error?.message || "Erreur lors de la liaison de l'enfant.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  function ouvrirEditionParent() {
    setFormParent({
      prenom: parentSelectionne.prenom || "",
      nom: parentSelectionne.nom || "",
      telephone: parentSelectionne.telephone || "",
      email: parentSelectionne.email || "",
      adresse: parentSelectionne.adresse || "",
    });
    setParentEnEdition(true);
  }

  async function enregistrerParent(event) {
    event.preventDefault();
    setEnvoi(true);
    try {
      await modifierParent(parentSelectionne.id, parentSelectionne.profile_id, formParent);
      notifier("Informations du parent modifiées.");
      setParentEnEdition(false);
      await chargerDonnees();
      setParentSelectionne((await listerParents()).find((parent) => parent.id === parentSelectionne.id) || null);
    } catch (error) {
      notifier(error?.message || "Erreur lors de la modification du parent.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerParentSelectionne() {
    if (!window.confirm(`Supprimer le compte de ${parentSelectionne.prenom} ${parentSelectionne.nom} ? Les liaisons avec ses enfants seront supprimées.`)) return;
    setEnvoi(true);
    try {
      await supprimerParent(parentSelectionne.id, parentSelectionne.profile_id);
      notifier("Parent supprimé, enfants détachés et compte désactivé.");
      setParentSelectionne(null);
      await chargerDonnees();
    } catch (error) {
      notifier(error?.message || "Erreur lors de la suppression du parent.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AppLayout titre="Parents">
      <div className="page-header">
        <h1>Parents</h1>
        {estDirectrice && (
          <button className="btn btn-accent" onClick={() => setFormulaireOuvert((v) => !v)}>
            {formulaireOuvert ? "Annuler" : "+ Ajouter un parent"}
          </button>
        )}
      </div>

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Nouveau compte parent</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Prénom</label>
                <input
                  required
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Nom</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input
                  required
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input
                  required
                  type="password"
                  value={form.mot_de_passe}
                  onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })}
                  placeholder="Choisir un mot de passe"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Adresse</label>
                <input
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, marginBottom: 16 }}>
              <h4 style={{ marginBottom: 10 }}>Lier à un ou plusieurs enfants</h4>
              <div style={{ display: "grid", gap: 8 }}>
                {eleves.map((eleve) => {
                  const section = eleve.inscriptions?.[0]?.sections?.nom ?? "—";
                  const checked = form.enfants.includes(eleve.id);
                  return (
                    <label
                      key={eleve.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEnfant(eleve.id)}
                      />
                      <span>
                        {eleve.prenom} {eleve.nom} — {section}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={envoi}>
              {envoi ? "Création…" : "Créer le compte parent"}
            </button>
          </form>
        </div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Liste des parents</h3>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un parent"
            style={{ minWidth: 220, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
          />
        </div>

        {chargement ? (
          <Loader />
        ) : parentsFiltres.length === 0 ? (
          <EmptyState titre="Aucun parent trouvé" />
        ) : (
          <div className="parents-grid">
            {parentsFiltres.map((p) => (
              <button
                key={p.id}
                type="button"
                className="card"
                onClick={() => setParentSelectionne(p)}
                style={{
                  padding: 16,
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  background: "var(--color-surface)",
                  boxShadow: "none",
                  minHeight: 110,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{p.prenom} {p.nom}</div>
                <div style={{ color: "var(--color-ink-soft)", fontSize: 13 }}>
                  {(p.parents_eleves ?? []).length > 0
                    ? `${(p.parents_eleves ?? []).length} enfant${(p.parents_eleves ?? []).length > 1 ? "s" : ""}`
                    : "Aucun enfant lié"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {parentSelectionne && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 1000,
          }}
          onClick={() => setParentSelectionne(null)}
        >
          <div
            className="card"
            style={{ width: "min(800px, 100%)", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{parentSelectionne.prenom} {parentSelectionne.nom}</h3>
              <div className="action-group">
                <button type="button" className="btn btn-ghost" onClick={ouvrirEditionParent}>Modifier</button>
                <button type="button" className="btn btn-ghost danger" onClick={supprimerParentSelectionne} disabled={envoi}>Supprimer</button>
                <button type="button" className="btn btn-ghost" onClick={() => setParentSelectionne(null)}>Fermer</button>
              </div>
            </div>

            {parentEnEdition ? (
              <form onSubmit={enregistrerParent}>
                <div className="grid-2">
                  <div className="field"><label>Prénom</label><input required value={formParent.prenom} onChange={(e) => setFormParent({ ...formParent, prenom: e.target.value })} /></div>
                  <div className="field"><label>Nom</label><input required value={formParent.nom} onChange={(e) => setFormParent({ ...formParent, nom: e.target.value })} /></div>
                  <div className="field"><label>Téléphone</label><input required value={formParent.telephone} onChange={(e) => setFormParent({ ...formParent, telephone: e.target.value })} /></div>
                  <div className="field"><label>Email</label><input required type="email" value={formParent.email} onChange={(e) => setFormParent({ ...formParent, email: e.target.value })} /></div>
                  <div className="field field-full"><label>Adresse</label><input value={formParent.adresse} onChange={(e) => setFormParent({ ...formParent, adresse: e.target.value })} /></div>
                </div>
                <div className="action-group"><button type="submit" className="btn btn-primary" disabled={envoi}>Enregistrer</button><button type="button" className="btn btn-ghost" onClick={() => setParentEnEdition(false)}>Annuler</button></div>
              </form>
            ) : <div style={{ display: "grid", gap: 12 }}>
              <div><strong>Prénom :</strong> {parentSelectionne.prenom || "—"}</div>
              <div><strong>Nom :</strong> {parentSelectionne.nom || "—"}</div>
              <div><strong>Téléphone :</strong> {parentSelectionne.telephone || "—"}</div>
              <div><strong>Email :</strong> {parentSelectionne.email || parentSelectionne.profiles?.email || parentSelectionne.profile?.email || "—"}</div>
              <div><strong>Adresse :</strong> {parentSelectionne.adresse || "—"}</div>
              <div>
                <strong>Enfant(s) :</strong>
                <ul style={{ margin: "8px 0 0 18px" }}>
                  {(parentSelectionne.parents_eleves ?? []).length === 0 ? (
                    <li>—</li>
                  ) : (
                    (parentSelectionne.parents_eleves ?? []).map((pe) => (
                      <li key={`${parentSelectionne.id}-${pe.eleve_id}`}>
                        {pe.eleves ? `${pe.eleves.prenom} ${pe.eleves.nom}` : "Enfant"}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              {eleves.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={enfantALier} onChange={(e) => setEnfantALier(e.target.value)}>
                    <option value="">Ajouter un enfant…</option>
                    {eleves.map((eleve) => <option key={eleve.id} value={eleve.id}>{eleve.prenom} {eleve.nom}</option>)}
                  </select>
                  <button type="button" className="btn btn-primary" onClick={ajouterEnfantAuParent} disabled={!enfantALier || envoi}>
                    Lier l'enfant
                  </button>
                </div>
              )}
            </div>}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
