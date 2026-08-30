export default function Loader({ plein = false, texte = "Chargement…" }) {
  const style = plein
    ? { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }
    : { padding: "24px", textAlign: "center", color: "var(--color-ink-faint)" };

  return (
    <div style={style}>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{texte}</span>
    </div>
  );
}
