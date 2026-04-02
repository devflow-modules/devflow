"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackFinanceiroDemoEntryClick } from "@/lib/analytics";

type LinkProps = ComponentProps<typeof Link>;

type Props = Omit<LinkProps, "onClick"> & {
  surface: string;
  onClick?: LinkProps["onClick"];
};

/** Link para `/ferramentas/financeiro/demo` com tracking de entrada no demo (antes do redirect). */
export function FinanceiroDemoEntryLink({ surface, onClick, href, ...rest }: Props) {
  const target = typeof href === "string" ? href : "";
  return (
    <Link
      {...rest}
      href={href}
      onClick={(e) => {
        trackFinanceiroDemoEntryClick({ surface, target_href: target });
        onClick?.(e);
      }}
    />
  );
}
