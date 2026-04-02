import { findByTenantId } from "./tenantSubscriptionService";
import { hasAccess, type BillableFeature } from "./featureGate";

export class BillableFeatureDeniedError extends Error {
  constructor(
    message: string,
    public readonly tenantId: string,
    public readonly feature: BillableFeature
  ) {
    super(message);
    this.name = "BillableFeatureDeniedError";
  }
}

export async function requireBillableFeature(tenantId: string, feature: BillableFeature): Promise<void> {
  const sub = await findByTenantId(tenantId);
  if (!hasAccess(sub, feature)) {
    throw new BillableFeatureDeniedError("Feature not allowed for current plan", tenantId, feature);
  }
}
