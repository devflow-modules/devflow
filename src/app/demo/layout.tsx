import type { Metadata } from "next";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Demo guiada da operação no WhatsApp | DevFlow Labs",
  description:
    "Veja uma simulação guiada de atendimento e vendas no WhatsApp com IA, triagem e handoff. Depois da demo, agende seu diagnóstico.",
  alternates: {
    canonical: `${baseUrl}/demo`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Demonstração guiada no WhatsApp | DevFlow Labs",
    description:
      "Simulação comercial guiada para entender a operação no WhatsApp antes da implementação.",
    url: `${baseUrl}/demo`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — demonstração de atendimento no WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Demonstração guiada | DevFlow Labs",
    description:
      "Veja a operação simulada e avance para diagnóstico com a DevFlow.",
    images: [ogImage],
  },
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
