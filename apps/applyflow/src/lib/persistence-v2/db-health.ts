import { applyflowPrisma } from "./db";
import { isApplyFlowDatabaseConfigured } from "./env";

export async function probeApplyFlowDatabaseReachable(
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!isApplyFlowDatabaseConfigured(env)) {
    return false;
  }
  try {
    await applyflowPrisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
