import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ titre, children }) {
  const { profile } = useAuth();
  const [sidebarOuverte, setSidebarOuverte] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        role={profile?.role}
        open={sidebarOuverte}
        onNavigate={() => setSidebarOuverte(false)}
      />
      <div className="main-col">
        <Header titre={titre} onToggleSidebar={() => setSidebarOuverte((v) => !v)} />
        <div className="content-area">{children}</div>
      </div>
    </div>
  );
}
