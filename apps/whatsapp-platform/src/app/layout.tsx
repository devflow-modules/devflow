import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Platform | DevFlow",
  description: "Scaffold — produto em desenvolvimento.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeMode = process.env.NEXT_PUBLIC_THEME_MODE === "client_branded" ? "client_branded" : "devflow";
  return (
    <html lang="pt-BR" data-theme={themeMode} className="h-full overflow-hidden">
      <body className="df-page h-full overflow-hidden font-sans antialiased">{children}</body>
    </html>
  );
}
