import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/ToastContext";
import { listerSections, listerEleves, anneeActive } from "../../services/elevesService";
import {
  listerMatieres,
  creerMatiere,
  modifierMatiere,
  supprimerMatiere,
  obtenirOuCreerComposition,
  modifierComposition,
  supprimerComposition,
  listerNotes,
  enregistrerNote,
  supprimerNote,
} from "../../services/notesService";

function estSectionAvecNotes(section) {
  return /moyenne|grande/i.test(section.nom);
}

export default function NotesPage() {
  const { profile } = useAuth();
  const notifier = useToast();
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [annee, setAnnee] = useState(null);
  const [eleves, setEleves] = useState([]);
  const [matieres, setMatieres] = useState([]);
  const [composition, setComposition] = useState(null);
  const [notes, setNotes] = useState({});
  const [matiereForm, setMatiereForm] = useState({ nom: "", ordre: 1 });
  const [matiereEnCours, setMatiereEnCours] = useState(null);

  async function chargerBase() {
    setChargement(true);
    try {
      const [listeSections, anneeActiveData] = await Promise.all([listerSections(), anneeActive()]);
      const sectionsEligibles = listeSections.filter(estSectionAvecNotes);
      setSections(sectionsEligibles);
      setAnnee(anneeActiveData);
      if (!sectionId && sectionsEligibles.length > 0) setSectionId(sectionsEligibles[0].id);
    } catch (error) {
      notifier(error?.message || "Erreur lors du chargement des classes.", "error");
    } finally {
      setChargement(false);
    }
  }

  async function chargerClasse(id = sectionId) {
    if (!id || !annee) return;
    setChargement(true);
    try {
      const [listeEleves, listeMatieres, comp] = await Promise.all([
        listerEleves(),
        listerMatieres(id),
        obtenirOuCreerComposition(id, annee.id, profile.id),
      ]);
      setEleves(listeEleves.filter((eleve) => eleve.inscriptions?.some((inscription) => inscription.section_id === id && inscription.annee_scolaire_id === annee.id)));
      setMatieres(listeMatieres);
      setComposition(comp);
      const listeNotes = await listerNotes(comp.id);
      const valeurs = {};
      listeNotes.forEach((note) => {
        valeurs[`${note.eleve_id}-${note.matiere_id}`] = { id: note.id, valeur: String(note.valeur), commentaire: note.commentaire || "" };
      });
      setNotes(valeurs);
    } catch (error) {
      notifier(error?.message || "Erreur lors du chargement des notes.", "error");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { chargerBase(); }, []);

  useEffect(() => {
    if (sectionId && annee) chargerClasse();
  }, [sectionId, annee]);

  function reinitialiserMatiere() {
    setMatiereEnCours(null);
    setMatiereForm({ nom: "", ordre: matieres.length + 1 });
  }

  async function enregistrerMatiere(event) {
    event.preventDefault();
    if (!matiereForm.nom.trim()) return;
    setEnvoi(true);
    try {
      if (matiereEnCours) {
        await modifierMatiere(matiereEnCours.id, { nom: matiereForm.nom.trim(), ordre: Number(matiereForm.ordre) || 1 });
        notifier("Matière modifiée.");
      } else {
        await creerMatiere({ section_id: sectionId, nom: matiereForm.nom.trim(), ordre: Number(matiereForm.ordre) || 1 });
        notifier("Matière ajoutée.");
      }
      reinitialiserMatiere();
      await chargerClasse();
    } catch (error) {
      notifier(error?.message || "Erreur lors de l'enregistrement de la matière.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerMatiereCourante(matiere) {
    if (!window.confirm(`Supprimer la matière ${matiere.nom} et ses notes ?`)) return;
    try {
      await supprimerMatiere(matiere.id);
      notifier("Matière supprimée.");
      await chargerClasse();
    } catch (error) {
      notifier(error?.message || "Erreur lors de la suppression de la matière.", "error");
    }
  }

  function modifierValeur(eleveId, matiereId, valeur) {
    setNotes((anciennes) => ({
      ...anciennes,
      [`${eleveId}-${matiereId}`]: { ...(anciennes[`${eleveId}-${matiereId}`] || {}), valeur },
    }));
  }

  async function sauvegarderNote(eleveId, matiereId) {
    const cle = `${eleveId}-${matiereId}`;
    const note = notes[cle];
    if (!note?.valeur || Number(note.valeur) < 0 || Number(note.valeur) > 20) {
      notifier("La note doit être comprise entre 0 et 20.", "error");
      return;
    }
    setEnvoi(true);
    try {
      const resultat = await enregistrerNote({
        ...(note.id ? { id: note.id } : {}),
        composition_id: composition.id,
        eleve_id: eleveId,
        matiere_id: matiereId,
        valeur: Number(note.valeur),
        commentaire: note.commentaire || null,
        saisie_par: profile.id,
      });
      setNotes((anciennes) => ({ ...anciennes, [cle]: { ...note, id: resultat.id, valeur: String(resultat.valeur) } }));
    } catch (error) {
      notifier(error?.message || "Erreur lors de l'enregistrement de la note.", "error");
    } finally {
      setEnvoi(false);
    }
  }

  async function effacerNote(eleveId, matiereId) {
    const note = notes[`${eleveId}-${matiereId}`];
    if (!note?.id) return;
    try {
      await supprimerNote(note.id);
      setNotes((anciennes) => ({ ...anciennes, [`${eleveId}-${matiereId}`]: {} }));
    } catch (error) {
      notifier(error?.message || "Erreur lors de la suppression de la note.", "error");
    }
  }

  async function changerPublication() {
    try {
      const statut = composition.statut === "PUBLIEE" ? "BROUILLON" : "PUBLIEE";
      const resultat = await modifierComposition(composition.id, { statut });
      setComposition(resultat);
      notifier(statut === "PUBLIEE" ? "Notes publiées aux parents." : "Notes remises en brouillon.");
    } catch (error) {
      notifier(error?.message || "Erreur lors de la publication.", "error");
    }
  }

  async function supprimerCompositionCourante() {
    if (!window.confirm("Supprimer cette composition et toutes ses notes ?")) return;
    try {
      await supprimerComposition(composition.id);
      setComposition(null);
      setNotes({});
      notifier("Composition supprimée.");
    } catch (error) {
      notifier(error?.message || "Erreur lors de la suppression de la composition.", "error");
    }
  }

  if (chargement && !sections.length) return <AppLayout titre="Notes"><Loader /></AppLayout>;

  return (
    <AppLayout titre="Notes">
      <div className="page-header">
        <h1>Notes et composition</h1>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field" style={{ maxWidth: 420 }}>
          <label>Classe concernée</label>
          <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            {sections.map((section) => <option key={section.id} value={section.id}>{section.nom}</option>)}
          </select>
        </div>
        <p style={{ color: "var(--color-ink-faint)", margin: 0 }}>Année scolaire : {annee?.libelle}</p>
      </div>

      {chargement ? <Loader /> : !composition ? <EmptyState titre="Aucune composition" /> : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="page-header" style={{ marginBottom: 12 }}>
              <div>
                <h3>{composition.libelle}</h3>
                <span className={`badge ${composition.statut === "PUBLIEE" ? "badge-success" : "badge-accent"}`}>
                  {composition.statut === "PUBLIEE" ? "Publiée" : "Brouillon"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={changerPublication}>
                  {composition.statut === "PUBLIEE" ? "Remettre en brouillon" : "Publier aux parents"}
                </button>
                <button className="btn btn-ghost danger" onClick={supprimerCompositionCourante}>Supprimer</button>
              </div>
            </div>
            <form onSubmit={enregistrerMatiere} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <div className="field" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}>
                <label>{matiereEnCours ? "Modifier la matière" : "Ajouter une matière"}</label>
                <input value={matiereForm.nom} onChange={(event) => setMatiereForm({ ...matiereForm, nom: event.target.value })} placeholder="Ex. Langage" />
              </div>
              <div className="field" style={{ width: 100, marginBottom: 0 }}>
                <label>Ordre</label>
                <input type="number" min="1" value={matiereForm.ordre} onChange={(event) => setMatiereForm({ ...matiereForm, ordre: event.target.value })} />
              </div>
              <button className="btn btn-primary" disabled={envoi}>{matiereEnCours ? "Modifier" : "Ajouter"}</button>
              {matiereEnCours && <button type="button" className="btn btn-ghost" onClick={reinitialiserMatiere}>Annuler</button>}
            </form>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {matieres.map((matiere) => (
                <span className="badge" key={matiere.id}>
                  {matiere.nom}
                  <button type="button" onClick={() => { setMatiereEnCours(matiere); setMatiereForm({ nom: matiere.nom, ordre: matiere.ordre }); }} aria-label={`Modifier ${matiere.nom}`}>Modifier</button>
                  <button type="button" onClick={() => supprimerMatiereCourante(matiere)} aria-label={`Supprimer ${matiere.nom}`}>×</button>
                </span>
              ))}
            </div>
          </div>

          {matieres.length === 0 ? <EmptyState titre="Ajoutez au moins une matière pour saisir les notes" description="Utilisez le formulaire ci-dessus, puis les champs de notes apparaîtront pour chaque élève." /> : eleves.length === 0 ? <EmptyState titre="Aucun élève inscrit dans cette classe" description="Vérifiez que les enfants sont inscrits dans cette classe pour l'année scolaire active." /> : (
            <div className="card" style={{ overflowX: "auto" }}>
              <h3 style={{ marginBottom: 6 }}>Saisie des notes</h3>
              <p style={{ margin: "0 0 14px", color: "var(--color-ink-faint)" }}>
                Saisissez une note sur 20 dans la colonne de chaque matière. La note est enregistrée automatiquement lorsque vous quittez le champ.
              </p>
              <table className="data-table notes-table">
                <thead><tr><th>Élève</th>{matieres.map((matiere) => <th key={matiere.id}>{matiere.nom}</th>)}<th>Moyenne</th></tr></thead>
                <tbody>
                  {eleves.map((eleve) => {
                    const notesEleve = matieres.map((matiere) => Number(notes[`${eleve.id}-${matiere.id}`]?.valeur)).filter(Number.isFinite);
                    const moyenne = notesEleve.length ? (notesEleve.reduce((total, note) => total + note, 0) / notesEleve.length).toFixed(2) : "—";
                    return <tr key={eleve.id}><td><strong>{eleve.prenom} {eleve.nom}</strong></td>{matieres.map((matiere) => {
                      const note = notes[`${eleve.id}-${matiere.id}`] || {};
                      return <td key={matiere.id}><label className="note-cell"><span>Note / 20</span><input className="note-input" type="number" min="0" max="20" step="0.01" placeholder="0 à 20" value={note.valeur ?? ""} onChange={(event) => modifierValeur(eleve.id, matiere.id, event.target.value)} onBlur={() => sauvegarderNote(eleve.id, matiere.id)} aria-label={`${matiere.nom} pour ${eleve.prenom} ${eleve.nom}`} /></label>{note.id && <button className="note-delete" onClick={() => effacerNote(eleve.id, matiere.id)} aria-label="Effacer la note">×</button>}</td>;
                    })}<td><strong>{moyenne}</strong></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
