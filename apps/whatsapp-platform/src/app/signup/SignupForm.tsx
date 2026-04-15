"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { PasswordField } from "@/components/auth/PasswordField";
import { COMMERCIAL_RECOMMENDED_BADGE } from "@/modules/billing/planPresentation";
import { clientReadAffiliateRefCookie, clientSetAffiliateRefCookie } from "@/modules/affiliates/affiliateRef";

type SignupPlanId = "free" | "pro";

export function SignupForm({ affiliateRefFromUrl }: { affiliateRefFromUrl?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<SignupPlanId>("free");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!affiliateRefFromUrl?.trim()) return;
    clientSetAffiliateRefCookie(affiliateRefFromUrl.trim());
  }, [affiliateRefFromUrl]);

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
      const affiliateRef = clientReadAffiliateRefCookie();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          email: em,
          password,
          planId,
          ...(affiliateRef ? { affiliateRef } : {}),
        }),
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

  const planCardClass = (selected: boolean) =>
    `relative flex cursor-pointer rounded-xl border p-4 text-left transition-shadow focus-within:ring-2 focus-within:ring-blue-500/30 ${
      selected ? "border-blue-500 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:border-slate-300"
    }`;

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

      <fieldset disabled={loading} className="space-y-3">
        <legend className="mb-1 text-sm font-medium text-slate-700">Plano</legend>
        <div className="grid gap-3">
          <label className={planCardClass(planId === "free")}>
            <input
              type="radio"
              name="planId"
              value="free"
              checked={planId === "free"}
              onChange={() => setPlanId("free")}
              className="sr-only"
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-900">Gratuito</span>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Para testar a plataforma e ligar o primeiro canal.
              </p>
            </div>
          </label>

          <label className={planCardClass(planId === "pro")}>
            <input
              type="radio"
              name="planId"
              value="pro"
              checked={planId === "pro"}
              onChange={() => setPlanId("pro")}
              className="sr-only"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">Pro</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  {COMMERCIAL_RECOMMENDED_BADGE}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Para operar com equipe, filas e IA de atendimento.
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-1 rounded-lg bg-slate-50/90 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <p>Sem cartão no plano gratuito.</p>
          <p>Pode alterar o plano depois.</p>
        </div>

        {planId === "pro" ? (
          <p className="text-xs leading-relaxed text-slate-600">
            Após criar a conta, você poderá concluir a ativação do plano no checkout seguro (cartão).
          </p>
        ) : null}
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
