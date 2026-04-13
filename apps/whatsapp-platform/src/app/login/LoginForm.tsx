"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resolvePostLoginRedirect } from "@/lib/postLoginRedirect";
import { readVerifyPayload, unwrapApiData } from "@/lib/api-json-client";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { PasswordField } from "@/components/auth/PasswordField";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const submitLock = useRef(false);

  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const j = (await res.json().catch(() => ({}))) as { user?: { role?: string } };
          const redirect = resolvePostLoginRedirect(searchParams.get("next"), j.user?.role);
          router.replace(redirect);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingAuth(false));
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLock.current || loading) return;
    setError(null);

    const em = email.trim();
    if (!em || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    submitLock.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password }),
        credentials: "include",
      });
      const raw = await res.json().catch(() => ({}));
      const data = raw as {
        success?: boolean;
        error?: string | { code?: string; message?: string };
        code?: string;
        user?: { role?: string };
      };

      if (!res.ok) {
        setError(mapAuthHttpError(res.status, data));
        return;
      }

      const loginPayload = unwrapApiData<{ user?: { role?: string } }>(raw);
      const user = loginPayload?.user ?? (data as { user?: { role?: string } }).user;
      const redirect = resolvePostLoginRedirect(searchParams.get("next"), user?.role);
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-10" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="mt-3 text-sm text-slate-500">A verificar sessão…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
        />
      </div>
      <PasswordField
        id="login-password"
        label="Senha"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
        disabled={loading}
      />
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "A entrar…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-slate-600">
        <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-800">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
