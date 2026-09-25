import { NextResponse } from "next/server";

import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";
import {
  ApplyFlowAuthError,
  ApplyFlowPersistenceDisabledError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";

export async function GET() {
  if (!isApplyFlowPersistenceV2Enabled()) {
    return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
  }

  try {
    const account = await requireApplyFlowAccount();
    return NextResponse.json({
      authenticated: true,
      account: {
        id: account.id,
      },
    });
  } catch (error) {
    if (error instanceof ApplyFlowPersistenceDisabledError) {
      return NextResponse.json({ error: "persistence_v2_disabled" }, { status: 404 });
    }
    if (error instanceof ApplyFlowAuthError) {
      if (error.code === "auth_not_configured") {
        return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
      }
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export function POST() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
