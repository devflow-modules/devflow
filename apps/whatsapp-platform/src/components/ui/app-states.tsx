import type { ReactNode } from "react";
import { buttonClassName } from "./button";

type LoadingProps = {
  message?: string;
  className?: string;
};

export function StateLoading({ message = "A carregar…", className = "" }: LoadingProps) {
  return (
    <div
      className={`flex min-h-[12rem] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100/90 bg-white px-8 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-slate-100 border-t-[var(--df-brand-600)]"
        aria-hidden
      />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

type ErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function StateError({
  title = "Algo correu mal",
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  className = "",
}: ErrorProps) {
  return (
    <div
      className={`rounded-2xl border border-red-100 bg-red-50/50 px-6 py-8 text-center shadow-sm ${className}`.trim()}
      role="alert"
    >
      <p className="text-sm font-semibold text-red-950">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-red-800/90">{message}</p>
      {onRetry ? (
        <button type="button" className={`${buttonClassName("secondary")} mt-6`} onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

type EmptyProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function StateEmpty({ title, description, action, className = "" }: EmptyProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200/70 bg-slate-50/40 px-6 py-12 text-center ${className}`.trim()}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{description}</p>
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}
