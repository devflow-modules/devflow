import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const metadata: Metadata = {
  title: "Cadastro | WhatsApp Platform",
  description: "Crie sua conta",
  robots: "noindex, nofollow",
};

export default function SignupPage() {
  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Criar conta"
      description="Registe-se para ligar o WhatsApp Business, inbox e automações ao seu negócio."
    >
      <SignupForm />
    </AuthScreenShell>
  );
}
