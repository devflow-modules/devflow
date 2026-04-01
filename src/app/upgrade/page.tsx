import type { Metadata } from "next";
import { UpgradePageContent } from "./UpgradePageContent";

export const metadata: Metadata = {
  title: "Upgrade | DevFlow",
  description: "Assine PRO ou TEAM com checkout Stripe seguro — fechamento da demonstração comercial.",
  robots: "noindex, nofollow",
};

type SearchParams = Promise<{ success?: string; cancel?: string; plan?: string }>;

export default async function UpgradePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <UpgradePageContent
      initialSuccess={params.success === "1"}
      initialCancel={params.cancel === "1"}
      planHint={params.plan ?? null}
    />
  );
}
