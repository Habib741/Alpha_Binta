import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import { listerEleves } from "../../services/elevesService";
import { soldeTousLesEleves, enregistrerPaiement } from "../../services/paiementsService";
import { formaterMontant, dateDuJourISO } from "../../utils/format";

export default function PaiementsPage() {
  const { profile } = useAuth();
  const notifier = useToast();

  const [chargement, setChargement] = useState(true);
  const [soldes, setSoldes] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form, setForm] = useState({
    eleve_id: "",
    type: "MENSUALITE",
    montant: "",
    mode: "ESPECES",
    date_paiement: dateDuJourISO(),
    commentaire: "",
  });

  async function charger() {
    setChargement(true);
    try {
      const [listeSoldes, listeEleves] = await Promise.all([soldeTousLesEleves(), listerEleves()]);
      setSoldes(listeSoldes);
      setEleves(listeEleves);
    } catch (e) {
      notifier("Erreur lors du chargement des paiements.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await enregistrerPaiement({
        ...form,
        montant: Number(form.montant),
        enregistre_par: profile.id,
      });
      notifier("Paiement enregistré.");
      setFormulaireOuvert(false);
      setForm((f) => ({ ...f, eleve_id: "", montant: "", commentaire: "" }));
      charger();
    } catch (err) {
      notifier("Erreur lors de l'enregistrement du paiement.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <AppLayout titre="Paiements">
      <div className="page-header">
        <h1>Paiements</h1>
        <button className="btn btn-accent" onClick={() => setFormulaireOuvert((v) => !v)}>
          {formulaireOuvert ? "Annuler" : "+ Enregistrer un paiement"}
        </button>
      </div>

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Nouveau paiement</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Élève</label>
                <select required value={form.eleve_id} onChange={(e) => setForm({ ...form, eleve_id: e.target.value })}>
                  <option value="">Choisir…</option>
                  {eleves.map((e) => (
                    <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="INSCRIPTION">Inscription</option>
                  <option value="MENSUALITE">Mensualité</option>
                  <option value="COTISATION">Cotisation</option>
                </select>
              </div>
              <div className="field">
                <label>Montant (FCFA)</label>
                <input required type="number" min="1" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
              </div>
              <div className="field">
                <label>Mode de paiement</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  <option value="ESPECES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                </select>
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={form.date_paiement} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} />
              </div>
              <div className="field">
                <label>Commentaire (optionnel)</label>
                <input value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={envoi}>
              {envoi ? "Enregistrement…" : "Enregistrer le paiement"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Situation financière des élèves</h3>
        {chargement ? (
          <Loader />
        ) : soldes.length === 0 ? (
          <EmptyState titre="Aucune donnée de solde disponible" description="Vérifiez que des tarifs sont définis pour l'année active." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Total dû</th>
                <th>Total payé</th>
                <th>Reste à payer</th>
              </tr>
            </thead>
            <tbody>
              {soldes.map((s) => (
                <tr key={s.eleve_id}>
                  <td>{s.prenom} {s.nom}</td>
                  <td className="montant">{formaterMontant(s.total_du)}</td>
                  <td className="montant">{formaterMontant(s.total_paye)}</td>
                  <td className="montant" style={{ color: Number(s.reste_a_payer) > 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                    {formaterMontant(s.reste_a_payer)}
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
