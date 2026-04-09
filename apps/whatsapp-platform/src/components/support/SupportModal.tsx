"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchProtected } from "@/lib/protected-fetch";
import { buttonClassName } from "@/components/ui/button";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_CATEGORIES,
  type SupportCategory,
} from "@/modules/support/supportTypes";

type Step = "form" | "success" | "error";

export function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname() ?? "/";
  const [category, setCategory] = useState<SupportCategory>("question");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [sending, setSending] = useState(false);
  const [debugIdDisplay, setDebugIdDisplay] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setDescription("");
      setCategory("question");
      setSending(false);
      setDebugIdDisplay("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = description.trim();
    if (!text || sending) return;
    setSending(true);
    setStep("form");
    try {
      const res = await fetchProtected("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: text,
          pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        debugIdDisplay?: string;
        error?: string;
      };
      if (!res.ok) {
        setStep("error");
        return;
      }
      setDebugIdDisplay(data.debugIdDisplay ?? "");
      setStep("success");
    } catch {
      setStep("error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl"
      >
        {step === "success" ? (
          <div className="space-y-4">
            <h2 id="support-modal-title" className="text-lg font-semibold text-slate-900">
              Pedido enviado com sucesso ✔
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">Nossa equipe irá analisar.</p>
            {debugIdDisplay ? (
              <p className="rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 font-mono text-sm text-emerald-950">
                Se precisar, mencione este ID: <span className="font-semibold">{debugIdDisplay}</span>
              </p>
            ) : null}
            <button type="button" className={buttonClassName("primary")} onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : step === "error" ? (
          <div className="space-y-4">
            <h2 id="support-modal-title" className="text-lg font-semibold text-slate-900">
              Não conseguimos enviar agora.
            </h2>
            <p className="text-sm text-slate-600">Tente novamente em instantes.</p>
            <div className="flex gap-2">
              <button type="button" className={buttonClassName("primary")} onClick={() => setStep("form")}>
                Tentar de novo
              </button>
              <button type="button" className={buttonClassName("ghost")} onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <h2 id="support-modal-title" className="text-lg font-semibold text-slate-900">
                Precisa de ajuda?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Descreva o problema — enviamos contexto técnico seguro (sem palavras-passe nem tokens) para acelerar o
                suporte.
              </p>
            </div>

            <div>
              <label htmlFor="support-category" className="block text-sm font-medium text-slate-700">
                Tipo do problema
              </label>
              <select
                id="support-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportCategory)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-[var(--df-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/25"
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SUPPORT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="support-desc" className="block text-sm font-medium text-slate-700">
                O que aconteceu?
              </label>
              <textarea
                id="support-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
                maxLength={8000}
                placeholder="Descreva o que aconteceu..."
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[var(--df-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--df-brand-500)]/25"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={sending} className={buttonClassName("primary")}>
                {sending ? "A enviar…" : "Enviar pedido"}
              </button>
              <button type="button" className={buttonClassName("ghost")} onClick={onClose} disabled={sending}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
