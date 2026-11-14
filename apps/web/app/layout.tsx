// app/layout.tsx
// Root app layout.
// Linked files: app/globals.css and all routes under app/*.
// This file must import globals.css once so Tailwind utilities exist across the app.

import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";

const heading = localFont({ src: "./fonts/readex-full.woff2", variable: "--font-heading", display: "swap", weight: "160 700" });
const body = localFont({ src: [
  { path: "./fonts/ibm-arabic-full-400.woff2", weight: "400" },
  { path: "./fonts/ibm-arabic-full-500.woff2", weight: "500" },
], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "SHAYA BIO | سولافيا",
  description: "SHAYA BIO من سولافيا، مكمل غذائي بالأشواغاندا ومستخلصات نباتية لدعم الاسترخاء والتوازن، 60 كبسولة",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={`${heading.variable} ${body.variable}`}>
      <body style={{ fontFamily: "var(--font-body), sans-serif", background: "#173b2b" }}>{children}</body>
    </html>
  );
}
