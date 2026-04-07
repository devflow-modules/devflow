/**
 * Alertas mínimos baseados em consola (sem PagerDuty). Prefixo [alert] para filtrar em agregadores.
 */

import { logEvent } from "./log-event";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAIL_ALERT_THRESHOLD = 10;
const OPS_DENY_ALERT_THRESHOLD = 20;
const OPS_DENY_WINDOW_MS = 10 * 60 * 1000;

type WindowCounter = { windowStart: number; count: number };

const loginFailuresByIp = new Map<string, WindowCounter>();
const opsDeniedByIp = new Map<string, WindowCounter>();

function bumpWindow(map: Map<string, WindowCounter>, ip: string, windowMs: number): number {
  const now = Date.now();
  let w = map.get(ip);
  if (!w || now - w.windowStart > windowMs) {
    w = { windowStart: now, count: 0 };
    map.set(ip, w);
  }
  w.count += 1;
  return w.count;
}

export function trackLoginFailureForAlert(ip: string | undefined): void {
  if (!ip?.trim()) return;
  const c = bumpWindow(loginFailuresByIp, ip.trim(), LOGIN_WINDOW_MS);
  if (c >= LOGIN_FAIL_ALERT_THRESHOLD) {
    logEvent("warn", "security", "alert_login_failures_burst", { ip, countInWindow: c, windowMinutes: LOGIN_WINDOW_MS / 60000 });
    console.warn(
      `[alert] auth: muitas falhas de login — ip=${ip} count=${c} (janela ${LOGIN_WINDOW_MS / 60000}min)`
    );
  }
}

export function trackOpsMetricsDeniedForAlert(ip: string | undefined): void {
  if (!ip?.trim()) return;
  const c = bumpWindow(opsDeniedByIp, ip.trim(), OPS_DENY_WINDOW_MS);
  if (c >= OPS_DENY_ALERT_THRESHOLD) {
    logEvent("warn", "security", "alert_ops_metrics_denied_burst", { ip, countInWindow: c });
    console.warn(`[alert] security: negações repetidas a /api/ops/metrics — ip=${ip} count=${c}`);
  }
}
