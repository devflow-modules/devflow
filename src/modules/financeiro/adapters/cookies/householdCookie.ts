import type { NextRequest, NextResponse } from "next/server";

export const ACTIVE_HOUSEHOLD_COOKIE_NAME = "active_household_id";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export function getActiveHouseholdCookieName(): string {
  return ACTIVE_HOUSEHOLD_COOKIE_NAME;
}

export function getActiveHouseholdFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(ACTIVE_HOUSEHOLD_COOKIE_NAME)?.value;
}

export function setActiveHouseholdCookie(response: NextResponse, householdId: string): void {
  response.cookies.set(ACTIVE_HOUSEHOLD_COOKIE_NAME, householdId, COOKIE_OPTIONS);
}

export function deleteActiveHouseholdCookie(response: NextResponse): void {
  response.cookies.delete(ACTIVE_HOUSEHOLD_COOKIE_NAME);
}
