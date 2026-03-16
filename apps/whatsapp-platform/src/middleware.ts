import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js middleware signature
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
