"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLock.current || loading) return;
    setError(null);

    const em = email.trim();
    if (!em) {
      setError("Informe o e-mail.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        setError(mapAuthHttpError(res.status, data));
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  if (success) {
    return (
      <AuthScreenShell
        eyebrow="WhatsApp Platform"
        title="Verifique o seu e-mail"
        description="Se existir uma conta associada a esse endereço, enviámos um link para redefinir a senha. Pode demorar alguns minutos."
        footer={
          <p className="text-center text-sm df-text-secondary">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
              Voltar ao login
            </Link>
          </p>
        }
      >
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900"
        >
          Pedido registado. Verifique a caixa de entrada e o spam.
        </div>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      eyebrow="WhatsApp Platform"
      title="Esqueci minha senha"
      description="Indique o e-mail da conta. Enviaremos um link seguro para definir uma nova senha."
      footer={
        <p className="text-center text-sm df-text-secondary">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
            Voltar ao login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium df-text-secondary">
            E-mail
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
          />
        </div>
        <Button variant="primary"
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "A enviar…" : "Enviar link de redefinição"}
        </Button>
      </form>
    </AuthScreenShell>
  );
}
