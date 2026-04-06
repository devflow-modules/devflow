import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Assinatura | DevFlow",
  description: "Gerencie sua assinatura no app Financeiro.",
  robots: "noindex, nofollow",
};

type SearchParams = Promise<{
  success?: string;
  cancel?: string;
  portal_return?: string;
}>;

/** Assinatura canónica: `apps/financeiro`. Sem env, envia para a landing de aquisição. */
export default async function BillingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const financeiroBase = process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL?.replace(/\/$/, "");
  if (!financeiroBase) {
    redirect("/ferramentas/financeiro");
  }
  const qs = new URLSearchParams();
  if (params.success === "1") qs.set("success", "1");
  if (params.cancel === "1") qs.set("cancel", "1");
  if (params.portal_return === "1") qs.set("portal_return", "1");
  const suffix = qs.toString() ? `?${qs}` : "";
  redirect(`${financeiroBase}/billing${suffix}`);
}
