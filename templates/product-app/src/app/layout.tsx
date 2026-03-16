import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product | DevFlow",
  description: "Product app — replace with product name and description.",
  robots: "noindex, nofollow",
};

/**
 * Root layout. Wrap with providers (auth, theme) as needed.
 * Product-specific chrome (header/sidebar) lives in components/ or modules/domain.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
