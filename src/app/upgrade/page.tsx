import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Upgrade | DevFlow",
  description: "Planos PRO e TEAM no app Financeiro.",
  robots: "noindex, nofollow",
};

type SearchParams = Promise<{ success?: string; cancel?: string; plan?: string }>;

/** Upgrade canónico: `apps/financeiro`. Sem env, envia para a landing de aquisição. */
export default async function UpgradePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const financeiroBase = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.replace(/\/$/, "");
  if (!financeiroBase) {
    redirect("/ferramentas/financeiro");
  }
  const qs = new URLSearchParams();
  if (params.success === "1") qs.set("success", "1");
  if (params.cancel === "1") qs.set("cancel", "1");
  if (params.plan) qs.set("plan", params.plan);
  const suffix = qs.toString() ? `?${qs}` : "";
  redirect(`${financeiroBase}/upgrade${suffix}`);
}
