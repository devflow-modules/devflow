import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo | Simule Atendimento Automatizado | DevFlow Labs",
  description:
    "Teste a automação de atendimento no WhatsApp. Digite uma pergunta e veja como a IA responde. Demonstração interativa.",
  openGraph: {
    title: "Demo - Simule Atendimento | DevFlow Labs",
    url: "https://devflowlabs.com.br/demo",
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
