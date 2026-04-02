export type BillableFeature = "advanced_reports" | "exports" | "multi_user";

export type SubscriptionGateRow = { status: string; planCode: string };

const MATRIX: Record<"free" | "pro" | "team", BillableFeature[]> = {
  free: [],
  pro: ["advanced_reports", "exports"],
  team: ["advanced_reports", "exports", "multi_user"],
};

function normalizePlan(planCode: string | null | undefined): "free" | "pro" | "team" {
  const p = (planCode ?? "free").toLowerCase();
  if (p === "pro") return "pro";
  if (p === "team") return "team";
  return "free";
}

export function hasAccess(subscription: SubscriptionGateRow | null, feature: BillableFeature): boolean {
  if (!subscription) return false;
  if (subscription.status !== "active" && subscription.status !== "trialing") return false;
  const plan = normalizePlan(subscription.planCode);
  return MATRIX[plan]?.includes(feature) ?? false;
}
