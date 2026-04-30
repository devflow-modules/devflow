"use client";

import { cn } from "@/modules/financeiro/lib/cn";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { CONTEXT_LABELS } from "@/modules/financeiro/schemas";
import { Button } from "@/components/ui/button";

const CONTEXT_COLORS: Record<FinancialContext | "ALL", string> = {
  ALL: "bg-muted df-text-secondary hover:bg-muted data-[active=true]:bg-muted data-[active=true]:text-white",
  PERSONAL: "bg-blue-50 text-blue-700 hover:bg-blue-100 data-[active=true]:bg-blue-600 data-[active=true]:text-white",
  BUSINESS: "bg-violet-50 text-violet-700 hover:bg-violet-100 data-[active=true]:bg-violet-600 data-[active=true]:text-white",
  SHARED: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 data-[active=true]:bg-emerald-600 data-[active=true]:text-white",
};

const CONTEXT_ICONS: Record<FinancialContext | "ALL", string> = {
  ALL: "◉",
  PERSONAL: "👤",
  BUSINESS: "🏢",
  SHARED: "🤝",
};

export type ContextFilter = FinancialContext | "ALL";

interface ContextSelectorProps {
  value: ContextFilter;
  onChange: (value: ContextFilter) => void;
  showAll?: boolean;
  className?: string;
}

export function ContextSelector({ value, onChange, showAll = true, className }: ContextSelectorProps) {
  const options: Array<{ key: ContextFilter; label: string }> = [
    ...(showAll ? [{ key: "ALL" as const, label: "Tudo" }] : []),
    { key: "PERSONAL", label: CONTEXT_LABELS.PERSONAL },
    { key: "BUSINESS", label: CONTEXT_LABELS.BUSINESS },
    { key: "SHARED", label: CONTEXT_LABELS.SHARED },
  ];

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map(({ key, label }) => (
        <Button variant="secondary"
          key={key}
          type="button"
          data-active={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
            CONTEXT_COLORS[key]
          )}
        >
          <span className="text-[10px]">{CONTEXT_ICONS[key]}</span>
          {label}
        </Button>
      ))}
    </div>
  );
}

interface ContextSelectFieldProps {
  value: FinancialContext;
  onChange: (value: FinancialContext) => void;
  label?: string;
  className?: string;
}

export function ContextSelectField({ value, onChange, label = "Contexto", className }: ContextSelectFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-xs font-medium df-text-secondary">{label}</label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FinancialContext)}
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm df-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="PERSONAL">👤 Pessoal</option>
        <option value="BUSINESS">🏢 Empresa (PJ)</option>
        <option value="SHARED">🤝 Estúdio / Sociedade</option>
      </select>
    </div>
  );
}

interface ContextBadgeProps {
  context: FinancialContext;
  className?: string;
}

export function ContextBadge({ context, className }: ContextBadgeProps) {
  const bgMap: Record<FinancialContext, string> = {
    PERSONAL: "bg-blue-50 text-blue-600 border-blue-100",
    BUSINESS: "bg-violet-50 text-violet-600 border-violet-100",
    SHARED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        bgMap[context],
        className
      )}
    >
      {CONTEXT_ICONS[context]}
      {CONTEXT_LABELS[context]}
    </span>
  );
}
