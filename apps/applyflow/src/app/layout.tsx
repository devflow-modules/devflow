import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyFlow — Copiloto local-first para candidaturas",
  description:
    "Extensão Chrome e dashboard web para acompanhar candidaturas no LinkedIn: privado, sem backend, com IA opt-in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-10 border-b border-[color:var(--af-border)] bg-[color:var(--af-bg)]/92 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-emerald-400">
              ApplyFlow
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/" className="text-[color:var(--af-text-muted)] transition-colors hover:text-[color:var(--af-text)]">
                Início
              </Link>
              <Link
                href="/dashboard"
                className="text-[color:var(--af-text-muted)] transition-colors hover:text-[color:var(--af-text)]"
              >
                Dashboard
              </Link>
              <Link
                href="/documentacao"
                className="text-[color:var(--af-text-muted)] transition-colors hover:text-[color:var(--af-text)]"
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
