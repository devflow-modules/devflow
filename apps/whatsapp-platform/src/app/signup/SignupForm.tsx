"use client";

import { useState } from "react";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const password = fd.get("password") as string;
    const planId = (fd.get("planId") as string) || "starter";

    if (!name || !email || !password) {
      setError("Preencha nome, e-mail e senha.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Senha deve ter no mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, planId }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Erro ao cadastrar.");
        setLoading(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      const redirectTo = data.redirectTo ?? "/onboarding";
      window.location.href = redirectTo;
    } catch {
      setError("Erro de conexão.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Senha (mín. 8 caracteres)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Plano</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="planId" value="starter" defaultChecked className="rounded" />
            <span className="text-sm">Starter (grátis)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="planId" value="pro" className="rounded" />
            <span className="text-sm">Pro (99 R$/mês)</span>
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Cadastrando…" : "Cadastrar"}
      </button>
    </form>
  );
}
