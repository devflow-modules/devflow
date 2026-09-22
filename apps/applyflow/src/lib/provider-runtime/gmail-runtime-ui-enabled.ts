import { evaluateProviderRuntimeFlags } from "@devflow/career-sync";
import { envToProviderRuntimeFlags } from "./nango-connect-session-boundary";

/** Server-side UI gate: Gmail actions stay disabled unless all Gmail runtime flags are on. */
export function isApplyFlowGmailRuntimeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return evaluateProviderRuntimeFlags(envToProviderRuntimeFlags(env)).canUseGmailProvider;
}
