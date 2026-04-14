"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import { WhatsappConnectErrorPanel } from "../WhatsappConnectErrorPanel";
import {
  logOnboardingUxStage,
  mapOnboardingErrorToKind,
  type OnboardingErrorKind,
} from "../whatsappConnectUx";

function WhatsappCallbackInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const paramsInvalid = !code || !state;

  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    paramsInvalid ? "error" : "loading"
  );
  const [errorKind, setErrorKind] = useState<OnboardingErrorKind | null>(() =>
    paramsInvalid ? "generic" : null
  );

  useEffect(() => {
    if (paramsInvalid || !code || !state) {
      logOnboardingUxStage("onboarding_error", { step: "callback_params", kind: "generic" });
      return;
    }

    fetchProtected("/api/whatsapp/onboard/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { message?: string };
          error?: string;
        };
        if (res.ok && json.success) {
          setStatus("success");
          window.location.href = "/dashboard/whatsapp?success=1";
        } else {
          const raw = json.error ?? protectedApiUserMessage(res.status, json);
          const kind = mapOnboardingErrorToKind(raw, res.status);
          logOnboardingUxStage("onboarding_error", { kind, step: "callback_post", source: "callback" });
          setErrorKind(kind);
          setStatus("error");
        }
      })
      .catch(() => {
        logOnboardingUxStage("onboarding_error", { kind: "generic", step: "callback_network" });
        setErrorKind("generic");
        setStatus("error");
      });
  }, [code, state, paramsInvalid]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        {status === "loading" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--df-brand-600)]"
              aria-hidden
            />
            <p className="mt-4 text-sm text-slate-600">Conectando seu número…</p>
          </div>
        )}
        {status === "success" && (
          <p className="text-center text-sm text-emerald-700">A redirecionar…</p>
        )}
        {status === "error" && errorKind ? (
          <div className="space-y-4">
            <WhatsappConnectErrorPanel
              kind={errorKind}
              onRetry={() => {
                window.location.href = "/dashboard/whatsapp";
              }}
              retryLabel="Voltar e tentar de novo"
            />
            <p className="text-center">
              <Link href="/dashboard/whatsapp" className="text-sm font-medium text-[var(--df-brand-700)] underline">
                Voltar ao WhatsApp
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function WhatsappCallbackPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-slate-600">Carregando…</p>}>
      <WhatsappCallbackInner />
    </Suspense>
  );
}
