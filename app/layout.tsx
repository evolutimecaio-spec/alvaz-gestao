import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alvaz - Gestão",
  description: "Gestão de Obras — Alvaz"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
