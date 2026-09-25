/**
 * Vitest setup: load apps/applyflow/.env.local (override) so Production shell
 * env cannot leak into tests. Keep Persistence V2 OFF unless F3.5 E2E opt-in.
 */
import { loadApplyFlowEnvLocalIfPresent } from "./f3-5-dev-environment";

loadApplyFlowEnvLocalIfPresent();

if (process.env.APPLYFLOW_F3_5_E2E !== "1") {
  // Unit/integration suite must not enable V2 readiness/DB requirements by default.
  process.env.APPLYFLOW_PERSISTENCE_V2 = "false";
}
