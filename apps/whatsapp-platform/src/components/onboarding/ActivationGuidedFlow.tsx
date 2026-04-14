"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchInboxConversations } from "@/components/inbox/inboxFetch";
import {
  ensureFirstMessageActivationLogged,
  hasRecordedFirstReply,
  logActivationEvent,
  markInboxVisited,
} from "@/lib/activationStorage";
import { OnboardingProgress } from "./OnboardingProgress";

type TenantMe = {
  hasWhatsappPhone?: boolean;
};

async function fetchTenantMe(): Promise<TenantMe> {
  const res = await fetch("/api/tenants/me", { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar dados da conta");
  return res.json();
}

function useFirstReplyRecorded(): boolean {
  const [done, setDone] = useState(() =>
    typeof window !== "undefined" ? hasRecordedFirstReply() : false
  );
  useEffect(() => {
    setDone(hasRecordedFirstReply());
    const onUp = () => setDone(hasRecordedFirstReply());
    window.addEventListener("df-activation-update", onUp);
    return () => window.removeEventListener("df-activation-update", onUp);
  }, []);
  return done;
}

export function ActivationGuidedFlow() {
  const loggedWaRef = useRef(false);

  const { data: tenantData } = useQuery({
    queryKey: ["activation-tenant-me"],
    queryFn: fetchTenantMe,
    staleTime: 15_000,
  });

  const { data: inboxOverview } = useQuery({
    queryKey: ["activation-inbox-total"],
    queryFn: () => fetchInboxConversations(undefined, null),
    refetchInterval: 12_000,
    staleTime: 10_000,
  });

  const hasWhatsapp = Boolean(tenantData?.hasWhatsappPhone);
  const totalThreads = inboxOverview?.pagination.total ?? 0;
  const hasFirstMessage = totalThreads > 0;
  const hasFirstReply = useFirstReplyRecorded();

  useEffect(() => {
    logActivationEvent("activation_started");
  }, []);

  useEffect(() => {
    if (!hasWhatsapp || loggedWaRef.current) return;
    loggedWaRef.current = true;
    logActivationEvent("whatsapp_connected");
  }, [hasWhatsapp]);

  useEffect(() => {
    if (!hasFirstMessage) return;
    ensureFirstMessageActivationLogged(totalThreads);
  }, [hasFirstMessage, totalThreads]);

  const currentStep = useMemo((): 1 | 2 | 3 => {
    if (!hasWhatsapp) return 1;
    if (!hasFirstMessage) return 2;
    return 3;
  }, [hasWhatsapp, hasFirstMessage]);

  const allComplete = hasWhatsapp && hasFirstMessage && hasFirstReply;

  return (
    <div className="mx-auto max-w-2xl">
      <OnboardingProgress currentStep={currentStep} allComplete={allComplete} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {!allComplete && currentStep === 1 ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Conecte seu WhatsApp</h2>
            <p className="mt-2 text-sm text-slate-600">
              Para receber mensagens e atender clientes, ligue o número da sua empresa ao DevFlow.
            </p>
            <Link
              href="/dashboard/whatsapp"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--df-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
            >
              Conectar agora
            </Link>
          </>
        ) : null}

        {!allComplete && currentStep === 2 ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Teste seu número</h2>
            <p className="mt-2 text-sm text-slate-600">
              Envie uma mensagem para seu próprio número a partir do WhatsApp no telemóvel. Assim você confirma que está
              recebendo mensagens.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              Quando a mensagem aparecer na Inbox, o passo seguinte desbloqueia automaticamente.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/inbox"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                onClick={() => markInboxVisited()}
              >
                Abrir Inbox para verificar
              </Link>
            </div>
          </>
        ) : null}

        {!allComplete && currentStep === 3 ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">Responda sua primeira conversa</h2>
            <p className="mt-2 text-sm text-slate-600">
              Abra a Inbox e responda à conversa que chegou. Esse é o momento em que o seu atendimento começa.
            </p>
            <Link
              href="/inbox"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--df-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
              onClick={() => markInboxVisited()}
            >
              Abrir Inbox
            </Link>
          </>
        ) : null}

        {allComplete ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Tudo certo — seu atendimento está ativo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Você já recebeu uma mensagem e respondeu. Pode continuar na Inbox ou explorar o painel.
            </p>
            <Link
              href="/inbox"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--df-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--df-brand-700)]"
            >
              Ir para a Inbox
            </Link>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Quer configurar respostas automáticas depois?{" "}
        <Link href="/settings/ai" className="font-medium text-[var(--df-brand-600)] hover:underline">
          Ir para assistente
        </Link>
      </p>
    </div>
  );
}
