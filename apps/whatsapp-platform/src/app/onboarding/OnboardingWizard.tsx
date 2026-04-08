"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProtected, protectedApiUserMessage } from "@/lib/protected-fetch";
import {
  GUIDED_OBJECTIVES,
  GUIDED_SEGMENTS,
  GUIDED_TONES,
  buildGuidedAssistantPrompts,
  type GuidedObjectiveId,
  type GuidedSegmentId,
  type GuidedToneId,
} from "@/modules/onboarding/guidedAssistantPrompt";

const STEPS = [
  { id: 1, title: "O seu assistente" },
  { id: 2, title: "WhatsApp" },
  { id: 3, title: "Pronto" },
] as const;

type TenantMe = {
  hasWhatsappPhone?: boolean;
  defaultPrompt?: string | null;
  systemPrompt?: string | null;
};

function hasPromptConfigured(t: TenantMe | null): boolean {
  if (!t) return false;
  return Boolean((t.defaultPrompt || t.systemPrompt || "").trim());
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<TenantMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segment, setSegment] = useState<GuidedSegmentId>("other");
  const [objective, setObjective] = useState<GuidedObjectiveId>("other");
  const [tone, setTone] = useState<GuidedToneId>("friendly");

  const [checklistMeta, setChecklistMeta] = useState(false);
  const [checklistWebhook, setChecklistWebhook] = useState(false);

  useEffect(() => {
    fetchProtected("/api/tenants/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TenantMe | null) => {
        setTenant(data);
        const promptOk = hasPromptConfigured(data);
        const phoneOk = Boolean(data?.hasWhatsappPhone);
        if (promptOk && phoneOk) setStep(3);
        else if (promptOk) setStep(2);
        else setStep(1);
      })
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center text-slate-600">A carregar a sua conta…</p>;
  }

  if (!tenant) {
    return (
      <div className="text-center">
        <p className="text-red-600">Sessão inválida. Inicie sessão novamente.</p>
        <a href="/login" className="mt-2 inline-block text-[var(--df-brand-700)] underline">
          Ir para o login
        </a>
      </div>
    );
  }

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { defaultPrompt, systemPrompt } = buildGuidedAssistantPrompts({ segment, objective, tone });
    const res = await fetchProtected("/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultPrompt, systemPrompt }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(protectedApiUserMessage(res.status, data));
      return;
    }
    setTenant((p) => (p ? { ...p, defaultPrompt, systemPrompt } : p));
    setStep(2);
  };

  const handleWhatsAppSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const phoneNumberId = (fd.get("phoneNumberId") as string)?.trim();
    const displayPhoneNumber = (fd.get("displayPhoneNumber") as string)?.trim();
    const accessToken = (fd.get("accessToken") as string)?.trim();
    if (!phoneNumberId || !accessToken) {
      setError("Preencha o Phone Number ID e o Access Token.");
      return;
    }
    const res = await fetchProtected("/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId, displayPhoneNumber, accessToken }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(protectedApiUserMessage(res.status, data));
      return;
    }
    setTenant((p) => (p ? { ...p, hasWhatsappPhone: true } : p));
    setStep(3);
  };

  const handleFinish = () => {
    router.push("/dashboard");
    router.refresh();
  };

  const fieldClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-600)]";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-medium sm:text-sm ${
              step >= s.id
                ? "bg-[var(--df-brand-50)] text-[var(--df-brand-900)]"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {s.id}. {s.title}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Vamos configurar o seu assistente</h2>
            <p className="mt-1 text-sm text-slate-600">
              Responda em três escolhas — geramos automaticamente as instruções iniciais. Pode afinar depois em{" "}
              <Link href="/settings#instrucoes-conta" className="font-medium text-[var(--df-brand-700)] underline">
                Configurações
              </Link>
              .
            </p>
          </div>

          <form onSubmit={handleAssistantSubmit} className="space-y-4">
            <div>
              <label htmlFor="segment" className={labelClass}>
                Tipo de negócio
              </label>
              <select
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value as GuidedSegmentId)}
                className={fieldClass}
              >
                {GUIDED_SEGMENTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="objective" className={labelClass}>
                Principal objetivo no WhatsApp
              </label>
              <select
                id="objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value as GuidedObjectiveId)}
                className={fieldClass}
              >
                {GUIDED_OBJECTIVES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tone" className={labelClass}>
                Tom de comunicação
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as GuidedToneId)}
                className={fieldClass}
              >
                {GUIDED_TONES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--df-brand-600)] px-3 py-2.5 text-sm font-medium text-white hover:bg-[var(--df-brand-700)]"
            >
              Continuar
            </button>
          </form>

          <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Prefere escrever tudo à mão?{" "}
            <Link href="/settings#instrucoes-conta" className="text-[var(--df-brand-700)] underline">
              Modo avançado nas configurações
            </Link>
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ligue o WhatsApp Business</h2>
            <p className="mt-1 text-sm text-slate-600">
              Os dados abaixo vêm da Meta (
              <a
                href="https://business.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--df-brand-700)] underline"
              >
                Meta Business Suite
              </a>
              ). Guarde o token em local seguro.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Antes de colar</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <input
                  type="checkbox"
                  checked={checklistMeta}
                  onChange={(e) => setChecklistMeta(e.target.checked)}
                  className="mt-1"
                />
                <span>Tenho acesso de administrador à app WhatsApp no Meta Business.</span>
              </li>
              <li className="flex gap-2">
                <input
                  type="checkbox"
                  checked={checklistWebhook}
                  onChange={(e) => setChecklistWebhook(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Sei que o webhook público e a verificação são configurados no painel Meta (pode fazer-se depois em
                  WhatsApp no menu lateral).
                </span>
              </li>
            </ul>
          </div>

          <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
            <div>
              <label htmlFor="phoneNumberId" className={labelClass}>
                Phone Number ID
              </label>
              <input id="phoneNumberId" name="phoneNumberId" type="text" placeholder="Ex.: 123456789" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="displayPhoneNumber" className={labelClass}>
                Número exibido (opcional)
              </label>
              <input
                id="displayPhoneNumber"
                name="displayPhoneNumber"
                type="text"
                placeholder="+351 912 345 678"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="accessToken" className={labelClass}>
                Access Token
              </label>
              <input
                id="accessToken"
                name="accessToken"
                type="password"
                placeholder="EAAx…"
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-[var(--df-brand-600)] px-3 py-2.5 text-sm font-medium text-white hover:bg-[var(--df-brand-700)]"
            >
              Guardar e concluir ligação
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            Precisa de ajuda com a Meta ou com a implantação?{" "}
            <a href="mailto:suporte@devflowlabs.com.br" className="text-[var(--df-brand-700)] underline">
              Contacte o suporte
            </a>
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Está pronto para começar</h2>
            <p className="mt-2 text-sm text-slate-600">
              O assistente tem instruções iniciais e a linha WhatsApp está associada à conta. Pode enviar uma mensagem de
              teste e abrir a Inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="w-full rounded-md bg-[var(--df-brand-600)] px-3 py-2.5 text-sm font-medium text-white hover:bg-[var(--df-brand-700)]"
          >
            Ir para o painel
          </button>
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-left text-sm text-slate-600">
            <p className="font-medium text-slate-800">Opcional — integrações técnicas</p>
            <p>
              Chave de API para desenvolvimento e integrações:{" "}
              <Link href="/settings/developer" className="text-[var(--df-brand-700)] underline">
                API e integrações
              </Link>{" "}
              (apenas administradores).
            </p>
            <p>
              Motor de IA (modelo, temperatura):{" "}
              <Link href="/settings/ai" className="text-[var(--df-brand-700)] underline">
                IA de atendimento
              </Link>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
