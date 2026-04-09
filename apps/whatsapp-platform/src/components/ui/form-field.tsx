import type { ReactNode } from "react";

/** Alinhado a `.df-field-control` em `globals.css` */
export const fieldControlBase = "df-field-control";

export const fieldInputClassName = "df-field-control";

export const fieldSelectClassName = "df-field-control";

export const fieldTextareaClassName = "df-field-control df-textarea-control";

export const fieldControlCompact = "df-field-compact w-full";

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
      className={`df-label mb-2 block ${className}`.trim()}
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
    <section className={`df-form-section ${className}`.trim()}>
      <h2 className="df-text-section-title">{title}</h2>
      {description ? <div className="df-text-muted mt-2">{description}</div> : null}
      <div className="df-stack-dense mt-8">{children}</div>
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
