import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Investiga+ | DevFlow",
  description: "Scaffold — produto em desenvolvimento.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
