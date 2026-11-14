"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, ScanLine } from "lucide-react";
export const adminLinks = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", Icon: ShoppingBag },
  { href: "/admin/pixel", label: "Meta Pixel", Icon: ScanLine },
];
export default function Navbare({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      className={mobile ? "admin-bottom" : "admin-links"}
      aria-label="Navigation administration"
    >
      {adminLinks.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon size={21} />
          <span>{mobile && href === "/admin" ? "Tableau de bord" : label}</span>
        </Link>
      ))}
    </nav>
  );
}
