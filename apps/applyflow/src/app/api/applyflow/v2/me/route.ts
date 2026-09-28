import { NextResponse } from "next/server";

import {
  ApplyFlowAuthError,
  requireApplyFlowAccount,
} from "@/lib/persistence-v2/require-applyflow-account";
import { resolveApplyFlowPersistenceAccess } from "@/lib/persistence-v2/resolve-persistence-access";

/**
 * Own-account identity + authoritative persistence mode.
 *
 * Intentionally available with GLOBAL=false so the first Production account
 * can be provisioned before pilot grant / master switch (breaks the R2.2.2
 * bootstrap cycle). Does NOT expose Jobs/Apps/Migration business APIs.
 */
export async function GET() {
  try {
    const account = await requireApplyFlowAccount();
    const access = resolveApplyFlowPersistenceAccess(account);
    return NextResponse.json({
      authenticated: true,
      account: {
        id: account.id,
      },
      persistence: {
        mode: access.mode,
        reason: access.reason,
        pilotEligible: account.pilotEligible,
        canonicalPersistence: account.canonicalPersistence,
      },
    });
  } catch (error) {
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
