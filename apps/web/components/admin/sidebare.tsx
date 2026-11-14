import Navbare from "./navbare";
export default function Sidebare() {
  return (
    <aside className="admin-sidebar">
      <a
        href="/admin"
        className="admin-brand"
        aria-label="Solavia administration"
      >
        Solavia
      </a>
      <span className="admin-workspace">Votre espace de gestion</span>
      <Navbare />
      <a
        className="view-store"
        href="/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Voir la boutique ↗
      </a>
      <img
        className="sidebar-vines"
        src="/images/solavia/admin/vines.webp"
        alt=""
        width="900"
        height="301"
      />
    </aside>
  );
}
