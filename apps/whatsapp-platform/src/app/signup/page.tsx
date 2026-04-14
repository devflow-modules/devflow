import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const metadata: Metadata = {
  title: "Cadastro | WhatsApp Platform",
  description: "Plano gratuito ou Pro — equipe, IA e controle.",
  robots: "noindex, nofollow",
};

export default function SignupPage() {
  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Criar conta"
      description="Comece no plano gratuito ou escolha um plano pago para operar com mais equipe, IA e controle."
    >
      <SignupForm />
    </AuthScreenShell>
  );
}
