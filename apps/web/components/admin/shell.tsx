"use client";
import { usePathname } from "next/navigation";
import Header from "./header";
import Sidebare from "./sidebare";
import Navbare from "./navbare";
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const login = usePathname() === "/admin/login";
  if (login)
    return (
      <div className="admin-ui admin-login-shell" lang="fr" dir="ltr">
        {children}
      </div>
    );
  return (
    <div className="admin-ui" lang="fr" dir="ltr">
      <Sidebare />
      <div className="admin-main">
        <Header />
        <main className="admin-content">{children}</main>
      </div>
      <Navbare mobile />
    </div>
  );
}
