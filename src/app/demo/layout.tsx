import type { Metadata } from "next";

const baseUrl = "https://devflowlabs.com.br";
const ogImage = `${baseUrl}/og-devflow.png`;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Diagnóstico da operação no WhatsApp | DevFlow Labs",
  description:
    "Agende um diagnóstico consultivo da sua operação no WhatsApp: canais, equipe, prospecção, IA assistida e métricas. Simulação guiada e próximos passos com a DevFlow Labs.",
  alternates: {
    canonical: `${baseUrl}/demo`,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevFlow Labs",
    title: "Diagnóstico e demonstração — Operação WhatsApp multi-canal | DevFlow Labs",
    description:
      "Entenda gargalos de atendimento e prospecção e veja como separar canais com inbox unificada, dashboard por linha e implantação gerenciada.",
    url: `${baseUrl}/demo`,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "DevFlow Labs — diagnóstico da operação no WhatsApp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagnóstico da operação no WhatsApp | DevFlow Labs",
    description:
      "Diagnóstico consultivo + simulação guiada. Próximo passo: conversa com a DevFlow Labs.",
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
