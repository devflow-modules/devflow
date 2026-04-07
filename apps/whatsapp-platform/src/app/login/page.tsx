import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";

export const metadata: Metadata = {
  title: "Entrar | WhatsApp Platform",
  description: "Faça login na sua conta",
  robots: "noindex, nofollow",
};

export default function LoginPage() {
  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Entrar"
      description="Aceda ao painel, inbox e automações com a sua conta."
      footer={
        <p className="text-center text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-800">
            Criar conta
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthScreenShell>
  );
}
