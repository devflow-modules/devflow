import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Platform | DevFlow",
  description: "Scaffold — produto em desenvolvimento.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden font-sans antialiased">{children}</body>
    </html>
  );
}
