export function formaterMontant(montant) {
  const nombre = Number(montant) || 0;
  return `${nombre.toLocaleString("fr-FR")} FCFA`;
}

export function formaterDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function dateDuJourISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formaterMois(date) {
  if (!date) return "";

  const dateObj = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) return "";

  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(dateObj);
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

export function libelleTypePaiement(type, date = null) {
  if (type === "MENSUALITE") {
    return date ? `Mensualité - ${formaterMois(date)}` : "Mensualité";
  }

  return libelleType[type] || type;
}

export const libelleType = {
  INSCRIPTION: "Inscription",
  MENSUALITE: "Mensualité",
  BLAUSE: "Blouse",
  COTISATION: "Cotisation",
};

export const libelleMode = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};
