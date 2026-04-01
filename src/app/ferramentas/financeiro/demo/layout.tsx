import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exemplo do painel — Financeiro",
  description:
    "Veja score, insights e checklist com dados fictícios, sem criar conta. Ideal para entender o produto antes de cadastrar.",
  robots: { index: false, follow: true },
};

export default function FinanceiroDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
