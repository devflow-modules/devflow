import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const dynamic = "force-dynamic";

const wl = process.env.NEXT_PUBLIC_PRODUCT_MODE === "WHITE_LABEL";

export const metadata: Metadata = {
  title: wl ? "Pedir acesso | WhatsApp Platform" : "Cadastro | WhatsApp Platform",
  description: wl
    ? "Criação do espaço da operação e ativação guiada do canal — sem pagamento nesta página."
    : "Avaliação guiada ou operação Pro — equipe, IA e controlo.",
  robots: "noindex, nofollow",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const sp = await searchParams;
  const refFromUrl = typeof sp.ref === "string" ? sp.ref : undefined;
  return (
    <AuthScreenShell
      eyebrow={wl ? "Operação" : "WhatsApp Platform"}
      title={wl ? "Pedir acesso" : "Criar conta"}
      description={
        wl
          ? "Criamos o espaço da sua operação. Em seguida, configure o canal e o atendimento com o assistente de ativação."
          : "Comece na avaliação guiada da plataforma ou avance para operação paga com mais equipa, IA e controlo."
      }
    >
      <SignupForm affiliateRefFromUrl={refFromUrl} />
    </AuthScreenShell>
  );
}
