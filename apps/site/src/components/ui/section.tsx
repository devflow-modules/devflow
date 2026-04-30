import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionTone = "dark" | "light";

const tones: Record<SectionTone, string> = {
  dark: "df-section-dark",
  light: "df-section-light",
};

export type SectionProps = HTMLAttributes<HTMLElement> & {
  tone?: SectionTone;
  as?: "section" | "div" | "article";
  children?: ReactNode;
};

/**
 * Secção com tom explícito (`df-section-dark` / `df-section-light`).
 */
export function Section({ tone = "dark", as: Comp = "section", className, children, ...rest }: SectionProps) {
  return (
    <Comp className={cn(tones[tone], className)} {...rest}>
      {children}
    </Comp>
  );
}
