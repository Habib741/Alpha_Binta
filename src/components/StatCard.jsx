export default function StatCard({ label, value, suffix }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {suffix ? <span style={{ fontSize: 16, marginLeft: 4 }}>{suffix}</span> : null}
      </div>
    </div>
  );
}
