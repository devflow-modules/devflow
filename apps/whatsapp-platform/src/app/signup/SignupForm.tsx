"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { mapAuthHttpError } from "@/lib/auth-client-errors";
import { PasswordField } from "@/components/auth/PasswordField";
import { COMMERCIAL_RECOMMENDED_BADGE } from "@/modules/billing/planPresentation";
import { isWhiteLabelMode } from "@/lib/productMode";
import { clientReadAffiliateRefCookie, clientSetAffiliateRefCookie } from "@/modules/affiliates/affiliateRef";
import { resolveSignupClientNavigationHref } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";

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
          planId: isWhiteLabelMode() ? "free" : planId,
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
        message?: string;
        requiresManualActivation?: boolean;
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

      window.location.href = resolveSignupClientNavigationHref(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  const planCardClass = (selected: boolean) =>
    `relative flex cursor-pointer rounded-xl border p-4 text-left transition-shadow focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--df-brand-500)_35%,transparent)] ${
      selected
        ? "border-[var(--df-brand-500)] bg-[color-mix(in_srgb,var(--df-brand-50)_55%,transparent)] shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--df-brand-500)_25%,transparent)]"
        : "border-border bg-card hover:df-border-dark"
    }`;

  const whiteLabel = isWhiteLabelMode();

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading} noValidate>
      <div>
        <label htmlFor="signup-name" className="mb-1 block text-sm font-medium df-text-secondary">
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
          className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)] disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm font-medium df-text-secondary">
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
          className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)] disabled:opacity-60"
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

      {whiteLabel ? (
        <div className="rounded-xl border border-border bg-muted/60/80 px-4 py-3 text-sm df-text-secondary">
          <p className="font-medium df-text-primary">Ativação guiada</p>
          <p className="mt-1 text-xs leading-relaxed df-text-secondary">
            Criamos o espaço da sua operação. Na sequência, configure o canal e o atendimento — sem checkout nem
            pagamento nesta página.
          </p>
        </div>
      ) : (
        <fieldset disabled={loading} className="space-y-3">
          <legend className="mb-1 text-sm font-medium df-text-secondary">Plano</legend>
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
                <span className="text-sm font-semibold df-text-primary">Avaliação guiada</span>
                <p className="mt-1 text-xs leading-relaxed df-text-secondary">
                  Demonstração da plataforma com limites claros — operação completa com implantação.
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
                  <span className="text-sm font-semibold df-text-primary">Pro</span>
                  <span className="df-badge-warning inline-flex !normal-case">{COMMERCIAL_RECOMMENDED_BADGE}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed df-text-secondary">
                  Para operar com equipe, filas e IA de atendimento.
                </p>
              </div>
            </label>
          </div>

          <div className="space-y-1 rounded-lg bg-muted/60/90 px-3 py-2.5 text-xs leading-relaxed df-text-secondary">
            <p>Sem cartão na fase de avaliação guiada.</p>
            <p>Pode alinhar a operação completa depois com a equipa.</p>
          </div>

          {planId === "pro" ? (
            <p className="text-xs leading-relaxed df-text-secondary">
              Após criar a conta, você poderá concluir a ativação do plano no checkout seguro (cartão).
            </p>
          ) : null}
        </fieldset>
      )}

      {error && (
        <div role="alert" className="df-feedback-error !rounded-md">
          {error}
        </div>
      )}
      <Button variant="primary"
        type="submit"
        disabled={loading}
        className="w-full rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50"
      >
        {loading ? "A processar…" : whiteLabel ? "Solicitar acesso" : "Criar conta"}
      </Button>
      <p className="text-center text-sm df-text-secondary">
        <Link href="/login" className="df-text-info font-medium hover:opacity-90">
          Já tenho conta — entrar
        </Link>
      </p>
    </form>
  );
}
