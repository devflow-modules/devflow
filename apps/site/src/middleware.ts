import { type NextRequest, NextResponse } from "next/server";

/**
 * Site app middleware — pass-through (auth/session fica nos apps de produto).
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}
