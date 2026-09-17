import { NextRequest } from "next/server";
import { mintNangoCallerSession } from "./nango-caller-session";

export const NANGO_TEST_SECRET = "nango-secret-test";
export const CALLER_NONCE_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const CALLER_NONCE_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

export const enabledNangoTestEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  CALENDAR_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: NANGO_TEST_SECRET,
  NODE_ENV: "test",
};

export const gmailOnlyNangoTestEnv = {
  CAREER_PROVIDER_RUNTIME_ENABLED: "true",
  NANGO_RUNTIME_ENABLED: "true",
  GMAIL_PROVIDER_ENABLED: "true",
  NANGO_SECRET_KEY: NANGO_TEST_SECRET,
  NODE_ENV: "test",
};

export const hostedHttpsNangoTestEnv = {
  ...enabledNangoTestEnv,
  VERCEL_ENV: "preview",
  VERCEL_URL: "applyflow.example",
};

export function mintCaller(
  nonce: string,
  options?: { now?: number; secure?: boolean; secret?: string },
) {
  return mintNangoCallerSession(options?.secret ?? NANGO_TEST_SECRET, {
    nonce,
    now: options?.now,
    secure: options?.secure === true,
  });
}

export function nangoRequest(input: {
  url: string;
  method?: string;
  origin?: string | null | "omit";
  cookie?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
}): NextRequest {
  const headers = new Headers(input.extraHeaders);
  if (input.origin === undefined) {
    headers.set("origin", new URL(input.url).origin);
  } else if (input.origin === null) {
    headers.set("origin", "null");
  } else if (input.origin !== "omit") {
    headers.set("origin", input.origin);
  }
  if (input.cookie) {
    headers.set("cookie", input.cookie);
  }
  if (input.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(input.url, {
    method: input.method ?? "POST",
    headers,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
}
