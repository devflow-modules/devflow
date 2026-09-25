import { Prisma } from "@prisma/client";

import { applyflowPrisma } from "../db";
import type {
  ApplyFlowMigrationSession,
  ApplyFlowMigrationSessionCreateInput,
  ApplyFlowMigrationSessionUpdateInput,
  ApplyFlowPersistenceDb,
} from "./types";

function requireAccountId(accountId: string): string {
  if (!accountId || typeof accountId !== "string") {
    throw new Error("accountId is required for ApplyFlow migration session repository calls.");
  }
  return accountId;
}

function jsonOrDbNull(
  value: Prisma.InputJsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value;
}

export function createApplyFlowMigrationSessionRepository(
  db: ApplyFlowPersistenceDb = applyflowPrisma,
) {
  return {
    async create(input: ApplyFlowMigrationSessionCreateInput): Promise<ApplyFlowMigrationSession> {
      const accountId = requireAccountId(input.accountId);
      return db.applyFlowMigrationSession.create({
        data: {
          accountId,
          sourceVersion: input.sourceVersion,
          bundleFingerprint: input.bundleFingerprint,
          status: input.status,
          expectedJobs: input.expectedJobs,
          expectedApplications: input.expectedApplications,
          processedJobs: input.processedJobs ?? 0,
          processedApplications: input.processedApplications ?? 0,
          conflictSummary: jsonOrDbNull(input.conflictSummary),
        },
      });
    },

    async findById(accountId: string, id: string): Promise<ApplyFlowMigrationSession | null> {
      const scoped = requireAccountId(accountId);
      const row = await db.applyFlowMigrationSession.findUnique({ where: { id } });
      if (!row || row.accountId !== scoped) return null;
      return row;
    },

    async findByFingerprint(
      accountId: string,
      sourceVersion: number,
      bundleFingerprint: string,
    ): Promise<ApplyFlowMigrationSession | null> {
      return db.applyFlowMigrationSession.findUnique({
        where: {
          accountId_sourceVersion_bundleFingerprint: {
            accountId: requireAccountId(accountId),
            sourceVersion,
            bundleFingerprint,
          },
        },
      });
    },

    async update(
      accountId: string,
      id: string,
      patch: ApplyFlowMigrationSessionUpdateInput,
    ): Promise<ApplyFlowMigrationSession | null> {
      const scoped = requireAccountId(accountId);
      const existing = await db.applyFlowMigrationSession.findUnique({ where: { id } });
      if (!existing || existing.accountId !== scoped) return null;

      const data: Prisma.ApplyFlowMigrationSessionUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.processedJobs !== undefined) data.processedJobs = patch.processedJobs;
      if (patch.processedApplications !== undefined) {
        data.processedApplications = patch.processedApplications;
      }
      if (patch.conflictSummary !== undefined) {
        data.conflictSummary = jsonOrDbNull(patch.conflictSummary);
      }
      if (patch.completedAt !== undefined) data.completedAt = patch.completedAt;

      return db.applyFlowMigrationSession.update({
        where: { id },
        data,
      });
    },
  };
}

export type ApplyFlowMigrationSessionRepository = ReturnType<
  typeof createApplyFlowMigrationSessionRepository
>;

export const applyFlowMigrationSessionRepository = createApplyFlowMigrationSessionRepository();
