"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  AUTH_CONFIRM_EMAIL_MESSAGE,
  mapAuthFormError,
  resolveSignUpOutcome,
} from "@/app/login/auth-form-helpers";
import {
  buildAuthCallbackUrl,
  resolveAuthRedirect,
} from "@/lib/persistence-v2/auth/safe-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "success" | "error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const nextPath = useMemo(
    () => resolveAuthRedirect(searchParams.get("next")),
    [searchParams],
  );
  const queryError = searchParams.get("error");
  const authenticatedBanner = searchParams.get("authenticated") === "true";

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setStatus("success");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(mapAuthFormError(error instanceof Error ? error.message : undefined));
    }
  }

  async function handleSignUp() {
    setStatus("loading");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(origin, nextPath),
        },
      });
      if (error) throw error;
      const outcome = resolveSignUpOutcome(Boolean(data.session));
      if (outcome === "confirm_email") {
        setStatus("success");
        setMessage(AUTH_CONFIRM_EMAIL_MESSAGE);
        return;
      }
      setStatus("success");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(mapAuthFormError(error instanceof Error ? error.message : undefined));
    }
  }

  return (
    <ApplyFlowCard className="w-full max-w-md space-y-6" padding="lg">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
          ApplyFlow
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--af-text)]">
          Sign in / Create account
        </h1>
        <p className="mt-2 text-sm text-[color:var(--af-text-muted)]">
          Persistence V2 auth surface. Dashboard V1 stays available without login.
        </p>
      </div>

      {authenticatedBanner ? (
        <p
          className="rounded-[var(--af-radius-sm)] border border-emerald-500/35 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200"
          role="status"
        >
          Authenticated. Open your cloud account probe below if needed.
        </p>
      ) : null}

      {queryError ? (
        <p
          className="rounded-[var(--af-radius-sm)] border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          Authentication callback failed. Sign in again.
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSignIn}>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[color:var(--af-text-muted)]">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-bg)] px-3 py-2 text-[color:var(--af-text)] outline-none focus-visible:border-emerald-500/50"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[color:var(--af-text-muted)]">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-bg)] px-3 py-2 text-[color:var(--af-text)] outline-none focus-visible:border-emerald-500/50"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ApplyFlowButton
            type="submit"
            className="w-full"
            disabled={!canSubmit || status === "loading"}
          >
            {status === "loading" ? "Working…" : "Sign in"}
          </ApplyFlowButton>
          <ApplyFlowButton
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!canSubmit || status === "loading"}
            onClick={handleSignUp}
          >
            Create account
          </ApplyFlowButton>
        </div>
      </form>

      {message ? (
        <p
          className={
            status === "error"
              ? "text-sm text-red-300"
              : "text-sm text-emerald-200"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      <p className="text-xs text-[color:var(--af-text-muted)]">
        After sign-in, continue to{" "}
        <Link href="/account" className="text-emerald-300 hover:text-emerald-200">
          /account
        </Link>{" "}
        to probe <code className="text-[color:var(--af-text)]">/api/applyflow/v2/me</code>.
      </p>
    </ApplyFlowCard>
  );
}
