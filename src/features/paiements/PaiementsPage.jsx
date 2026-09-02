import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import { listerEleves, listerSections, anneeActive } from "../../services/elevesService";
import {
  soldeTousLesEleves,
  enregistrerPaiement,
  modifierPaiement,
  supprimerPaiement,
  historiquePaiements,
  listerTousPaiements,
  listerTarifs,
  creerTarif,
  modifierTarif,
  supprimerTarif,
} from "../../services/paiementsService";
import { formaterMontant, dateDuJourISO, formaterDate, libelleTypePaiement } from "../../utils/format";

const TYPES_PAIEMENT = [
  { value: "INSCRIPTION", label: "Inscription" },
  { value: "MENSUALITE", label: "Mensualité" },
  { value: "BLAUSE", label: "Blouse" },
  { value: "COTISATION", label: "Cotisation" },
];

export default function PaiementsPage() {
  const { profile } = useAuth();
  const notifier = useToast();

  const [chargement, setChargement] = useState(true);
  const [soldes, setSoldes] = useState([]);
  const [eleves, setEleves] = useState([]);
  const [sections, setSections] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [sectionFiltre, setSectionFiltre] = useState("");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [tousPaiements, setTousPaiements] = useState([]);
  const [envoi, setEnvoi] = useState(false);
  const [envoiTarif, setEnvoiTarif] = useState(false);
  const [editingTarifId, setEditingTarifId] = useState(null);
  const [editingPaiementId, setEditingPaiementId] = useState(null);
  const [vuePaiements, setVuePaiements] = useState("paiement");
  const [eleveSelectionneModal, setEleveSelectionneModal] = useState(null);
  const [rechercheHistorique, setRechercheHistorique] = useState("");
  const [rechercheFinance, setRechercheFinance] = useState("");
  const [pageHistorique, setPageHistorique] = useState(1);
  const [pageFinance, setPageFinance] = useState(1);
  const pageTaille = 8;
  const [form, setForm] = useState({
    section_id: "",
    eleve_id: "",
    type: "MENSUALITE",
    montant: "",
    mode: "ESPECES",
    date_paiement: dateDuJourISO(),
    commentaire: "",
  });
  const [tarifForm, setTarifForm] = useState({
    section_id: "",
    type: "INSCRIPTION",
    montant: "",
  });

  const elevesParSection = form.section_id
    ? eleves.filter((e) => e.inscriptions?.[0]?.section_id === form.section_id)
    : eleves;

  const soldesFiltres = sectionFiltre
    ? soldes.filter((s) => s.section_id === sectionFiltre)
    : soldes;

  const soldesRecherche = soldesFiltres.filter((s) => {
    const texte = `${s.prenom || ""} ${s.nom || ""}`.toLowerCase();
    return texte.includes(rechercheFinance.toLowerCase());
  });

  const financeTotalPages = Math.max(1, Math.ceil(soldesRecherche.length / pageTaille));
  const financePageData = soldesRecherche.slice((pageFinance - 1) * pageTaille, pageFinance * pageTaille);

  const paiementsRecherche = tousPaiements.filter((p) => {
    const eleve = p.eleves ? `${p.eleves.prenom || ""} ${p.eleves.nom || ""}` : "";
    const texte = `${eleve} ${p.type || ""} ${p.mode || ""}`.toLowerCase();
    return texte.includes(rechercheHistorique.toLowerCase());
  });

  const historiqueTotalPages = Math.max(1, Math.ceil(paiementsRecherche.length / pageTaille));
  const historiquePageData = paiementsRecherche.slice((pageHistorique - 1) * pageTaille, pageHistorique * pageTaille);

  const tarifActuel = useMemo(() => {
    if (!form.section_id || !form.type) return null;
    return tarifs.find((t) => t.section_id === form.section_id && t.type === form.type) || null;
  }, [form.section_id, form.type, tarifs]);

  useEffect(() => {
    if (!form.eleve_id) {
      setHistorique([]);
      return;
    }

    let ignore = false;
    historiquePaiements(form.eleve_id)
      .then((data) => {
        if (!ignore) setHistorique(data || []);
      })
      .catch(() => {
        if (!ignore) setHistorique([]);
      });

    return () => {
      ignore = true;
    };
  }, [form.eleve_id]);

  useEffect(() => {
    if (tarifActuel && !form.montant) {
      setForm((f) => ({ ...f, montant: String(tarifActuel.montant) }));
    }
  }, [tarifActuel, form.montant]);

  async function charger() {
    setChargement(true);
    try {
      const [listeSoldes, listeEleves, listeSections, listeTarifs] = await Promise.all([
        soldeTousLesEleves(),
        listerEleves(),
        listerSections(),
        listerTarifs(),
      ]);
      setSoldes(listeSoldes);
      setEleves(listeEleves);
      setSections(listeSections);
      setTarifs(listeTarifs);
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

  useEffect(() => {
    async function chargerHistoriqueGlobal() {
      try {
        const data = await listerTousPaiements();
        setTousPaiements(data || []);
      } catch (err) {
        setTousPaiements([]);
      }
    }

    chargerHistoriqueGlobal();
  }, []);

  useEffect(() => {
    setPageHistorique(1);
  }, [rechercheHistorique]);

  useEffect(() => {
    setPageFinance(1);
  }, [rechercheFinance, sectionFiltre]);

  function reinitialiserTarifForm(sectionId = "") {
    setEditingTarifId(null);
    setTarifForm({ section_id: sectionId, type: "INSCRIPTION", montant: "" });
  }

  function ouvrirEditionTarif(tarif) {
    setEditingTarifId(tarif.id);
    setTarifForm({
      section_id: tarif.section_id,
      type: tarif.type,
      montant: String(tarif.montant),
    });
  }

  async function supprimerTarifCourant(id) {
    const tarif = tarifs.find((item) => item.id === id);
    if (!tarif) return;

    const reponse = window.confirm(`Supprimer le tarif ${labelType(tarif.type)} pour ${tarif.sections?.nom || "cette classe"} ?`);
    if (!reponse) return;

    try {
      await supprimerTarif(id);
      notifier("Tarif supprimé.");
      reinitialiserTarifForm();
      await charger();
    } catch (err) {
      notifier(err?.message || "Erreur lors de la suppression du tarif.", "error");
    }
  }

  async function handleTarifSubmit(e) {
    e.preventDefault();
    if (!tarifForm.section_id || !tarifForm.type || !tarifForm.montant) {
      notifier("La classe, le type et le montant du tarif sont obligatoires.", "error");
      return;
    }

    setEnvoiTarif(true);
    try {
      const anneeCourante = await anneeActive();
      if (editingTarifId) {
        await modifierTarif(editingTarifId, {
          section_id: tarifForm.section_id,
          annee_scolaire_id: anneeCourante.id,
          type: tarifForm.type,
          montant: Number(tarifForm.montant),
        });
        notifier("Tarif modifié.");
      } else {
        await creerTarif({
          section_id: tarifForm.section_id,
          annee_scolaire_id: anneeCourante.id,
          type: tarifForm.type,
          montant: Number(tarifForm.montant),
        });
        notifier("Tarif enregistré pour la section.");
      }
      reinitialiserTarifForm(tarifForm.section_id);
      await charger();
    } catch (err) {
      notifier(err?.message || "Erreur lors de l'enregistrement du tarif.", "error");
    } finally {
      setEnvoiTarif(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.section_id || !form.eleve_id) {
      notifier("Veuillez choisir une classe puis un élève avant d'enregistrer le paiement.", "error");
      return;
    }

    setEnvoi(true);
    try {
      const anneeCourante = await anneeActive();
      await enregistrerPaiement({
        eleve_id: form.eleve_id,
        section_id: form.section_id,
        annee_scolaire_id: anneeCourante.id,
        type: form.type,
        montant: Number(form.montant),
        mode: form.mode,
        date_paiement: form.date_paiement,
        commentaire: form.commentaire,
        enregistre_par: profile.id,
      });
      notifier("Paiement enregistré.");
      setFormulaireOuvert(false);
      setForm((f) => ({ ...f, section_id: "", eleve_id: "", montant: "", commentaire: "", type: "MENSUALITE" }));
      await charger();
    } catch (err) {
      notifier(err?.message || "Erreur lors de l'enregistrement du paiement.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerPaiementCourant(id) {
    const paiement = historique.find((item) => item.id === id);
    if (!paiement) return;

    const reponse = window.confirm(`Supprimer ce paiement de ${labelType(paiement.type, paiement.date_paiement)} ?`);
    if (!reponse) return;

    try {
      await supprimerPaiement(id);
      notifier("Paiement supprimé.");
      await charger();
      if (form.eleve_id) {
        const data = await historiquePaiements(form.eleve_id);
        setHistorique(data || []);
      }
    } catch (err) {
      notifier(err?.message || "Erreur lors de la suppression du paiement.", "error");
    }
  }

  const labelType = (type, date = null) => libelleTypePaiement(type, date);

  const ouvrirHistoriqueEleve = (eleve) => {
    const idEleve = eleve.eleve_id || eleve.id;
    setForm((f) => ({
      ...f,
      section_id: eleve.section_id || f.section_id,
      eleve_id: idEleve,
    }));
    setEleveSelectionneModal({
      id: idEleve,
      prenom: eleve.prenom,
      nom: eleve.nom,
    });
    setFormulaireOuvert(false);
    setVuePaiements("historique");
  };

  const eleveSelectionne = eleves.find((e) => e.id === form.eleve_id) || eleveSelectionneModal;

  const renderPagination = (page, totalPages, setter) => {
    if (totalPages <= 1) return null;

    return (
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setter((v) => Math.max(1, v - 1))}>
          Précédent
        </button>
        <span style={{ color: "var(--color-ink-soft)" }}>
          Page {page}/{totalPages}
        </span>
        <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setter((v) => Math.min(totalPages, v + 1))}>
          Suivant
        </button>
      </div>
    );
  };

  return (
    <AppLayout titre="Paiements">
      <div className="page-header" style={{ alignItems: "center" }}>
        <h1>Paiements</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={`btn ${vuePaiements === "paiement" ? "btn-primary" : "btn-ghost"}`} onClick={() => setVuePaiements("paiement")}>
            Paiement
          </button>
          <button type="button" className={`btn ${vuePaiements === "historique" ? "btn-primary" : "btn-ghost"}`} onClick={() => setVuePaiements("historique")}>
            Historique des paiements
          </button>
          <button type="button" className={`btn ${vuePaiements === "finance" ? "btn-primary" : "btn-ghost"}`} onClick={() => setVuePaiements("finance")}>
            Finance enfant
          </button>
        </div>
      </div>

      {vuePaiements === "paiement" && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Tarifs par classe</h3>
              <button className="btn btn-accent" onClick={() => setFormulaireOuvert((v) => !v)}>
                {formulaireOuvert ? "Annuler" : "+ Enregistrer un paiement"}
              </button>
            </div>
            <form onSubmit={handleTarifSubmit}>
              <div className="grid-2">
                <div className="field">
                  <label>Classe</label>
                  <select value={tarifForm.section_id} onChange={(e) => setTarifForm({ ...tarifForm, section_id: e.target.value })}>
                    <option value="">Choisir une classe…</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>{section.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Type</label>
                  <select value={tarifForm.type} onChange={(e) => setTarifForm({ ...tarifForm, type: e.target.value })}>
                    {TYPES_PAIEMENT.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Montant par défaut (FCFA)</label>
                  <input type="number" min="0" step="100" value={tarifForm.montant} onChange={(e) => setTarifForm({ ...tarifForm, montant: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={envoiTarif}>
                  {envoiTarif ? "Enregistrement…" : editingTarifId ? "Enregistrer les modifications" : "Enregistrer le tarif"}
                </button>
                {editingTarifId && (
                  <button type="button" className="btn btn-ghost" onClick={() => reinitialiserTarifForm()}>
                    Annuler
                  </button>
                )}
              </div>
            </form>

            <div style={{ marginTop: 18 }}>
              <h4 style={{ marginBottom: 10 }}>Tarifs enregistrés</h4>
              {tarifs.length === 0 ? (
                <p style={{ color: "var(--color-ink-soft)" }}>Aucun tarif enregistré pour le moment.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tarifs.map((tarif) => (
                      <tr key={tarif.id}>
                        <td>{tarif.sections?.nom || "—"}</td>
                        <td>{labelType(tarif.type)}</td>
                        <td className="montant">{formaterMontant(tarif.montant)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" className="btn btn-ghost" onClick={() => ouvrirEditionTarif(tarif)}>Modifier</button>
                            <button type="button" className="btn btn-ghost danger" onClick={() => supprimerTarifCourant(tarif.id)}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {formulaireOuvert && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 14 }}>Nouveau paiement</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid-2">
                  <div className="field">
                    <label>Classe</label>
                    <select
                      required
                      value={form.section_id}
                      onChange={(e) => setForm({ ...form, section_id: e.target.value, eleve_id: "", montant: "" })}
                    >
                      <option value="">Choisir une classe…</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>{section.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Élève</label>
                    <select
                      required
                      value={form.eleve_id}
                      onChange={(e) => setForm({ ...form, eleve_id: e.target.value })}
                      disabled={!form.section_id}
                    >
                      <option value="">Choisir un élève…</option>
                      {elevesParSection.map((e) => (
                        <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, montant: "" })}>
                      {TYPES_PAIEMENT.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Montant (FCFA)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={form.montant}
                      onChange={(e) => setForm({ ...form, montant: e.target.value })}
                      placeholder={tarifActuel ? String(tarifActuel.montant) : "Montant"}
                    />
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
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
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

          {form.eleve_id && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 14 }}>Historique des paiements</h3>
              {historique.length === 0 ? (
                <EmptyState titre="Aucun paiement pour cet élève" description="Les paiements enregistrés apparaîtront ici." />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Mode</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historique.map((paiement) => (
                      <tr key={paiement.id}>
                        <td>{formaterDate(paiement.date_paiement)}</td>
                        <td>{labelType(paiement.type, paiement.date_paiement)}</td>
                        <td className="montant">{formaterMontant(paiement.montant)}</td>
                        <td>{paiement.mode}</td>
                        <td>
                          <button type="button" className="btn btn-ghost danger" onClick={() => supprimerPaiementCourant(paiement.id)}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {vuePaiements === "historique" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Historique des paiements</h3>
            <input
              type="search"
              value={rechercheHistorique}
              onChange={(e) => setRechercheHistorique(e.target.value)}
              placeholder="Rechercher un élève, un type ou un mode"
              style={{ minWidth: 260, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
            />
          </div>

          {paiementsRecherche.length === 0 ? (
            <EmptyState titre="Aucun paiement trouvé" description="Aucune opération ne correspond à votre recherche." />
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Élève</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historiquePageData.map((paiement) => (
                    <tr key={paiement.id} onClick={() => ouvrirHistoriqueEleve({ id: paiement.eleve_id, prenom: paiement.eleves?.prenom, nom: paiement.eleves?.nom })} style={{ cursor: "pointer" }} title="Voir l’historique de cet élève">
                      <td>{formaterDate(paiement.date_paiement)}</td>
                      <td>{paiement.eleves ? `${paiement.eleves.prenom} ${paiement.eleves.nom}` : "—"}</td>
                      <td>{labelType(paiement.type, paiement.date_paiement)}</td>
                      <td className="montant">{formaterMontant(paiement.montant)}</td>
                      <td>{paiement.mode}</td>
                      <td>
                        <button type="button" className="btn btn-ghost danger" onClick={(e) => { e.stopPropagation(); supprimerPaiementCourant(paiement.id); }}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination(pageHistorique, historiqueTotalPages, setPageHistorique)}
            </>
          )}
        </div>
      )}

      {vuePaiements === "finance" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Finance enfant</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="search"
                value={rechercheFinance}
                onChange={(e) => setRechercheFinance(e.target.value)}
                placeholder="Rechercher un élève"
                style={{ minWidth: 220, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
              />
              <select
                value={sectionFiltre}
                onChange={(e) => setSectionFiltre(e.target.value)}
                style={{ minWidth: 180, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
              >
                <option value="">Toutes les classes</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.nom}</option>
                ))}
              </select>
            </div>
          </div>
          {chargement ? (
            <Loader />
          ) : financePageData.length === 0 ? (
            <EmptyState titre="Aucune donnée de finance pour cet élève" description="Vérifiez que des tarifs sont définis pour l'année active ou choisissez une autre classe." />
          ) : (
            <>
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
                  {financePageData.map((s) => (
                    <tr
                      key={s.eleve_id}
                      onClick={() => ouvrirHistoriqueEleve({ eleve_id: s.eleve_id, prenom: s.prenom, nom: s.nom, section_id: s.section_id })}
                      style={{ cursor: "pointer" }}
                      title="Afficher l'historique des paiements de cet élève"
                    >
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
              {renderPagination(pageFinance, financeTotalPages, setPageFinance)}
            </>
          )}
        </div>
      )}

      {eleveSelectionneModal && (
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
          onClick={() => setEleveSelectionneModal(null)}
        >
          <div
            className="card"
            style={{ width: "min(900px, 100%)", maxHeight: "80vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Historique de paiement - {eleveSelectionne?.prenom || ""} {eleveSelectionne?.nom || ""}</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEleveSelectionneModal(null)}>
                Fermer
              </button>
            </div>

            {historique.length === 0 ? (
              <EmptyState titre="Aucun paiement enregistré" description="Ce profil n’a pas encore de paiement." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((paiement) => (
                    <tr key={paiement.id}>
                      <td>{formaterDate(paiement.date_paiement)}</td>
                      <td>{labelType(paiement.type, paiement.date_paiement)}</td>
                      <td className="montant">{formaterMontant(paiement.montant)}</td>
                      <td>{paiement.mode}</td>
                      <td>
                        <button type="button" className="btn btn-ghost danger" onClick={() => supprimerPaiementCourant(paiement.id)}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
