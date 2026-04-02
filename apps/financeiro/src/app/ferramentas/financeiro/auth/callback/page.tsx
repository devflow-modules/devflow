"use client";

import Link from "next/link";
import { createClient } from "@/modules/financeiro/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackSignupCompletedClient } from "@/analytics/growth/trackClient";
import {
  FINANCEIRO_AUTH_PATH,
  FINANCEIRO_BASE_PATH,
  FINANCEIRO_DASHBOARD_PATH,
} from "@devflow/financeiro-routes";
import { sanitizeFinanceiroNextPath } from "@/lib/auth/safeFinanceiroNextPath";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const run = async () => {
      setErrorMessage(null);
      setStatus("loading");
      await new Promise((r) => setTimeout(r, 300));
      const url = new URL(window.location.href);
      const nextAfterLogin = sanitizeFinanceiroNextPath(url.searchParams.get("next"));
      const code = url.searchParams.get("code");
      const hash = url.hash?.slice(1);

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession:", error);
          setStatus("error");
          setErrorMessage("Não foi possível confirmar o login. Tente novamente.");
          return;
        }
      }

      if (hash && hash.includes("access_token") && !code) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error("[auth/callback] setSession from hash:", error);
            setStatus("error");
            setErrorMessage("Não foi possível confirmar o login. Tente novamente.");
            return;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace(FINANCEIRO_AUTH_PATH);
        return;
      }

      setStatus("redirecting");
      try {
        const res = await fetch("/api/me");
        const payload = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(
            payload?.error?.message ?? "Não foi possível carregar sua conta. Tente novamente."
          );
          return;
        }
        const userId = payload.data?.id;
        if (userId) {
          trackSignupCompletedClient(userId);
        }
        const households = payload.data?.households ?? [];
        if (households.length === 0) {
          router.replace(`${FINANCEIRO_BASE_PATH}/onboarding`);
        } else {
          router.replace(nextAfterLogin ?? FINANCEIRO_DASHBOARD_PATH);
        }
      } catch (err) {
        console.error("[auth/callback] fetch /api/me:", err);
        setStatus("error");
        setErrorMessage("Erro de conexão. Tente novamente.");
      }
    };

    run();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-sm text-foreground" role="alert">
          {errorMessage}
        </p>
        <Link
          href={FINANCEIRO_AUTH_PATH}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Tentar novamente
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">
        {status === "loading" ? "Confirmando sessão..." : "Redirecionando..."}
      </p>
    </div>
  );
}
