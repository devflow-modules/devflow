import { NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/modules/auth";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", buildClearCookieHeader());
  return res;
}
