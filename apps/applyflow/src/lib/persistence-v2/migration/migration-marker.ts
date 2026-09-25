import { fingerprintApplyFlowAccountId } from "./migration-fingerprint";

/**
 * Durable local cutover reference for V1→V2 migration.
 *
 * NOT authoritative server proof. Future F3.3 writes this only after F3.2
 * server completion. F3.1 provides storage + gate integration only.
 */
export const APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY = "APPLYFLOW_V1_TO_V2_MIGRATION_V1" as const;
export const MIGRATION_MARKER_STORAGE_VERSION = 1 as const;

export type MigrationMarkerRecord = {
  version: typeof MIGRATION_MARKER_STORAGE_VERSION;
  v1ToV2Complete: boolean;
  accountIdFingerprint: string;
  sessionId: string;
  completedAt: string;
  fingerprint: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidCompletedAt(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

/**
 * Parse and validate a stored marker for the current account fingerprint.
 * Incomplete, malformed, or other-account markers yield null (no completion).
 */
export function parseMigrationMarkerRecord(
  raw: unknown,
  expectedAccountIdFingerprint: string,
): MigrationMarkerRecord | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== MIGRATION_MARKER_STORAGE_VERSION) return null;
  if (raw.v1ToV2Complete !== true) return null;
  if (!isNonEmptyString(raw.accountIdFingerprint)) return null;
  if (raw.accountIdFingerprint !== expectedAccountIdFingerprint) return null;
  if (!isNonEmptyString(raw.sessionId)) return null;
  if (!isValidCompletedAt(raw.completedAt)) return null;
  if (!isNonEmptyString(raw.fingerprint)) return null;
  return {
    version: MIGRATION_MARKER_STORAGE_VERSION,
    v1ToV2Complete: true,
    accountIdFingerprint: raw.accountIdFingerprint,
    sessionId: raw.sessionId.trim(),
    completedAt: raw.completedAt,
    fingerprint: raw.fingerprint.trim(),
  };
}

export function loadMigrationMarker(accountId: string): MigrationMarkerRecord | null {
  if (typeof window === "undefined") return null;
  const expected = fingerprintApplyFlowAccountId(accountId);
  try {
    const raw = window.localStorage.getItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY);
    if (!raw) return null;
    let data: unknown;
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
    return parseMigrationMarkerRecord(data, expected);
  } catch {
    return null;
  }
}

/**
 * Low-level write for future F3.3 after server proof. Dashboard UX must not call this.
 */
export function persistMigrationMarker(marker: MigrationMarkerRecord): void {
  if (typeof window === "undefined") return;
  if (marker.version !== MIGRATION_MARKER_STORAGE_VERSION) return;
  if (marker.v1ToV2Complete !== true) return;
  if (!isNonEmptyString(marker.accountIdFingerprint)) return;
  if (!isNonEmptyString(marker.sessionId)) return;
  if (!isValidCompletedAt(marker.completedAt)) return;
  if (!isNonEmptyString(marker.fingerprint)) return;
  const doc: MigrationMarkerRecord = {
    version: MIGRATION_MARKER_STORAGE_VERSION,
    v1ToV2Complete: true,
    accountIdFingerprint: marker.accountIdFingerprint.trim(),
    sessionId: marker.sessionId.trim(),
    completedAt: marker.completedAt,
    fingerprint: marker.fingerprint.trim(),
  };
  window.localStorage.setItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY, JSON.stringify(doc));
}

export function clearMigrationMarker(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(APPLYFLOW_V1_TO_V2_MIGRATION_STORAGE_KEY);
  } catch {
    // ignore storage failures during cleanup
  }
}

export function migrationMarkerProvesCompletion(
  marker: MigrationMarkerRecord | null,
  accountId: string,
): boolean {
  if (!marker) return false;
  return parseMigrationMarkerRecord(marker, fingerprintApplyFlowAccountId(accountId)) != null;
}
