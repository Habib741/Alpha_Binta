import { NavLink } from "react-router-dom";
import { menuConfig } from "./menuConfig";

export default function Sidebar({ role, open, onNavigate }) {
  const items = menuConfig[role] || [];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-name">École Alpha et Binta</div>
        <div className="brand-tag">Gestion scolaire</div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">Tivaouane, Sénégal</div>
    </aside>
  );
}
