"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  trackFinanceiroGoToDashboardClicked,
  trackFinanceiroResumeLastRoute,
  trackFinanceiroReturnDetected,
} from "@/lib/analytics";
import { financeiroAppUrl } from "@/lib/financeiro-app-url";
import { FINANCEIRO_DASHBOARD_PATH } from "./constants";

type Props = {
  resumeHref: string;
  hasLastRoute: boolean;
  sourcePath: string;
};

export function FinanceiroAuthedEntryHero({ resumeHref, hasLastRoute, sourcePath }: Props) {
  const returnTracked = useRef(false);

  useEffect(() => {
    if (returnTracked.current) return;
    returnTracked.current = true;
    trackFinanceiroReturnDetected({
      source_path: sourcePath,
      target_path: resumeHref,
      has_last_route: hasLastRoute,
      redirect_type: "public_stay",
    });
  }, [hasLastRoute, resumeHref, sourcePath]);

  const onResumeClick = () => {
    trackFinanceiroResumeLastRoute({
      source_path: sourcePath,
      target_path: resumeHref,
      has_last_route: hasLastRoute,
      redirect_type: "public_stay",
      interaction: "cta_click",
    });
  };

  const onDashboardClick = () => {
    trackFinanceiroGoToDashboardClicked({
      source_path: sourcePath,
      target_path: FINANCEIRO_DASHBOARD_PATH,
      has_last_route: hasLastRoute,
      surface: "financeiro_landing_authed",
    });
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={financeiroAppUrl(FINANCEIRO_DASHBOARD_PATH)}
        onClick={onDashboardClick}
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Meu painel
      </Link>
      {hasLastRoute && resumeHref !== FINANCEIRO_DASHBOARD_PATH ? (
        <Link
          href={financeiroAppUrl(resumeHref)}
          onClick={onResumeClick}
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
        >
          Continuar de onde parei
        </Link>
      ) : null}
      <Link
        href="/ferramentas"
        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
      >
        ← Voltar ao hub
      </Link>
    </div>
  );
}
