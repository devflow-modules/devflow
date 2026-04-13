/**
 * Executado no arranque do runtime Node (não Edge).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  if (process.env.NODE_ENV === "production" && process.env.SKIP_ENV_VALIDATION !== "1") {
    const { validateProductionServerEnv } = await import("./src/config/env");
    try {
      validateProductionServerEnv();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}
