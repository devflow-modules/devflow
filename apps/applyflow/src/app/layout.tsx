import type { Metadata, Viewport } from "next";
import Link from "next/link";

import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_APPLYFLOW_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ApplyFlow — Copiloto local-first para candidaturas",
  description:
    "Extensão Chrome e dashboard web para acompanhar candidaturas no LinkedIn: privado, sem backend, com IA opt-in.",
  openGraph: {
    title: "ApplyFlow",
    description:
      "Copiloto local-first e privacy-first para LinkedIn Easy Apply — métricas, histórico e autofill assistido sem enviar dados a um backend.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApplyFlow",
    description: "Copiloto local-first para LinkedIn Easy Apply — sem backend obrigatório.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-20 border-b border-[color:var(--af-border)] bg-[color:var(--af-bg)]/88 backdrop-blur-xl backdrop-saturate-150">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent" />
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-emerald-400 transition-colors hover:text-emerald-300 sm:text-lg"
            >
              ApplyFlow
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm sm:gap-x-5">
              <Link
                href="/"
                className="rounded-md px-2 py-1.5 text-[color:var(--af-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--af-text)]"
              >
                Início
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1.5 text-[color:var(--af-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--af-text)]"
              >
                Dashboard
              </Link>
              <Link
                href="/documentacao"
                className="rounded-md px-2 py-1.5 text-[color:var(--af-text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--af-text)]"
              >
                Documentação
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
