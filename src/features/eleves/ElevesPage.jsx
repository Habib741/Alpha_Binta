import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  listerEleves,
  creerEleve,
  creerInscription,
  listerSections,
  listerAnneesScolaires,
} from "../../services/elevesService";
import { formaterDate } from "../../utils/format";

export default function ElevesPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const estDirectrice = profile?.role === "DIRECTRICE";

  const [chargement, setChargement] = useState(true);
  const [eleves, setEleves] = useState([]);
  const [sections, setSections] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtreSection, setFiltreSection] = useState("");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const inputExcelRef = useRef(null);

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    date_naissance: "",
    sexe: "M",
    section_id: "",
    annee_scolaire_id: "",
  });

  async function chargerDonnees() {
    setChargement(true);
    try {
      const [listeEleves, listeSections, listeAnnees] = await Promise.all([
        listerEleves(),
        listerSections(),
        listerAnneesScolaires(),
      ]);
      setEleves(listeEleves);
      setSections(listeSections);
      setAnnees(listeAnnees);
      const anneeActive = listeAnnees.find((a) => a.est_active);
      setForm((f) => ({ ...f, annee_scolaire_id: anneeActive?.id ?? "" }));
    } catch (e) {
      notifier("Erreur lors du chargement des élèves.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elevesFiltres = eleves.filter((e) => {
    const nomComplet = `${e.prenom} ${e.nom}`.toLowerCase();
    const matchRecherche = nomComplet.includes(recherche.toLowerCase());
    const sectionEleve = e.inscriptions?.[0]?.section_id;
    const matchSection = !filtreSection || sectionEleve === filtreSection;
    return matchRecherche && matchSection;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      const nouvelEleve = await creerEleve({
        prenom: form.prenom,
        nom: form.nom,
        date_naissance: form.date_naissance,
        sexe: form.sexe,
      });
      await creerInscription({
        eleve_id: nouvelEleve.id,
        section_id: form.section_id,
        annee_scolaire_id: form.annee_scolaire_id,
      });
      notifier(`${form.prenom} ${form.nom} a été ajouté(e).`);
      setFormulaireOuvert(false);
      setForm((f) => ({ ...f, prenom: "", nom: "", date_naissance: "", sexe: "M" }));
      chargerDonnees();
    } catch (err) {
      notifier("Erreur lors de l'ajout de l'élève.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  function normaliserTexte(val) {
    return String(val ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function trouverSectionIdDepuisNom(sectionLabel) {
    if (!sectionLabel) return "";
    const libelle = normaliserTexte(sectionLabel);
    const section = sections.find((s) => normaliserTexte(s.nom) === libelle || normaliserTexte(s.nom).includes(libelle) || libelle.includes(normaliserTexte(s.nom)));
    return section?.id ?? "";
  }

  function parseDateImport(value) {
    if (value === null || value === undefined || String(value).trim() === "") return "";

    if (typeof value === "number") {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        const year = String(date.y).padStart(4, "0");
        const month = String(date.m + 1).padStart(2, "0");
        const day = String(date.d).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
      return "";
    }

    const raw = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(raw)) {
      const [jour, mois, annee] = raw.split(/[/-]/);
      return `${annee}-${mois.padStart(2, "0")}-${jour.padStart(2, "0")}`;
    }
    if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(raw)) {
      const [annee, mois, jour] = raw.split(/[/-]/);
      return `${annee}-${mois.padStart(2, "0")}-${jour.padStart(2, "0")}`;
    }

    const date = new Date(raw.replace(/\//g, "-"));
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }

    return "";
  }

  function extraireValeur(row, labels) {
    const candidates = labels.map((label) => normaliserTexte(label));
    for (const [key, value] of Object.entries(row)) {
      if (candidates.includes(normaliserTexte(key))) return value;
    }
    return "";
  }

  async function handleImportExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!rows.length) {
        throw new Error("Le fichier Excel est vide.");
      }

      let ajoutes = 0;
      const erreurs = [];

      for (const row of rows) {
        const prenom = String(extraireValeur(row, ["prenom", "prénom", "first name", "first_name"]) ?? "").trim();
        const nom = String(extraireValeur(row, ["nom", "last name", "last_name"]) ?? "").trim();
        const sexeBrut = String(extraireValeur(row, ["sexe", "genre"]) ?? "").trim();
        const dateNaissance = parseDateImport(extraireValeur(row, ["date_naissance", "date de naissance", "date de Naissance", "dob", "birthdate"]));
        const sectionLabel = String(extraireValeur(row, ["section", "classe", "section_nom", "nom_section"]) ?? "").trim();

        if (!prenom || !nom || !dateNaissance || !sexeBrut || !sectionLabel) {
          erreurs.push("Une ligne du fichier est incomplète (prénom, nom, date, sexe ou section manquant).");
          continue;
        }

        const sexe = ["m", "masculin", "male"].includes(normaliserTexte(sexeBrut)) ? "M" : ["f", "feminin", "female", "féminin"].includes(normaliserTexte(sexeBrut)) ? "F" : "";
        const sectionId = trouverSectionIdDepuisNom(sectionLabel);

        if (!sexe || !sectionId) {
          erreurs.push(`Le sexe ou la section n'est pas valide pour : ${prenom} ${nom}`);
          continue;
        }

        const eleve = await creerEleve({
          prenom,
          nom,
          date_naissance: dateNaissance,
          sexe,
        });

        await creerInscription({
          eleve_id: eleve.id,
          section_id: sectionId,
          annee_scolaire_id: form.annee_scolaire_id,
        });

        ajoutes += 1;
      }

      if (ajoutes > 0) {
        notifier(`${ajoutes} élève(s) importé(s) avec succès.`);
      }
      if (erreurs.length > 0) {
        notifier(erreurs[0], "error");
      }

      event.target.value = "";
      await chargerDonnees();
    } catch (err) {
      notifier(err?.message || "Erreur lors de l'import Excel.", "error");
    }
  }

  return (
    <AppLayout titre="Élèves">
      <div className="page-header">
        <h1>Élèves</h1>
        {estDirectrice && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-accent" onClick={() => setFormulaireOuvert((v) => !v)}>
              {formulaireOuvert ? "Annuler" : "+ Ajouter un élève"}
            </button>
            <button className="btn btn-ghost" onClick={() => inputExcelRef.current?.click()}>
              Importer Excel
            </button>
            <input
              ref={inputExcelRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleImportExcel}
            />
          </div>
        )}
      </div>

      {estDirectrice && (
        <div style={{ marginBottom: 18, color: "var(--color-ink-soft)", fontSize: 13 }}>
          Format attendu : prénom, nom, date de naissance, sexe, section.
        </div>
      )}

      {formulaireOuvert && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Nouvel élève</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label>Prénom</label>
                <input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div className="field">
                <label>Nom</label>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div className="field">
                <label>Date de naissance</label>
                <input
                  required
                  type="date"
                  value={form.date_naissance}
                  onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Sexe</label>
                <select value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div className="field">
                <label>Section</label>
                <select
                  required
                  value={form.section_id}
                  onChange={(e) => setForm({ ...form, section_id: e.target.value })}
                >
                  <option value="">Choisir…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Année scolaire</label>
                <select
                  required
                  value={form.annee_scolaire_id}
                  onChange={(e) => setForm({ ...form, annee_scolaire_id: e.target.value })}
                >
                  {annees.map((a) => (
                    <option key={a.id} value={a.id}>{a.libelle}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={envoi}>
              {envoi ? "Enregistrement…" : "Enregistrer l'élève"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            placeholder="Rechercher un élève…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
          />
          <select
            value={filtreSection}
            onChange={(e) => setFiltreSection(e.target.value)}
            style={{ padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 6 }}
          >
            <option value="">Toutes les sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>

        {chargement ? (
          <Loader />
        ) : elevesFiltres.length === 0 ? (
          <EmptyState titre="Aucun élève trouvé" description="Essayez une autre recherche ou ajoutez un élève." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Section</th>
                <th>Date de naissance</th>
              </tr>
            </thead>
            <tbody>
              {elevesFiltres.map((e) => (
                <tr key={e.id}>
                  <td>{e.nom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.inscriptions?.[0]?.sections?.nom ?? "—"}</td>
                  <td>{formaterDate(e.date_naissance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
