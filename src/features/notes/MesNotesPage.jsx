import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { notesDeMesEnfants } from "../../services/notesService";

export default function MesNotesPage() {
  const [chargement, setChargement] = useState(true);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    notesDeMesEnfants().then(setNotes).finally(() => setChargement(false));
  }, []);

  const groupes = notes.reduce((resultat, note) => {
    const cle = `${note.compositions?.id}-${note.eleves?.id}`;
    if (!resultat[cle]) resultat[cle] = { enfant: note.eleves, composition: note.compositions, notes: [] };
    resultat[cle].notes.push(note);
    return resultat;
  }, {});

  return (
    <AppLayout titre="Notes de mes enfants">
      <h1 style={{ marginBottom: 20 }}>Notes de mes enfants</h1>
      {chargement ? <Loader /> : Object.values(groupes).length === 0 ? (
        <EmptyState titre="Aucune note publiée pour le moment" />
      ) : Object.values(groupes).map((groupe) => {
        const valeurs = groupe.notes.map((note) => Number(note.valeur)).filter(Number.isFinite);
        const moyenne = valeurs.length ? (valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length).toFixed(2) : "—";
        return (
          <div className="card" key={`${groupe.composition.id}-${groupe.enfant.id}`} style={{ marginBottom: 16 }}>
            <div className="page-header" style={{ marginBottom: 12 }}>
              <div>
                <h3>{groupe.enfant.prenom} {groupe.enfant.nom}</h3>
                <p style={{ color: "var(--color-ink-faint)", margin: "4px 0 0" }}>{groupe.composition.libelle} · {groupe.composition.annees_scolaires?.libelle}</p>
              </div>
              <strong>Moyenne : {moyenne}</strong>
            </div>
            <table className="data-table">
              <thead><tr><th>Matière</th><th>Note / 20</th><th>Commentaire</th></tr></thead>
              <tbody>{groupe.notes.map((note) => <tr key={note.id}><td>{note.matieres?.nom}</td><td><strong>{note.valeur}</strong></td><td>{note.commentaire || "—"}</td></tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </AppLayout>
  );
}
