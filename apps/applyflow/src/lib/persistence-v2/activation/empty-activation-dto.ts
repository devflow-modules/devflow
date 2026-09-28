import { z } from "zod";

import { MIGRATION_SOURCE_VERSION } from "../migration/migration-dto";
import { fingerprintMigrationBundle } from "../migration/migration-fingerprint";

/** Honest client attestation — server cannot inspect browser localStorage. */
export const LEGACY_EMPTY_ATTESTATION = "legacy_empty_v1" as const;

export const EMPTY_ACTIVATION_PROTOCOL_VERSION = 1 as const;

/** Deterministic fingerprint of the canonical empty V1 migration bundle. */
export const EMPTY_LEGACY_FINGERPRINT = fingerprintMigrationBundle({
  jobs: [],
  applications: [],
});

export const emptyActivationBodySchema = z
  .object({
    protocolVersion: z.literal(EMPTY_ACTIVATION_PROTOCOL_VERSION),
    attestation: z.literal(LEGACY_EMPTY_ATTESTATION),
    sourceVersion: z.literal(MIGRATION_SOURCE_VERSION),
    fingerprint: z.string().trim().min(1).max(64),
    jobs: z.array(z.unknown()).max(0),
    applications: z.array(z.unknown()).max(0),
  })
  .strict();

export type EmptyActivationBody = z.infer<typeof emptyActivationBodySchema>;

export type EmptyActivationProof = {
  status: "activated" | "already_active";
  canonicalPersistence: "v2_cloud";
  mode: "v2_active";
  sessionId: string;
  fingerprint: string;
  completedAt: string;
};

export class ApplyFlowEmptyActivationError extends Error {
  readonly code:
    | "persistence_v2_activation_not_eligible"
    | "persistence_v2_activation_not_empty"
    | "persistence_v2_activation_conflict"
    | "persistence_v2_activation_paused"
    | "persistence_v2_activation_fingerprint_mismatch"
    | "invalid_activation_payload";

  constructor(code: ApplyFlowEmptyActivationError["code"]) {
    super(code);
    this.name = "ApplyFlowEmptyActivationError";
    this.code = code;
  }
}

export function parseEmptyActivationBody(raw: unknown): EmptyActivationBody {
  const parsed = emptyActivationBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApplyFlowEmptyActivationError("invalid_activation_payload");
  }
  return parsed.data;
}
