import type { Metadata } from "next";
import AdminShell from "@/components/admin/shell";
import localFont from "next/font/local";
import "@/components/admin/admin.css";
export const metadata: Metadata = {
  title: { default: "Solavia · Administration", template: "%s · Solavia" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
};
const adminFont = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-admin",
  weight: "100 900",
  display: "swap",
});
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={adminFont.variable}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
