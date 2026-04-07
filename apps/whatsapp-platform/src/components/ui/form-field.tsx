import type { ReactNode } from "react";

export const fieldControlBase =
  "rounded-xl border border-slate-100 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-[var(--df-brand-500)]/35 focus:bg-white focus:ring-2 focus:ring-[var(--df-brand-500)]/15 disabled:cursor-not-allowed disabled:opacity-50";

export const fieldInputClassName = `w-full ${fieldControlBase}`;

export const fieldSelectClassName = `w-full ${fieldControlBase}`;

export const fieldTextareaClassName = `w-full min-h-[7.5rem] resize-y ${fieldControlBase}`;

export const fieldControlCompact =
  "rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-[var(--df-brand-500)]/35 focus:ring-2 focus:ring-[var(--df-brand-500)]/15 disabled:opacity-50";

type LabelProps = {
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
  className?: string;
};

export function FieldLabel({ htmlFor, children, optional, className = "" }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-2 block text-[13px] font-medium text-slate-800 ${className}`.trim()}
    >
      {children}
      {optional ? <span className="ml-1.5 font-normal text-slate-400">Opcional</span> : null}
    </label>
  );
}

export function FieldHelp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-2 text-xs leading-relaxed text-slate-500 ${className}`.trim()}>{children}</p>;
}

export function FieldError({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p className={`mt-2 text-xs font-medium text-red-600 ${className}`.trim()} role="alert">
      {children}
    </p>
  );
}

type FormFieldProps = {
  id?: string;
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({
  id,
  label,
  htmlFor,
  help,
  error,
  optional,
  children,
  className = "",
}: FormFieldProps) {
  const fid = htmlFor ?? id;
  return (
    <div className={className}>
      {typeof label === "string" ? (
        <FieldLabel htmlFor={fid} optional={optional}>
          {label}
        </FieldLabel>
      ) : (
        label
      )}
      {children}
      {help ? <FieldHelp>{help}</FieldHelp> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}

type FormSectionProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className = "" }: FormSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-100/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] sm:p-8 ${className}`.trim()}
    >
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? <div className="mt-2 text-sm leading-relaxed text-slate-500">{description}</div> : null}
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

export function FormActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 border-t border-slate-100 pt-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
