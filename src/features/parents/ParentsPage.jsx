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
} from "../../services/parentsService";

export default function ParentsPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";

  const [chargement, setChargement] = useState(true);
  const [parents, setParents] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
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

      <div className="card">
        {chargement ? (
          <Loader />
        ) : parents.length === 0 ? (
          <EmptyState titre="Aucun parent enregistré" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Enfant(s)</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.prenom} {p.nom}
                  </td>
                  <td>{p.telephone}</td>
                  <td>
                    {(p.parents_eleves ?? [])
                      .map((pe) => `${pe.eleves?.prenom ?? ""} ${pe.eleves?.nom ?? ""}`)
                      .join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
