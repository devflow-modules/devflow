import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Product app middleware.
 * Add auth/session logic here (e.g. using @devflow/supabase-utils or @devflow/auth-core).
 * See docs/PRODUCT_MODULE_PATTERN.md for auth module placement.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}
