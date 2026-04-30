import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Redefinir senha | WhatsApp Platform",
  description: "Definir nova senha com o link do e-mail",
  robots: "noindex, nofollow",
};

export default function ResetPasswordPage() {
  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Redefinir senha"
      description="Escolha uma senha forte. Todas as sessões anteriores deixam de ser válidas."
      footer={
        <p className="text-center text-sm df-text-secondary">
          Precisa de um novo link?{" "}
          <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-800">
            Esqueci minha senha
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-blue-600" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthScreenShell>
  );
}
