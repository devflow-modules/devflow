"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { PasswordField } from "@/components/auth/PasswordField";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<"starter" | "pro" | "scale">("starter");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLock.current || loading) return;
    setError(null);

    const n = name.trim();
    const em = email.trim();
    if (!n || !em || !password) {
      setError("Preencha nome, e-mail e senha.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    submitLock.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, email: em, password, planId }),
        credentials: "include",
      });
      const text = await res.text();
      let data: {
        error?: string;
        code?: string;
        redirectUrl?: string;
        redirectTo?: string;
      } = {};
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(mapAuthHttpError(res.status, data));
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      const redirectTo = data.redirectTo ?? "/onboarding";
      window.location.href = redirectTo;
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
      <div>
        <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="signup-email"
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
        id="signup-password"
        label="Senha (mín. 8 caracteres)"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={8}
        disabled={loading}
      />
      <fieldset disabled={loading} className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-slate-700">Plano</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="planId"
              value="starter"
              checked={planId === "starter"}
              onChange={() => setPlanId("starter")}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Starter (grátis)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="planId"
              value="pro"
              checked={planId === "pro"}
              onChange={() => setPlanId("pro")}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Pro (pago)</span>
          </label>
        </div>
      </fieldset>
      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "A criar conta…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-800">
          Já tenho conta — entrar
        </Link>
      </p>
    </form>
  );
}
