import type { Metadata, Viewport } from "next";
import AdminShell from "@/components/admin/shell";
import localFont from "next/font/local";
import "@/components/admin/admin.css";
export const metadata: Metadata = {
  title: { default: "Solavia · Administration", template: "%s · Solavia" },
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Solavia",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/images/solavia/admin/icon-192.png",
    apple: "/images/solavia/admin/icon-192.png",
  },
};
export const viewport: Viewport = {
  themeColor: "#173b2b",
  colorScheme: "light",
  viewportFit: "cover",
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
