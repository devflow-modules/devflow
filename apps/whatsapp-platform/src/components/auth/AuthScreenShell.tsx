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
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50/90 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm">
        {eyebrow ? (
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className={`text-center text-2xl font-semibold tracking-tight text-slate-900 ${eyebrow ? "mt-2" : ""}`}>
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 border-t border-slate-100 pt-6">{footer}</div> : null}
      </div>
    </main>
  );
}
