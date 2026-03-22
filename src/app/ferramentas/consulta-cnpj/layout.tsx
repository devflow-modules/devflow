import type { Metadata } from "next";
import { ToolHubSection } from "@/components/seo/ToolHubSection";

const baseUrl = "https://devflowlabs.com.br";

export const metadata: Metadata = {
  title: "Consulta CNPJ — Dados públicos de empresas",
  description:
    "Consulte CNPJ na base da Receita Federal. Razão social, situação, endereço e atividade principal. Ferramenta gratuita.",
  alternates: {
    canonical: `${baseUrl}/ferramentas/consulta-cnpj`,
  },
  keywords: ["consulta cnpj", "cnpj receita federal", "dados de empresa", "razão social"],
  openGraph: {
    title: "Consulta CNPJ | DevFlow Labs",
    description: "Consulte dados públicos de empresas por CNPJ. Gratuito.",
    url: `${baseUrl}/ferramentas/consulta-cnpj`,
    type: "website",
  },
};

export default function ConsultaCnpjLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ToolHubSection tool="cnpj" />
    </>
  );
}
