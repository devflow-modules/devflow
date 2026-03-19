import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar | WhatsApp Platform",
  description: "Faça login na sua conta",
  robots: "noindex, nofollow",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Entrar</h1>
        <LoginForm />
        <p className="text-center text-sm text-slate-600">
          Não tem conta?{" "}
          <Link href="/signup" className="text-blue-600 underline hover:no-underline">
            Cadastrar
          </Link>
        </p>
      </div>
    </main>
  );
}
