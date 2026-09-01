import { useEffect, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { mesEnfants } from "../../services/parentsService";
import { historiquePresences } from "../../services/presencesService";
import { formaterDate } from "../../utils/format";

const nomsDocuments = {
  PHOTO_IDENTITE_1: "Photo d'identité 1",
  PHOTO_IDENTITE_2: "Photo d'identité 2",
  EXTRAIT_NAISSANCE: "Extrait de naissance",
  CNI_PARENT: "CNI / passeport du parent",
  CARNET_SANTE: "Carnet de santé / vaccination",
};

function extraireInformations(valeur) {
  if (!valeur) return {};
  if (typeof valeur === "object") return valeur;
  try {
    return JSON.parse(valeur);
  } catch {
    return {};
  }
}

function afficherValeur(valeur) {
  return valeur || "Non renseigné";
}

function cleDate(date) {
  return typeof date === "string" ? date.slice(0, 10) : "";
}

function joursDuMois(date) {
  const annee = date.getFullYear();
  const mois = date.getMonth();
  const nombreJours = new Date(annee, mois + 1, 0).getDate();
  const premierJour = (new Date(annee, mois, 1).getDay() + 6) % 7;

  return [
    ...Array.from({ length: premierJour }, () => null),
    ...Array.from({ length: nombreJours }, (_, index) => new Date(annee, mois, index + 1)),
  ];
}

export default function MesEnfantsPage() {
  const [chargement, setChargement] = useState(true);
  const [enfants, setEnfants] = useState([]);
  const [moisCourant, setMoisCourant] = useState(() => new Date());
  const [enfantOuvert, setEnfantOuvert] = useState(null);

  function changerMois(delta) {
    setMoisCourant((date) => new Date(date.getFullYear(), date.getMonth() + delta, 1));
  }

  useEffect(() => {
    async function charger() {
      try {
        const liste = await mesEnfants();
        const enrichis = await Promise.all(
          liste.map(async (e) => ({
            ...e,
            informations: extraireInformations(e.informations_complementaires),
            presences: await historiquePresences(e.id).catch(() => []),
          }))
        );
        setEnfants(enrichis);
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  return (
    <AppLayout titre="Mes enfants">
      <h1 style={{ marginBottom: 20 }}>Mes enfants</h1>
      {chargement ? (
        <Loader />
      ) : enfants.length === 0 ? (
        <EmptyState titre="Aucun enfant associé à votre compte" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h3>Présences du mois</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => changerMois(-1)} aria-label="Mois précédent">&lt;</button>
                <strong style={{ minWidth: 140, textAlign: "center", textTransform: "capitalize" }}>
                  {moisCourant.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </strong>
                <button className="btn btn-ghost" onClick={() => changerMois(1)} aria-label="Mois suivant">&gt;</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
              <span><i className="presence-legend presence-present" /> Présent(e)</span>
              <span><i className="presence-legend presence-absent" /> Absent(e)</span>
              <span><i className="presence-legend presence-weekend" /> Week-end</span>
              <span><i className="presence-legend presence-empty" /> Aucun pointage</span>
            </div>
          </div>

          {enfants.map((enfant) => {
            const informationsOuvertes = enfantOuvert === enfant.id;
            const presences = new Map(enfant.presences.map((presence) => [cleDate(presence.date), presence.statut]));
            const jours = joursDuMois(moisCourant);
            return (
          <div className="card child-panel" key={enfant.id} style={{ marginBottom: 12 }}>
            <div className="child-panel-heading">
              <span>
                <strong>{enfant.prenom} {enfant.nom}</strong>
                <small>{enfant.inscriptions?.[0]?.sections?.nom ?? "Section non définie"}</small>
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => setEnfantOuvert(informationsOuvertes ? null : enfant.id)}
                aria-expanded={informationsOuvertes}
              >
                {informationsOuvertes ? "Masquer les informations" : `Voir les informations personnelles de ${enfant.prenom}`}
              </button>
            </div>

            {informationsOuvertes && <div className="child-panel-content">

            <div className="grid-2" style={{ marginTop: 18 }}>
              <div>
                <strong>Date de naissance</strong>
                <p>{formaterDate(enfant.date_naissance)}</p>
              </div>
              <div>
                <strong>Sexe</strong>
                <p>{enfant.sexe === "F" ? "Féminin" : enfant.sexe === "M" ? "Masculin" : "Non renseigné"}</p>
              </div>
              <div>
                <strong>Lieu de naissance</strong>
                <p>{afficherValeur(enfant.informations.lieu_naissance)}</p>
              </div>
              <div>
                <strong>Adresse de l'enfant</strong>
                <p>{afficherValeur(enfant.informations.adresse_enfant)}</p>
              </div>
              <div>
                <strong>Année scolaire</strong>
                <p>{enfant.inscriptions?.[0]?.annees_scolaires?.libelle ?? "Non renseignée"}</p>
              </div>
              <div>
                <strong>Date d'inscription</strong>
                <p>{formaterDate(enfant.inscriptions?.[0]?.date_inscription)}</p>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>Parent / tuteur</h4>
              <p>Nom : {afficherValeur(enfant.informations.parent?.nom)}</p>
              <p>Adresse : {afficherValeur(enfant.informations.parent?.adresse)}</p>
              <p>Téléphone : {afficherValeur(enfant.informations.parent?.telephone)}</p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>Personne autorisée</h4>
              <p>Nom : {afficherValeur(enfant.informations.personne_autorisee?.nom)}</p>
              <p>Adresse : {afficherValeur(enfant.informations.personne_autorisee?.adresse)}</p>
              <p>Téléphone : {afficherValeur(enfant.informations.personne_autorisee?.telephone)}</p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>Santé</h4>
              <p>{afficherValeur(enfant.informations.sante_enfant)}</p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h4>Documents enregistrés</h4>
              {(enfant.documents_enfants ?? []).length === 0 ? (
                <p>Aucun document enregistré.</p>
              ) : (
                <ul style={{ margin: "8px 0 0 18px" }}>
                  {enfant.documents_enfants.map((document) => {
                    const baseUrl = import.meta.env.VITE_SUPABASE_URL || "";
                    const url = document.chemin_storage && baseUrl
                      ? `${baseUrl}/storage/v1/object/public/documents-enfants/${encodeURIComponent(document.chemin_storage)}`
                      : "";
                    return (
                      <li key={document.id}>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            {nomsDocuments[document.type_document] ?? document.type_document}
                          </a>
                        ) : (
                          nomsDocuments[document.type_document] ?? document.type_document
                        )}
                        {document.nom_fichier ? ` (${document.nom_fichier})` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            </div>}

            <h4 style={{ marginTop: 16, marginBottom: 8, fontFamily: "var(--font-body)", fontSize: 14 }}>
              Calendrier des présences — {enfant.prenom} {enfant.nom}
            </h4>
            <div className="presence-calendar" aria-label={`Présences de ${enfant.prenom} ${enfant.nom}`}>
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((jour) => (
                <div className="presence-calendar-heading" key={jour}>{jour}</div>
              ))}
              {jours.map((jour, index) => {
                if (!jour) return <div className="presence-calendar-day empty" key={`vide-${index}`} />;
                const date = cleDate(`${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, "0")}-${String(jour.getDate()).padStart(2, "0")}`);
                const estWeekend = jour.getDay() === 0 || jour.getDay() === 6;
                const statut = presences.get(date);
                const classe = estWeekend
                  ? "weekend"
                  : statut === "PRESENT"
                    ? "present"
                    : statut === "ABSENT"
                      ? "absent"
                      : "sans-pointage";
                return (
                  <div className={`presence-calendar-day ${classe}`} key={date} title={statut ? `${formaterDate(date)} : ${statut === "PRESENT" ? "Présent(e)" : "Absent(e)"}` : `${formaterDate(date)} : aucun pointage`}>
                    <span>{jour.getDate()}</span>
                    {statut && <small>{statut === "PRESENT" ? "Présent" : "Absent"}</small>}
                  </div>
                );
              })}
            </div>
          </div>
            );
          })}
        </>
      )}
    </AppLayout>
  );
}
