import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadastro | WhatsApp Platform",
  description: "Avaliação guiada ou operação Pro — equipe, IA e controlo.",
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
      eyebrow="WhatsApp Platform"
      title="Criar conta"
      description="Comece na avaliação guiada da plataforma ou avance para operação paga com mais equipa, IA e controlo."
    >
      <SignupForm affiliateRefFromUrl={refFromUrl} />
    </AuthScreenShell>
  );
}
