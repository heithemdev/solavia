import Navbare from "./navbare";
import SolaviaLogo from "@/components/shared/solavia-logo";
export default function Sidebare() {
  return (
    <aside className="admin-sidebar">
      <a
        href="/admin"
        className="admin-brand"
        aria-label="Solavia administration"
      >
        <SolaviaLogo />
      </a>
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
