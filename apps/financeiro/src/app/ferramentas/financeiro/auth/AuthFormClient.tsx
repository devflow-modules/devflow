"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sanitizeFinanceiroNextPath } from "@/lib/auth/safeFinanceiroNextPath";
import { trackSignupStartedClient } from "@/analytics/growth/trackClient";
import { authEmailSchema, authPasswordSchema } from "@/modules/financeiro/schemas";
import { createClient } from "@/modules/financeiro/lib/supabase/client";
import { cn } from "@/modules/financeiro/lib/cn";
import {
  cardStaticLight,
  focusRingLight,
} from "@/modules/financeiro/lib/primitives";
import { FINANCEIRO_AUTH_PATH, FINANCEIRO_BASE_PATH } from "@devflow/financeiro-routes";

export function AuthFormClient() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "signup">("password");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get("mode");
    if (param === "signup") setMode("signup");
    if (param === "password") setMode("password");
  }, [searchParams]);

  const canSubmit = useMemo(() => {
    if (!email) return false;
    return password.length > 0;
  }, [email, password.length]);

  const authOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://devflowlabs.com.br");

  const nextParam = searchParams.get("next");
  const nextSafe = useMemo(() => sanitizeFinanceiroNextPath(nextParam), [nextParam]);
  const callbackQuery = nextSafe ? `?next=${encodeURIComponent(nextSafe)}` : "";
  const callbackUrl = `${authOrigin}${FINANCEIRO_AUTH_PATH}/callback${callbackQuery}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const supabase = createClient();
      const parsedEmail = authEmailSchema.parse(email);
      const parsedPassword = authPasswordSchema.parse(password);

      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail,
          password: parsedPassword,
        });
        if (error) throw error;
        window.location.href = `${FINANCEIRO_AUTH_PATH}/callback${callbackQuery}`;
        return;
      }

      trackSignupStartedClient();
      const { error } = await supabase.auth.signUp({
        email: parsedEmail,
        password: parsedPassword,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage(
        "Conta criada. Verifique seu e-mail para confirmar o acesso (se necessário) e volte."
      );
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message ?? "Não foi possível autenticar");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className={cn(cardStaticLight, "w-full max-w-md space-y-8 p-8")}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Controle financeiro
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
              Entrar
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse com e-mail/senha ou Google.
            </p>
          </div>

          <button
            type="button"
            className={cn(
              "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-foreground transition hover:bg-muted",
              focusRingLight
            )}
            onClick={async () => {
              setStatus("loading");
              setMessage(null);
              try {
                const supabase = createClient();
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: callbackUrl },
                });
                if (error) throw error;
              } catch (err) {
                setStatus("error");
                setMessage(
                  (err as Error).message ?? "Não foi possível iniciar login com Google"
                );
              }
            }}
          >
            Continuar com Google
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={cn(
                "rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition",
                focusRingLight,
                mode === "password"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              Senha
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={cn(
                "rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                focusRingLight,
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              Cadastro
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="text-sm font-semibold text-foreground">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                className={cn(
                  "mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground",
                  focusRingLight
                )}
              />
            </label>

            <label className="text-sm font-semibold text-foreground">
              Senha
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={cn(
                  "mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground",
                  focusRingLight
                )}
              />
            </label>

            <button
              type="submit"
              className={cn(
                "w-full rounded-2xl bg-primary px-4 py-3 font-semibold uppercase tracking-[0.25em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
                focusRingLight
              )}
              aria-busy={status === "loading"}
              disabled={status === "loading" || !canSubmit}
            >
              {status === "loading"
                ? "Processando..."
                : mode === "password"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          {mode === "password" ? (
            <p className="text-sm text-muted-foreground">
              <Link
                href={`${FINANCEIRO_AUTH_PATH}/reset`}
                className="text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </p>
          ) : null}

          {message ? (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${status === "error" ? "text-rose-600" : "text-emerald-700"}`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        <Link href={FINANCEIRO_BASE_PATH} className="text-primary hover:underline">
          Voltar ao controle financeiro
        </Link>
      </footer>
    </div>
  );
}
