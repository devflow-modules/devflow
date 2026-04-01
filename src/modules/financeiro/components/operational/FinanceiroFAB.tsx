"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { trackFinanceiroQuickActionClicked } from "@/lib/analytics";
import { FINANCEIRO_BASE_PATH } from "@/modules/financeiro/navigation/constants";
import { cn } from "@/modules/financeiro/lib/cn";
import { focusRingLight } from "@/modules/financeiro/lib/primitives";

const HREF = `${FINANCEIRO_BASE_PATH}/expenses#nova-despesa`;

/** FAB só em telas pequenas; não cobre onboarding. */
export function FinanceiroFAB() {
  const pathname = usePathname() ?? "";
  if (pathname.includes("/onboarding")) return null;

  return (
    <Link
      href={HREF}
      aria-label="Nova despesa"
      onClick={() =>
        trackFinanceiroQuickActionClicked({
          action_type: "new_expense",
          source: "fab",
          position: 0,
          has_last_action: false,
          target_path: HREF,
        })
      }
      className={cn(
        "fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:opacity-95 active:scale-95 md:hidden",
        focusRingLight
      )}
    >
      <Plus className="size-7" strokeWidth={2.5} aria-hidden />
    </Link>
  );
}
