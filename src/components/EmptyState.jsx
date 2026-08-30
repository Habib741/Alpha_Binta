export default function EmptyState({ icon = "📋", titre, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 style={{ fontSize: 16, marginBottom: 4 }}>{titre}</h3>
      {description && <p style={{ fontSize: 13.5, margin: 0 }}>{description}</p>}
    </div>
  );
}
