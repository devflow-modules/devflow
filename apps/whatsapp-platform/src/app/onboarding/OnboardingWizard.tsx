"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, title: "Conectar WhatsApp" },
  { id: 2, title: "Prompt base" },
  { id: 3, title: "API Key" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<{
    hasApiKey?: boolean;
    hasWhatsappPhone?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tenants/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setTenant(data);
        if (data?.hasApiKey) setStep(3);
        else if (data?.hasWhatsappPhone) setStep(2);
      })
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-center text-slate-600">Carregando…</p>;
  }

  if (!tenant) {
    return (
      <div className="text-center">
        <p className="text-red-600">Sessão inválida. Faça login novamente.</p>
        <a href="/login" className="mt-2 inline-block text-blue-600 underline">Ir para login</a>
      </div>
    );
  }

  const handleStep1 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const phoneNumberId = (fd.get("phoneNumberId") as string)?.trim();
    const displayPhoneNumber = (fd.get("displayPhoneNumber") as string)?.trim();
    const accessToken = (fd.get("accessToken") as string)?.trim();
    if (!phoneNumberId || !accessToken) {
      setError("Preencha Phone Number ID e Access Token.");
      return;
    }
    const res = await fetch("/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId, displayPhoneNumber, accessToken }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erro ao salvar.");
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const defaultPrompt = (fd.get("defaultPrompt") as string)?.trim();
    const res = await fetch("/api/tenants/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ defaultPrompt: defaultPrompt || undefined, systemPrompt: defaultPrompt || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Erro ao salvar.");
      return;
    }
    setStep(3);
  };

  const handleGenerateApiKey = async () => {
    setError(null);
    const res = await fetch("/api/tenants/me/api-key", { method: "POST", credentials: "include" });
    if (!res.ok) {
      setError("Erro ao gerar chave.");
      return;
    }
    const data = await res.json();
    setApiKey(data.apiKey);
    setTenant((p) => (p ? { ...p, hasApiKey: true } : p));
  };

  const handleFinish = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 rounded py-2 text-center text-sm ${
              step >= s.id ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
            }`}
          >
            {s.id}. {s.title}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <p className="text-sm text-slate-600">
            Obtenha o Phone Number ID e o Access Token no{" "}
            <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Meta Business Suite
            </a>
            .
          </p>
          <div>
            <label htmlFor="phoneNumberId" className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number ID
            </label>
            <input
              id="phoneNumberId"
              name="phoneNumberId"
              type="text"
              placeholder="Ex: 123456789"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="displayPhoneNumber" className="block text-sm font-medium text-slate-700 mb-1">
              Número exibido (opcional)
            </label>
            <input
              id="displayPhoneNumber"
              name="displayPhoneNumber"
              type="text"
              placeholder="+55 11 99999-9999"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-slate-700 mb-1">
              Access Token
            </label>
            <input
              id="accessToken"
              name="accessToken"
              type="password"
              placeholder="EAAxxxx..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Salvar e continuar
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <p className="text-sm text-slate-600">
            Defina o prompt base que a IA usará para responder aos clientes — cada conta define o tom, a marca e as regras do próprio negócio.
          </p>
          <div>
            <label htmlFor="defaultPrompt" className="block text-sm font-medium text-slate-700 mb-1">
              Prompt base
            </label>
            <textarea
              id="defaultPrompt"
              name="defaultPrompt"
              rows={8}
              placeholder="Ex.: quem é o assistente (nome da empresa), o que vende ou oferece, tom de voz, o que pode ou não prometer, e como encaminhar para um humano."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Salvar e continuar
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Gere uma API Key para integrar o webhook e as APIs. Guarde em local seguro; ela não será exibida novamente.
          </p>
          {apiKey ? (
            <div className="rounded-md bg-slate-100 p-4 font-mono text-sm break-all">{apiKey}</div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateApiKey}
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Gerar API Key
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleFinish}
            className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Ir para o Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
