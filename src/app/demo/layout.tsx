import type { Metadata } from "next";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Demonstração guiada | Atendimento no WhatsApp | DevFlow Labs",
  description:
    "Simule como um cliente fala no WhatsApp: mensagens, respostas automáticas, triagem e handoff para humano — fluxo guiado, sem instalar nada.",
  alternates: {
    canonical: `${baseUrl}/demo`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Demonstração guiada no WhatsApp | DevFlow Labs",
    description:
      "Experimente inbox, automação e handoff num roteiro curto — como na operação real.",
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
      "Simule atendimento no WhatsApp: automação, triagem e passagem para humano.",
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
