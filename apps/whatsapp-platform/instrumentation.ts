/**
 * Executado no arranque do runtime Node (não Edge).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * A decisão Production vs Preview usa VERCEL/VERCEL_ENV dentro de
 * validateProductionServerEnv — não NODE_ENV sozinho.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { validateProductionServerEnv } = await import("./src/config/env");
  try {
    validateProductionServerEnv();
  } catch (e) {
    console.error(e);
    throw e;
  }
}
