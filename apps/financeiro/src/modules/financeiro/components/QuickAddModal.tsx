"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/modules/financeiro/lib/cn";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { toDateOnly } from "@/lib/dates";

const STORAGE_KEY = "financeiro.quickadd.last";

type LastUsed = {
  category?: string;
  sourceId?: string;
  context?: FinancialContext;
  type?: "expense" | "income";
};

function loadLastUsed(): LastUsed {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastUsed) : {};
  } catch { return {}; }
}

function saveLastUsed(data: LastUsed) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

type Source = { id: string; name: string; sourceType: "PJ" | "PF" };

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(toDateOnly(new Date()));
  const [sourceId, setSourceId] = useState("");
  const [context, setContext] = useState<FinancialContext>("PERSONAL");
  const [isPaid, setIsPaid] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const last = loadLastUsed();
    if (last.type) setType(last.type);
    if (last.category) setCategory(last.category);
    if (last.sourceId) setSourceId(last.sourceId);
    if (last.context) setContext(last.context);
    setDate(toDateOnly(new Date()));
    setAmount("");

    fetch("/api/sources")
      .then((r) => r.json())
      .then((p) => setSources(p.data ?? []))
      .catch(() => {});

    setTimeout(() => amountRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { toast.error("Informe o valor"); return; }

    setSubmitting(true);
    try {
      if (type === "expense") {
        if (!category.trim()) { toast.error("Informe a categoria"); setSubmitting(false); return; }
        const body = {
          category,
          amount: Number(amount),
          dueDate: date,
          sourceId: sourceId || undefined,
          context,
          status: isPaid ? "PAID" : "PENDING",
          ...(isPaid ? { paidAt: date, paidAmount: Number(amount) } : {}),
        };
        const res = await fetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const payload = await res.json();
        if (payload.success) {
          toast.success(`Despesa "${category}" cadastrada`);
          saveLastUsed({ type, category, sourceId, context });
          onClose();
        } else {
          toast.error(payload.error?.message ?? "Erro ao cadastrar");
        }
      } else {
        const body = {
          amount: Number(amount),
          receivedAt: date,
          sourceId: sourceId || undefined,
          context,
          status: "RECEIVED",
        };
        const res = await fetch("/api/incomes", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });
        const payload = await res.json();
        if (payload.success) {
          toast.success("Receita cadastrada");
          saveLastUsed({ type, sourceId, context });
          onClose();
        } else {
          toast.error(payload.error?.message ?? "Erro ao cadastrar");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                  type === t
                    ? t === "expense"
                      ? "bg-red-500 text-white shadow-sm"
                      : "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                )}
              >
                {t === "expense" ? "💸 Despesa" : "💰 Receita"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {/* Valor grande em destaque */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">R$</span>
            <input
              ref={amountRef}
              type="number"
              min={0}
              step="0.01"
              placeholder="0,00"
              required
              className="w-full rounded-xl border-2 border-indigo-300 bg-white py-3 pl-10 pr-3 text-xl font-bold text-slate-800 outline-none focus:border-indigo-500 dark:bg-slate-900 dark:text-slate-100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {type === "expense" && (
            <input
              type="text"
              placeholder="Categoria (ex.: Aluguel, Alimentação...)"
              className={fieldCls}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <select
              className={fieldCls}
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">Fonte</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              type="date"
              className={fieldCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <select
            className={fieldCls}
            value={context}
            onChange={(e) => setContext(e.target.value as FinancialContext)}
          >
            <option value="PERSONAL">👤 Pessoal</option>
            <option value="BUSINESS">🏢 Empresa (PJ)</option>
            <option value="SHARED">🤝 Estúdio / Sociedade</option>
          </select>

          {type === "expense" && (
            <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="rounded"
              />
              Já foi pago
            </label>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-bold text-white transition-all",
              type === "expense"
                ? "bg-red-500 hover:bg-red-600 active:scale-95"
                : "bg-emerald-500 hover:bg-emerald-600 active:scale-95",
              submitting && "opacity-60 cursor-not-allowed"
            )}
          >
            {submitting ? "Salvando..." : type === "expense" ? "Lançar despesa" : "Lançar receita"}
          </button>

          <p className="text-center text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 px-1 py-0.5 text-[9px] font-mono">Esc</kbd> para fechar
          </p>
        </form>
      </div>
    </div>
  );
}
