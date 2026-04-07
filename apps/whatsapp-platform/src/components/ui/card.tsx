import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

const pad = { sm: "p-5", md: "p-7", lg: "p-8" };

const surface =
  "rounded-2xl border border-slate-100/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)]";

export function Card({ children, className = "", padding = "md" }: Props) {
  return (
    <div className={`${surface} ${pad[padding]} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p> : null}
    </div>
  );
}
