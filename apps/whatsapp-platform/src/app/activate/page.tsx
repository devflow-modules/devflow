import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { ActivateMemberForm } from "./ActivateMemberForm";

export const metadata: Metadata = {
  title: "Activar conta | WhatsApp Platform",
  description: "Definir senha e activar convite da equipe",
  robots: "noindex, nofollow",
};

export default function ActivateMemberPage() {
  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Activar conta"
      description="Defina a sua senha para entrar na equipe da clínica."
      footer={
        <p className="text-center text-sm df-text-secondary">
          Problemas com o convite?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
            Contacte o gestor
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
        <ActivateMemberForm />
      </Suspense>
    </AuthScreenShell>
  );
}
