"use client";

import { useEffect, useState } from "react";
import type { ToolCardProps } from "@/components/sections/tool-card";
import { ToolCard } from "@/components/sections/tool-card";
import { trackFinanceiroGoToDashboardClicked, trackFinanceiroResumeLastRoute } from "@/lib/analytics";
import { FINANCEIRO_DASHBOARD_PATH } from "./constants";

type MeResponse = {
  success: true;
  data: {
    user?: { id: string };
    financeiroResumePath?: string;
    financeiroHasLastRoute?: boolean;
  } | null;
};

export function FinanceiroHubToolCard(props: ToolCardProps) {
  const [href, setHref] = useState(props.href);
  const [cta, setCta] = useState(props.cta);
  const [hasLastRoute, setHasLastRoute] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        const json = (await res.json()) as MeResponse | { success: false };
        if (cancelled || !res.ok || !("success" in json) || !json.success || !json.data?.user) {
          if (!cancelled) setReady(true);
          return;
        }
        const resume = json.data.financeiroResumePath ?? FINANCEIRO_DASHBOARD_PATH;
        const last = Boolean(json.data.financeiroHasLastRoute);
        if (!cancelled) {
          setHref(resume);
          setCta(last ? "Continuar de onde parei" : "Meu painel");
          setHasLastRoute(last);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const surface = "ferramentas_hub";

  const handleNavigate = () => {
    if (!ready || href === props.href) return;
    if (hasLastRoute && href !== FINANCEIRO_DASHBOARD_PATH) {
      trackFinanceiroResumeLastRoute({
        source_path: "/ferramentas",
        target_path: href,
        has_last_route: true,
        redirect_type: "hub_card",
        interaction: "cta_click",
      });
    } else {
      trackFinanceiroGoToDashboardClicked({
        source_path: "/ferramentas",
        target_path: FINANCEIRO_DASHBOARD_PATH,
        has_last_route: hasLastRoute,
        surface,
      });
    }
  };

  return <ToolCard {...props} href={href} cta={cta} onCtaNavigate={handleNavigate} />;
}
