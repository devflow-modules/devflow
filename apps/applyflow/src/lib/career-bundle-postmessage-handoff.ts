import type { CareerBundle, CreateCareerBundleHandshakeMessageOptions } from "@devflow/career-core";
import { createCareerBundleHandshakeMessage, parseHandshakeCareerBundleAck } from "@devflow/career-core";
import { getInterviewLabImportPostMessageHandoffUrl, getInterviewLabOrigin } from "./interview-lab-handoff";

export type CareerPostMessageHandoffResult =
  | { kind: "ack" }
  | { kind: "fallback_clipboard_ok" }
  | { kind: "fallback_clipboard_failed"; error: string };

export async function sendCareerBundleViaPostMessageWithRetry(opts: {
  bundle: CareerBundle;
  stringifyBundle: (b: CareerBundle) => string;
  copyToClipboard: (json: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  intervalMs?: number;
  totalWaitMs?: number;
  /** Defaults to import handoff URL. */
  interviewLabUrl?: string;
  handshake?: CreateCareerBundleHandshakeMessageOptions;
}): Promise<CareerPostMessageHandoffResult> {
  const targetOrigin = getInterviewLabOrigin();
  const url = opts.interviewLabUrl ?? getInterviewLabImportPostMessageHandoffUrl();
  const msg = createCareerBundleHandshakeMessage(opts.bundle, opts.handshake);
  const intervalMs = opts.intervalMs ?? 160;
  const totalWaitMs = opts.totalWaitMs ?? 8500;

  // Sem `noopener`: Interview Lab precisa de `window.opener` para enviar ACK.
  // Origens são validadas em `@devflow/career-core` (allowlist postMessage).
  const win = typeof window !== "undefined" ? window.open(url, "_blank") : null;
  if (!win) {
    const c = await opts.copyToClipboard(opts.stringifyBundle(opts.bundle));
    return c.ok ? { kind: "fallback_clipboard_ok" } : { kind: "fallback_clipboard_failed", error: c.error };
  }

  return new Promise((resolve) => {
    let settled = false;
    let clipboardFallbackStarted = false;
    let tick: ReturnType<typeof setInterval> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      window.removeEventListener("message", onAck);
      if (tick !== undefined) clearInterval(tick);
      if (timer !== undefined) clearTimeout(timer);
    };

    const finish = (r: CareerPostMessageHandoffResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(r);
    };

    const runClipboardFallback = async () => {
      if (settled || clipboardFallbackStarted) return;
      clipboardFallbackStarted = true;
      cleanup();
      const c = await opts.copyToClipboard(opts.stringifyBundle(opts.bundle));
      finish(c.ok ? { kind: "fallback_clipboard_ok" } : { kind: "fallback_clipboard_failed", error: c.error });
    };

    const onAck = (ev: MessageEvent) => {
      if (settled || clipboardFallbackStarted) return;
      if (ev.origin !== targetOrigin) return;
      const parsed = parseHandshakeCareerBundleAck(ev.data);
      if (!parsed.ok) return;
      if (parsed.ack.ok) {
        finish({ kind: "ack" });
        return;
      }
      void runClipboardFallback();
    };
    window.addEventListener("message", onAck);

    const post = () => {
      if (settled || clipboardFallbackStarted) return;
      try {
        if (win.closed) {
          void runClipboardFallback();
          return;
        }
        win.postMessage(msg, targetOrigin);
      } catch {
        void runClipboardFallback();
      }
    };

    post();
    tick = setInterval(post, intervalMs);
    timer = setTimeout(() => void runClipboardFallback(), totalWaitMs);
  });
}
