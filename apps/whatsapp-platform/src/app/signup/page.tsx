import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Cadastro | WhatsApp Platform",
  description: "Crie sua conta",
  robots: "noindex, nofollow",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Criar conta</h1>
        <SignupForm />
        <p className="text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/login" className="text-blue-600 underline hover:no-underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
