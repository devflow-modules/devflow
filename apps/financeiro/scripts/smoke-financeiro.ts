/**
 * Smoke test para staging/produção (HTTP + cookie de sessão).
 *
 * FINANCEIRO_SMOKE_BASE_URL   (default http://localhost:3001)
 * FINANCEIRO_SMOKE_COOKIE     Cookie após login
 * FINANCEIRO_SMOKE_ACCOUNT_ID (opcional)
 */
const BASE = (process.env.FINANCEIRO_SMOKE_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const COOKIE = process.env.FINANCEIRO_SMOKE_COOKIE?.trim() ?? "";
const PRESET_ACCOUNT = process.env.FINANCEIRO_SMOKE_ACCOUNT_ID?.trim();

const headers = {
  "Content-Type": "application/json",
  ...(COOKIE ? { Cookie: COOKIE } : {}),
};

async function j<T>(res: Response): Promise<T> {
  const t = await res.text();
  try {
    return JSON.parse(t) as T;
  } catch {
    throw new Error(`Não-JSON (${res.status}): ${t.slice(0, 200)}`);
  }
}

function fail(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function main() {
  console.log(`Base: ${BASE}\n`);

  let h: Response;
  try {
    h = await fetch(`${BASE}/api/health`);
  } catch {
    const strict = process.env.FINANCEIRO_SMOKE_STRICT === "1";
    console.error(
      strict
        ? "Servidor não respondeu. Inicie o app (pnpm dev) ou ajuste FINANCEIRO_SMOKE_BASE_URL."
        : "SKIP: servidor indisponível (defina FINANCEIRO_SMOKE_STRICT=1 para falhar em CI)."
    );
    process.exit(strict ? 1 : 0);
    return;
  }
  const health = await j<{ data?: { status?: string; db?: string } }>(h);
  if (!h.ok || health.data?.status !== "ok") fail(`Health ${h.status}`);
  if (health.data?.db !== "connected") fail(`DB ${health.data?.db}`);
  console.log("OK GET /api/health");

  if (!COOKIE) {
    console.log("\n⚠ FINANCEIRO_SMOKE_COOKIE ausente — só health.\n");
    return;
  }

  const accRes = await fetch(`${BASE}/api/accounts`, { headers });
  const accBody = await j<{ success?: boolean; data?: { id: string }[] }>(accRes);
  if (!accRes.ok || !accBody.success || !Array.isArray(accBody.data)) {
    fail(`accounts ${accRes.status}`);
  }
  const accountId = PRESET_ACCOUNT ?? accBody.data[0]?.id;
  if (!accountId) fail("sem conta");

  const balRes = await fetch(`${BASE}/api/accounts/${accountId}/effective-balances`, { headers });
  const balBody = await j<{ success?: boolean }>(balRes);
  if (!balRes.ok || !balBody.success) fail("balances");

  const tlRes = await fetch(`${BASE}/api/accounts/${accountId}/timeline`, { headers });
  const tlBody = await j<{ success?: boolean; data?: unknown[] }>(tlRes);
  if (!tlRes.ok || !tlBody.success) fail("timeline");

  console.log("OK GET accounts, balances, timeline");

  const getAcc = await fetch(`${BASE}/api/accounts/${accountId}`, { headers });
  const accOne = await j<{ data?: { participants?: { id: string }[] } }>(getAcc);
  const parts = accOne.data?.participants ?? [];
  if (parts.length >= 2) {
    const idem = `smoke-m-${Date.now()}xxxxxxxx`.slice(0, 36);
    await fetch(`${BASE}/api/accounts/${accountId}/manual-settlement`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fromParticipantId: parts[0]!.id,
        toParticipantId: parts[1]!.id,
        amount: 0.01,
        idempotencyKey: idem,
      }),
    });
    console.log("OK POST manual-settlement (tentativa)");
  }

  const stRes = await fetch(`${BASE}/api/accounts/${accountId}/settlements`, { headers });
  const stBody = await j<{ data?: { id: string; status: string; amount: number; paidAmount: number }[] }>(stRes);
  const open = stBody.data?.find((s) => s.status === "PENDING" || s.status === "PARTIAL");
  if (open) {
    const rem = open.amount - (open.paidAmount ?? 0);
    const payAmt = Math.min(1, Math.round((rem - 0.01) * 100) / 100);
    if (payAmt > 0) {
      await fetch(`${BASE}/api/settlements/${open.id}/payments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: payAmt,
          idempotencyKey: `smoke-p-${Date.now()}xxxx1234`,
        }),
      });
      console.log("OK POST payment (tentativa)");
    }
  }

  console.log("\nSmoke concluído.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
