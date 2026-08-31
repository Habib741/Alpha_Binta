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

export const libelleType = {
  INSCRIPTION: "Inscription",
  MENSUALITE: "Mensualité (octobre à juin)",
  BLAUSE: "Blouse",
  COTISATION: "Cotisation",
};

export const libelleMode = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};
