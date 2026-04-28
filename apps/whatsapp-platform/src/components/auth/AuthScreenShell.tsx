import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  /** Ações secundárias (ex.: voltar ao login) — abaixo do formulário */
  footer?: ReactNode;
};

/**
 * Hierarquia visual consistente nas páginas de autenticação.
 */
export function AuthScreenShell({ eyebrow, title, description, children, footer }: Props) {
  return (
    <main className="df-page flex h-full min-h-0 flex-col overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
        <div className="df-surface-elevated w-full rounded-2xl border df-border-brand p-8 shadow-sm">
          {eyebrow ? (
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--df-text-secondary)]">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`text-center text-2xl font-semibold tracking-tight text-[var(--df-text-primary)] ${eyebrow ? "mt-2" : ""}`}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-center text-sm leading-relaxed text-[var(--df-text-secondary)]">{description}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 border-t df-border-brand pt-6">{footer}</div> : null}
        </div>
      </div>
    </main>
  );
}
