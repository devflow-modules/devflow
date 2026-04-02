import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo — Financeiro",
  description: "Acesso à experiência do painel no app Financeiro.",
  robots: { index: false, follow: true },
};

export default function FinanceiroDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
