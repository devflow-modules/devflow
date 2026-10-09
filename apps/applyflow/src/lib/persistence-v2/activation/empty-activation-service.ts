import { isApplyFlowPersistenceV2Enabled } from "../feature-flag";
import { MIGRATION_SESSION_STATUS } from "../migration/migration-service";
import { promoteApplyFlowCanonicalPersistenceToV2 } from "../promote-canonical-persistence";
import { applyflowPrisma } from "../db";
import {
  createApplyFlowMigrationSessionRepository,
  type ApplyFlowPersistenceDb,
} from "../repositories";
import { resolveApplyFlowPersistenceAccess } from "../resolve-persistence-access";
import type { ApplyFlowAccountRecord } from "../require-applyflow-account";

import {
  ApplyFlowEmptyActivationError,
  EMPTY_LEGACY_FINGERPRINT,
  type EmptyActivationBody,
  type EmptyActivationProof,
} from "./empty-activation-dto";

/**
 * Empty-V1 activation: client attests legacy local dataset is empty;
 * server verifies all server-observable safety conditions and atomically
 * promotes canonicalPersistence v1_local → v2_cloud.
 *
 * Reuses ApplyFlowMigrationSession as durable audit/idempotency for the
 * empty fingerprint — no schema change.
 */
export function createApplyFlowEmptyActivationService(deps?: { db?: ApplyFlowPersistenceDb }) {
  const db = deps?.db ?? (applyflowPrisma as unknown as ApplyFlowPersistenceDb);

  async function countBusinessRows(accountId: string, tx: ApplyFlowPersistenceDb): Promise<{
    jobs: number;
    applications: number;
  }> {
    const [jobs, applications] = await Promise.all([
      tx.applyFlowJob.count({ where: { accountId } }),
      tx.applyFlowApplication.count({ where: { accountId } }),
    ]);
    return { jobs, applications };
  }

  async function assertNoIncompatibleSessions(
    accountId: string,
    tx: ApplyFlowPersistenceDb,
  ): Promise<void> {
    const sessions = await tx.applyFlowMigrationSession.findMany({
      where: { accountId },
    });

    for (const session of sessions) {
      if (session.status === MIGRATION_SESSION_STATUS.importing) {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
      }
      if (
        session.status === MIGRATION_SESSION_STATUS.pending &&
        (session.expectedJobs > 0 || session.expectedApplications > 0)
      ) {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
      }
      // Failed non-empty migrations may have left partial cloud rows — count check
      // below catches that. Failed empty sessions are compatible.
      if (
        session.status === MIGRATION_SESSION_STATUS.completed &&
        session.bundleFingerprint !== EMPTY_LEGACY_FINGERPRINT &&
        (session.expectedJobs > 0 || session.expectedApplications > 0)
      ) {
        // Completed non-empty migration should already have promoted canonical.
        // If somehow still v1_local, refuse empty activation (ambiguous).
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
      }
    }
  }

  return {
    async activate(
      account: ApplyFlowAccountRecord,
      body: EmptyActivationBody,
    ): Promise<EmptyActivationProof> {
      if (body.fingerprint !== EMPTY_LEGACY_FINGERPRINT) {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_fingerprint_mismatch");
      }
      if (body.jobs.length !== 0 || body.applications.length !== 0) {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_empty");
      }

      // Already canonical V2. Only a selected active account returns already_active.
      if (account.canonicalPersistence === "v2_cloud") {
        const current = resolveApplyFlowPersistenceAccess(account);
        if (current.mode !== "v2_active") {
          if (current.mode === "v2_paused") {
            throw new ApplyFlowEmptyActivationError("persistence_v2_activation_paused");
          }
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
        }
        const existing = await db.applyFlowMigrationSession.findUnique({
          where: {
            accountId_sourceVersion_bundleFingerprint: {
              accountId: account.id,
              sourceVersion: body.sourceVersion,
              bundleFingerprint: EMPTY_LEGACY_FINGERPRINT,
            },
          },
        });
        return {
          status: "already_active",
          canonicalPersistence: "v2_cloud",
          mode: "v2_active",
          sessionId: existing?.id ?? "already_v2_cloud",
          fingerprint: EMPTY_LEGACY_FINGERPRINT,
          completedAt: (existing?.completedAt ?? account.updatedAt).toISOString(),
        };
      }

      const access = resolveApplyFlowPersistenceAccess(account);
      if (access.mode === "v2_paused") {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_paused");
      }
      if (access.mode !== "v2_offering") {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
      }
      if (!isApplyFlowPersistenceV2Enabled() || !account.pilotEligible) {
        throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
      }

      return db.$transaction(async (tx) => {
        const txDb = tx as ApplyFlowPersistenceDb;

        // Re-check authorization inside the transaction (pilot/global race).
        const locked = await txDb.applyFlowAccount.findUnique({
          where: { id: account.id },
          select: { id: true, canonicalPersistence: true, pilotEligible: true, updatedAt: true },
        });
        if (!locked) {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
        }
        const lockedAccess = resolveApplyFlowPersistenceAccess(locked);
        if (lockedAccess.mode === "v2_paused") {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_paused");
        }
        if (locked.canonicalPersistence === "v2_cloud") {
          if (lockedAccess.mode !== "v2_active") {
            throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
          }
          const existing = await txDb.applyFlowMigrationSession.findUnique({
            where: {
              accountId_sourceVersion_bundleFingerprint: {
                accountId: account.id,
                sourceVersion: body.sourceVersion,
                bundleFingerprint: EMPTY_LEGACY_FINGERPRINT,
              },
            },
          });
          return {
            status: "already_active" as const,
            canonicalPersistence: "v2_cloud" as const,
            mode: "v2_active" as const,
            sessionId: existing?.id ?? "already_v2_cloud",
            fingerprint: EMPTY_LEGACY_FINGERPRINT,
            completedAt: (existing?.completedAt ?? locked.updatedAt).toISOString(),
          };
        }
        if (lockedAccess.mode !== "v2_offering") {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_eligible");
        }

        const counts = await countBusinessRows(account.id, txDb);
        if (counts.jobs > 0 || counts.applications > 0) {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_not_empty");
        }

        await assertNoIncompatibleSessions(account.id, txDb);

        const sessions = createApplyFlowMigrationSessionRepository(txDb);
        let session = await sessions.findByFingerprint(
          account.id,
          body.sourceVersion,
          EMPTY_LEGACY_FINGERPRINT,
        );

        if (!session) {
          try {
            session = await sessions.create({
              accountId: account.id,
              sourceVersion: body.sourceVersion,
              bundleFingerprint: EMPTY_LEGACY_FINGERPRINT,
              status: MIGRATION_SESSION_STATUS.pending,
              expectedJobs: 0,
              expectedApplications: 0,
            });
          } catch {
            session = await sessions.findByFingerprint(
              account.id,
              body.sourceVersion,
              EMPTY_LEGACY_FINGERPRINT,
            );
            if (!session) {
              throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
            }
          }
        }

        if (session.status === MIGRATION_SESSION_STATUS.importing) {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
        }

        const completedAt = new Date();
        const completed =
          session.status === MIGRATION_SESSION_STATUS.completed && session.completedAt
            ? session
            : await sessions.update(account.id, session.id, {
                status: MIGRATION_SESSION_STATUS.completed,
                processedJobs: 0,
                processedApplications: 0,
                conflictSummary: null,
                completedAt,
              });

        if (!completed || completed.status !== MIGRATION_SESSION_STATUS.completed) {
          throw new ApplyFlowEmptyActivationError("persistence_v2_activation_conflict");
        }

        await promoteApplyFlowCanonicalPersistenceToV2(txDb, account.id);

        return {
          status: "activated" as const,
          canonicalPersistence: "v2_cloud" as const,
          mode: "v2_active" as const,
          sessionId: completed.id,
          fingerprint: EMPTY_LEGACY_FINGERPRINT,
          completedAt: (completed.completedAt ?? completedAt).toISOString(),
        };
      });
    },
  };
}

export const applyFlowEmptyActivationService = createApplyFlowEmptyActivationService();
