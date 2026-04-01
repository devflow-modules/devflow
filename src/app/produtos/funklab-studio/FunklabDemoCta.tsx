"use client";

import type { ReactNode } from "react";
import { trackOpenDemo } from "@/lib/analytics";

type Surface = "hero" | "demo_section" | "cta_final";

export function FunklabDemoCta(props: {
  href: string;
  surface: Surface;
  className?: string;
  children: ReactNode;
}) {
  const { href, surface, className, children } = props;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackOpenDemo({ product: "funklab", surface })}
    >
      {children}
    </a>
  );
}
