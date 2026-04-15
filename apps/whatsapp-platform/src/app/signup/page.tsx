import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadastro | WhatsApp Platform",
  description: "Plano gratuito ou Pro — equipe, IA e controle.",
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
      description="Comece no plano gratuito ou escolha um plano pago para operar com mais equipe, IA e controle."
    >
      <SignupForm affiliateRefFromUrl={refFromUrl} />
    </AuthScreenShell>
  );
}
