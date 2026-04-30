import type { ReactNode } from "react";
import { buttonClassName } from "./button";
import { Button } from "@/components/ui/button";

type LoadingProps = {
  message?: string;
  className?: string;
};

export function StateLoading({ message = "A carregar…", className = "" }: LoadingProps) {
  return (
    <div className={`df-state-loading ${className}`.trim()} role="status" aria-live="polite">
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--df-border-subtle)] border-t-[var(--df-brand-600)]"
        aria-hidden
      />
      <p className="df-text-muted">{message}</p>
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
      className={`rounded-2xl border px-6 py-8 text-center shadow-sm ${className}`.trim()}
      style={{ borderColor: "var(--df-danger-border)", background: "var(--df-danger-bg)" }}
      role="alert"
    >
      <p className="text-sm font-semibold text-[var(--df-danger-text)]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--df-danger-text)]">{message}</p>
      {onRetry ? (
        <Button variant="secondary" type="button" className={`${buttonClassName("secondary")} mt-6`} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

type EmptyProps = {
  title: string;
  description: string;
  /** Próximo passo sugerido (tom discreto, sem parecer erro). */
  nextStep?: string;
  action?: ReactNode;
  className?: string;
};

export function StateEmpty({ title, description, nextStep, action, className = "" }: EmptyProps) {
  return (
    <div className={`df-state-empty ${className}`.trim()}>
      <p className="text-sm font-semibold text-[var(--df-text-primary)]">{title}</p>
      <p className="df-text-muted mx-auto mt-2 max-w-md">{description}</p>
      {nextStep ? (
        <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-[var(--df-text-secondary)]">{nextStep}</p>
      ) : null}
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}
