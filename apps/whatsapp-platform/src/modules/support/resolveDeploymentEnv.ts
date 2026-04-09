export type DeploymentEnvLabel = "production" | "development" | "preview" | "test";

/**
 * Ambiente do deploy (servidor) — preferível a valores enviados pelo cliente.
 */
export function resolveDeploymentEnv(): DeploymentEnvLabel {
  const vercel = process.env.VERCEL_ENV;
  if (vercel === "preview") return "preview";
  if (vercel === "production") return "production";
  if (process.env.NODE_ENV === "test") return "test";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}
