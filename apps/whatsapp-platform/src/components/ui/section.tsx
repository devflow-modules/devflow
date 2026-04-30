import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@devflow/ui";

export type SectionTone = "dark" | "light";

export type SectionProps = HTMLAttributes<HTMLElement> & {
  tone?: SectionTone;
  as?: "section" | "div" | "article";
  children?: ReactNode;
};

/**
 * Secção com tom explícito — `df-section-dark` / `df-section-light` em `globals.css`.
 */
export function Section({ tone = "dark", as: Comp = "section", className, children, ...rest }: SectionProps) {
  return (
    <Comp className={cn(tone === "light" ? "df-section-light" : "df-section-dark", className)} {...rest}>
      {children}
    </Comp>
  );
}
