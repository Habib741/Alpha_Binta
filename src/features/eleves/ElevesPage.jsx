import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import {
  listerEleves,
  creerEleve,
  creerInscription,
  modifierInscription,
  listerSections,
  listerAnneesScolaires,
  modifierEleve,
  desactiverEleve,
} from "../../services/elevesService";
import { formaterDate } from "../../utils/format";
import { DOC_TYPES, televerserDocumentEleve, listerDocumentsEleve, obtenirUrlDocument } from "../../services/documentsService";

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
  const [eleveSelectionne, setEleveSelectionne] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    date_naissance: "",
    lieu_naissance: "",
    adresse: "",
    sexe: "M",
    section_id: "",
    annee_scolaire_id: "",
    photo_identite_1: null,
    photo_identite_2: null,
    parent_nom: "",
    parent_adresse: "",
    parent_telephone: "",
    personne_nom: "",
    personne_adresse: "",
    personne_telephone: "",
    sante: "",
    extrait_naissance: null,
    document_cni_parent: null,
    carnet_sante: null,
  });

  function mettreAJourForm(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  function validerFormulaire() {
    const champsObligatoires = [
      ["prenom", "Le prénom est obligatoire."],
      ["nom", "Le nom est obligatoire."],
      ["date_naissance", "La date de naissance est obligatoire."],
      ["lieu_naissance", "Le lieu de naissance est obligatoire."],
      ["adresse", "L'adresse de l'enfant est obligatoire."],
      ["section_id", "La section est obligatoire."],
      ["annee_scolaire_id", "L'année scolaire est obligatoire."],
      ["parent_nom", "Le prénom(s) et nom du parent / tuteur sont obligatoires."],
      ["parent_adresse", "L'adresse du parent / tuteur est obligatoire."],
      ["parent_telephone", "Le(s) téléphone(s) du parent / tuteur sont obligatoires."],
      ["personne_nom", "Le prénom(s) et nom de la personne autorisée sont obligatoires."],
      ["personne_adresse", "L'adresse de la personne autorisée est obligatoire."],
      ["personne_telephone", "Le(s) téléphone(s) de la personne autorisée sont obligatoires."],
    ];

    if (!editingId) {
      champsObligatoires.push(
        ["photo_identite_1", "La photo d'identité 1 est obligatoire."],
        ["photo_identite_2", "La photo d'identité 2 est obligatoire."],
        ["extrait_naissance", "L'extrait de naissance est obligatoire."],
        ["document_cni_parent", "La copie de la CNI ou du passeport du parent est obligatoire dans les documents."]
      );
    }

    for (const [champ, message] of champsObligatoires) {
      if (!form[champ] || !String(form[champ]).trim()) {
        notifier(message, "error");
        return false;
      }
    }

    return true;
  }

  function parseInformationsComplementaires(valeur) {
    if (!valeur) return {};
    if (typeof valeur === "object") return valeur;
    try {
      return JSON.parse(valeur);
    } catch {
      return {};
    }
  }

  function libelleTypeDocument(type) {
    const labels = {
      PHOTO_IDENTITE_1: "Photo d'identité 1",
      PHOTO_IDENTITE_2: "Photo d'identité 2",
      EXTRAIT_NAISSANCE: "Extrait de naissance",
      CNI_PARENT: "CNI / passeport du parent",
      CARNET_SANTE: "Carnet de santé / vaccination",
    };
    return labels[type] || type;
  }

  function remplirFormulaireDepuisEleve(eleve) {
    const infos = parseInformationsComplementaires(eleve?.informations_complementaires);
    setForm({
      prenom: eleve?.prenom ?? "",
      nom: eleve?.nom ?? "",
      date_naissance: eleve?.date_naissance ?? "",
      lieu_naissance: infos?.lieu_naissance ?? "",
      adresse: infos?.adresse_enfant ?? "",
      sexe: eleve?.sexe ?? "M",
      section_id: eleve?.inscriptions?.[0]?.section_id ?? "",
      annee_scolaire_id: eleve?.inscriptions?.[0]?.annee_scolaire_id ?? "",
      photo_identite_1: null,
      photo_identite_2: null,
      parent_nom: infos?.parent?.nom ?? "",
      parent_adresse: infos?.parent?.adresse ?? "",
      parent_telephone: infos?.parent?.telephone ?? "",
      personne_nom: infos?.personne_autorisee?.nom ?? "",
      personne_adresse: infos?.personne_autorisee?.adresse ?? "",
      personne_telephone: infos?.personne_autorisee?.telephone ?? "",
      sante: infos?.sante_enfant ?? "",
      extrait_naissance: null,
      document_cni_parent: null,
      carnet_sante: null,
    });
  }

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

  async function supprimerEleve(id) {
    const eleve = eleves.find((item) => item.id === id);
    if (!eleve) return;

    const reponse = window.confirm(`Supprimer ${eleve.prenom} ${eleve.nom} ?`);
    if (!reponse) return;

    try {
      await desactiverEleve(id);
      setEleveSelectionne(null);
      setDocuments([]);
      await chargerDonnees();
      notifier(`${eleve.prenom} ${eleve.nom} a été supprimé(e).`);
    } catch (err) {
      notifier(err?.message || "Erreur lors de la suppression de l'élève.", "error");
    }
  }

  async function selectionnerEleve(eleve) {
    setDocuments([]);
    setEleveSelectionne(eleve);
    if (!estDirectrice) {
      return;
    }
    try {
      const listeDocuments = await listerDocumentsEleve(eleve.id);
      const documentsAvecUrl = await Promise.all((listeDocuments || []).map(async (doc) => ({
        ...doc,
        publicUrl: await obtenirUrlDocument(doc.chemin_storage),
      })));
      setDocuments(documentsAvecUrl);
    } catch (err) {
      setDocuments([]);
      notifier(err?.message || "Erreur lors du chargement des documents.", "error");
    }
  }

  function ouvrirEdition(eleve) {
    setEditingId(eleve.id);
    remplirFormulaireDepuisEleve(eleve);
    setFormulaireOuvert(true);
    setEleveSelectionne(eleve);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validerFormulaire()) {
      return;
    }

    setEnvoi(true);
    try {
      const informationsComplementaires = {
        lieu_naissance: form.lieu_naissance,
        adresse_enfant: form.adresse,
        parent: {
          nom: form.parent_nom,
          adresse: form.parent_adresse,
          telephone: form.parent_telephone,
        },
        personne_autorisee: {
          nom: form.personne_nom,
          adresse: form.personne_adresse,
          telephone: form.personne_telephone,
        },
        sante_enfant: form.sante,
      };

      if (editingId) {
        await modifierEleve(editingId, {
          prenom: form.prenom,
          nom: form.nom,
          date_naissance: form.date_naissance,
          sexe: form.sexe,
          informations_complementaires: JSON.stringify(informationsComplementaires),
        });

        const inscriptionExistante = eleves.find((eleve) => eleve.id === editingId)?.inscriptions?.[0];
        if (inscriptionExistante && (inscriptionExistante.section_id !== form.section_id || inscriptionExistante.annee_scolaire_id !== form.annee_scolaire_id)) {
          await modifierInscription(inscriptionExistante.id, {
            section_id: form.section_id,
            annee_scolaire_id: form.annee_scolaire_id,
          });
        }

        notifier(`${form.prenom} ${form.nom} a été mis à jour.`);
      } else {
        const nouvelEleve = await creerEleve({
          prenom: form.prenom,
          nom: form.nom,
          date_naissance: form.date_naissance,
          sexe: form.sexe,
          informations_complementaires: JSON.stringify(informationsComplementaires),
        });

        await creerInscription({
          eleve_id: nouvelEleve.id,
          section_id: form.section_id,
          annee_scolaire_id: form.annee_scolaire_id,
        });

        const televersements = [
          [DOC_TYPES.PHOTO_IDENTITE_1, form.photo_identite_1],
          [DOC_TYPES.PHOTO_IDENTITE_2, form.photo_identite_2],
          [DOC_TYPES.EXTRAIT_NAISSANCE, form.extrait_naissance],
          [DOC_TYPES.CNI_PARENT, form.document_cni_parent],
          [DOC_TYPES.CARNET_SANTE, form.carnet_sante],
        ];

        await Promise.all(
          televersements
            .filter(([, file]) => file)
            .map(([typeDocument, file]) =>
              televerserDocumentEleve({
                eleveId: nouvelEleve.id,
                typeDocument,
                file,
                obligatoire: typeDocument !== DOC_TYPES.CARNET_SANTE,
              })
            )
        );

        notifier(`${form.prenom} ${form.nom} a été ajouté(e).`);
      }

      setFormulaireOuvert(false);
      setEditingId(null);
      setEleveSelectionne(null);
      setForm({
        prenom: "",
        nom: "",
        date_naissance: "",
        lieu_naissance: "",
        adresse: "",
        sexe: "M",
        section_id: "",
        annee_scolaire_id: form.annee_scolaire_id,
        photo_identite_1: null,
        photo_identite_2: null,
        parent_nom: "",
        parent_adresse: "",
        parent_telephone: "",
        personne_nom: "",
        personne_adresse: "",
        personne_telephone: "",
        sante: "",
        extrait_naissance: null,
        document_cni_parent: null,
        carnet_sante: null,
      });
      await chargerDonnees();
    } catch (err) {
      console.error(err);
      notifier(err?.message || "Erreur lors de l'ajout ou de la modification de l'élève.", "error");
    } finally {
      setEnvoi(false);
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
          <h3 style={{ marginBottom: 12 }}>{editingId ? "Modifier l'enfant" : "Formulaire d'inscription d'un enfant"}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h4>1. Identification de l'enfant</h4>
              <div className="grid-2">
                <div className="field">
                  <label>Nom *</label>
                  <input value={form.nom} onChange={(e) => mettreAJourForm("nom", e.target.value)} />
                </div>
                <div className="field">
                  <label>Prénom(s) *</label>
                  <input value={form.prenom} onChange={(e) => mettreAJourForm("prenom", e.target.value)} />
                </div>
                <div className="field">
                  <label>Date de naissance *</label>
                  <input type="date" value={form.date_naissance} onChange={(e) => mettreAJourForm("date_naissance", e.target.value)} />
                </div>
                <div className="field">
                  <label>Lieu de naissance *</label>
                  <input value={form.lieu_naissance} onChange={(e) => mettreAJourForm("lieu_naissance", e.target.value)} />
                </div>
                <div className="field field-full">
                  <label>Adresse *</label>
                  <input value={form.adresse} onChange={(e) => mettreAJourForm("adresse", e.target.value)} />
                </div>
                <div className="field">
                  <label>Sexe</label>
                  <select value={form.sexe} onChange={(e) => mettreAJourForm("sexe", e.target.value)}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="field">
                  <label>Section *</label>
                  <select value={form.section_id} onChange={(e) => mettreAJourForm("section_id", e.target.value)}>
                    <option value="">Choisir…</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>{s.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Année scolaire *</label>
                  <select value={form.annee_scolaire_id} onChange={(e) => mettreAJourForm("annee_scolaire_id", e.target.value)}>
                    <option value="">Choisir…</option>
                    {annees.map((a) => (
                      <option key={a.id} value={a.id}>{a.libelle}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>2. Identification du parent / tuteur</h4>
              <div className="grid-2">
                <div className="field field-full">
                  <label>Prénom(s) et nom *</label>
                  <input value={form.parent_nom} onChange={(e) => mettreAJourForm("parent_nom", e.target.value)} />
                </div>
                <div className="field field-full">
                  <label>Adresse *</label>
                  <input value={form.parent_adresse} onChange={(e) => mettreAJourForm("parent_adresse", e.target.value)} />
                </div>
                <div className="field field-full">
                  <label>Téléphone(s) *</label>
                  <input value={form.parent_telephone} onChange={(e) => mettreAJourForm("parent_telephone", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>3. Personne autorisée à venir chercher l'enfant</h4>
              <div className="grid-2">
                <div className="field field-full">
                  <label>Prénom(s) et nom *</label>
                  <input value={form.personne_nom} onChange={(e) => mettreAJourForm("personne_nom", e.target.value)} />
                </div>
                <div className="field field-full">
                  <label>Adresse *</label>
                  <input value={form.personne_adresse} onChange={(e) => mettreAJourForm("personne_adresse", e.target.value)} />
                </div>
                <div className="field field-full">
                  <label>Téléphone(s) *</label>
                  <input value={form.personne_telephone} onChange={(e) => mettreAJourForm("personne_telephone", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>4. Santé de l'enfant</h4>
              <div className="field field-full">
                <label>Informations de santé</label>
                <textarea
                  rows="5"
                  placeholder="Cage descriptif, allergies, traitements, suivis médicaux, etc."
                  value={form.sante}
                  onChange={(e) => mettreAJourForm("sante", e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <h4>5. Documents à fournir</h4>
              <div className="grid-2">
                <div className="field field-full">
                  <label>Extrait de naissance *</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => mettreAJourForm("extrait_naissance", e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="field field-full">
                  <label>Copie de la CNI ou du passeport du parent *</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => mettreAJourForm("document_cni_parent", e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="field field-full">
                  <label>Photo d'identité 1 *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => mettreAJourForm("photo_identite_1", e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="field field-full">
                  <label>Photo d'identité 2 *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => mettreAJourForm("photo_identite_2", e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="field field-full">
                  <label>Carnet de santé / vaccination</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => mettreAJourForm("carnet_sante", e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={envoi}>
                {envoi ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer l'inscription"}
              </button>
            </div>
          </form>
        </div>
      )}

      {eleveSelectionne && (
        <div className="modal-backdrop" onClick={() => setEleveSelectionne(null)}>
          <div className="card info-panel modal-content child-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="panel-header">
            <div>
              {(() => {
                const photo = documents.find((doc) => doc.type_document === DOC_TYPES.PHOTO_IDENTITE_1);
                return photo?.publicUrl ? (
                  <img className="child-photo" src={photo.publicUrl} alt={`Photo de ${eleveSelectionne.prenom} ${eleveSelectionne.nom}`} />
                ) : (
                  <div className="child-photo child-photo-placeholder" aria-label="Photo non disponible">{eleveSelectionne.prenom?.charAt(0)}</div>
                );
              })()}
            </div>
            <div>
              <h3>{eleveSelectionne.prenom} {eleveSelectionne.nom}</h3>
              <p>{eleveSelectionne.inscriptions?.[0]?.sections?.nom ?? "Section non définie"}</p>
            </div>
            <div className="action-group">
              <button className="btn btn-ghost" onClick={() => ouvrirEdition(eleveSelectionne)} type="button">Modifier</button>
              <button className="btn btn-ghost danger" onClick={() => supprimerEleve(eleveSelectionne.id)} type="button">Supprimer</button>
              <button className="btn btn-ghost" onClick={() => setEleveSelectionne(null)} type="button">Fermer</button>
            </div>
          </div>

          <div className="details-grid">
            <div><strong>Nom :</strong> {eleveSelectionne.nom}</div>
            <div><strong>Prénom(s) :</strong> {eleveSelectionne.prenom}</div>
            <div><strong>Date de naissance :</strong> {formaterDate(eleveSelectionne.date_naissance)}</div>
            <div><strong>Sexe :</strong> {eleveSelectionne.sexe === "F" ? "Féminin" : "Masculin"}</div>
            <div><strong>Lieu de naissance :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.lieu_naissance || "—"}</div>
            <div><strong>Adresse :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.adresse_enfant || "—"}</div>
            <div><strong>Parent / tuteur :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.parent?.nom || "—"}</div>
            <div><strong>Téléphone parent :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.parent?.telephone || "—"}</div>
            <div><strong>Personne autorisée :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.personne_autorisee?.nom || "—"}</div>
            <div><strong>Téléphone autorisé :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.personne_autorisee?.telephone || "—"}</div>
            <div><strong>Section :</strong> {eleveSelectionne.inscriptions?.[0]?.sections?.nom ?? "—"}</div>
            <div><strong>Année scolaire :</strong> {eleveSelectionne.inscriptions?.[0]?.annees_scolaires?.libelle ?? "—"}</div>
            <div className="details-full"><strong>Santé :</strong> {parseInformationsComplementaires(eleveSelectionne.informations_complementaires)?.sante_enfant || "—"}</div>

            <div className="details-full">
              <strong>Documents enregistrés :</strong>
              {documents.length === 0 ? (
                <span> Aucun document enregistré.</span>
              ) : (
                <div className="document-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-meta">
                        <strong>{libelleTypeDocument(doc.type_document)}</strong>
                        <small>{doc.nom_fichier}</small>
                        {doc.publicUrl && (
                          <a className="btn btn-ghost" href={doc.publicUrl} target="_blank" rel="noreferrer">Ouvrir le document</a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
                <tr key={e.id} className={eleveSelectionne?.id === e.id ? "selected-row" : ""} onClick={() => selectionnerEleve(e)} style={{ cursor: "pointer" }}>
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
