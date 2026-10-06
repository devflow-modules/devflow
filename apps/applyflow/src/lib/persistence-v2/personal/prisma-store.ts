import { Prisma } from "@prisma/client";

import { applyflowPrisma } from "../db";
import type {
  CareerEventRow,
  ImportSessionRow,
  PersonalImportModule,
  PersonalStore,
  ProfileRow,
} from "./store";

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function profileRow(row: {
  accountId: string;
  library: unknown;
  version: number;
  fingerprint: string;
}): ProfileRow {
  return row;
}

export function createPrismaPersonalStore(
  db: typeof applyflowPrisma = applyflowPrisma,
): PersonalStore {
  return {
    async getProfile(accountId) {
      const row = await db.applyFlowProfileDocument.findUnique({ where: { accountId } });
      return row ? profileRow(row) : null;
    },
    async insertProfile(row) {
      const created = await db.applyFlowProfileDocument.create({
        data: {
          accountId: row.accountId,
          library: json(row.library),
          version: row.version,
          fingerprint: row.fingerprint,
        },
      });
      return profileRow(created);
    },
    async updateProfile(accountId, expectedVersion, next) {
      const updated = await db.applyFlowProfileDocument.updateMany({
        where: { accountId, version: expectedVersion },
        data: {
          library: json(next.library),
          fingerprint: next.fingerprint,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const current = await db.applyFlowProfileDocument.findUnique({ where: { accountId } });
        return { ok: false, reason: current ? "conflict" : "not_found" };
      }
      const row = await db.applyFlowProfileDocument.findUnique({ where: { accountId } });
      if (!row) return { ok: false, reason: "not_found" };
      return { ok: true, row: profileRow(row) };
    },
    async listContacts(accountId) {
      return db.applyFlowContactRecord.findMany({ where: { accountId } });
    },
    async getContact(accountId, id) {
      return db.applyFlowContactRecord.findUnique({ where: { accountId_id: { accountId, id } } });
    },
    async insertContact(row) {
      try {
        return await db.applyFlowContactRecord.create({
          data: {
            accountId: row.accountId,
            id: row.id,
            applicationId: row.applicationId,
            jobId: row.jobId,
            payload: json(row.payload),
            version: row.version,
            fingerprint: row.fingerprint,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
        throw error;
      }
    },
    async updateContact(accountId, id, expectedVersion, next) {
      const updated = await db.applyFlowContactRecord.updateMany({
        where: { accountId, id, version: expectedVersion },
        data: {
          applicationId: next.applicationId,
          jobId: next.jobId,
          payload: json(next.payload),
          fingerprint: next.fingerprint,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const current = await db.applyFlowContactRecord.findUnique({ where: { accountId_id: { accountId, id } } });
        return { ok: false, reason: current ? "conflict" : "not_found" };
      }
      const row = await db.applyFlowContactRecord.findUnique({ where: { accountId_id: { accountId, id } } });
      if (!row) return { ok: false, reason: "not_found" };
      return { ok: true, row };
    },
    async listInteractions(accountId) {
      return db.applyFlowContactInteractionRecord.findMany({ where: { accountId } });
    },
    async getInteraction(accountId, id) {
      return db.applyFlowContactInteractionRecord.findUnique({ where: { accountId_id: { accountId, id } } });
    },
    async insertInteraction(row) {
      try {
        return await db.applyFlowContactInteractionRecord.create({
          data: {
            accountId: row.accountId,
            id: row.id,
            contactId: row.contactId,
            applicationId: row.applicationId,
            jobId: row.jobId,
            payload: json(row.payload),
            fingerprint: row.fingerprint,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
        throw error;
      }
    },
    async listResponses(accountId) {
      return db.applyFlowInboundResponseRecord.findMany({ where: { accountId } });
    },
    async getResponse(accountId, id) {
      return db.applyFlowInboundResponseRecord.findUnique({ where: { accountId_id: { accountId, id } } });
    },
    async getResponseByIdentity(accountId, provider, emailId) {
      return db.applyFlowInboundResponseRecord.findUnique({
        where: { accountId_provider_emailId: { accountId, provider, emailId } },
      });
    },
    async insertResponse(row) {
      try {
        return await db.applyFlowInboundResponseRecord.create({
          data: {
            accountId: row.accountId,
            id: row.id,
            provider: row.provider,
            emailId: row.emailId,
            applicationId: row.applicationId,
            state: row.state,
            payload: json(row.payload),
            version: row.version,
            fingerprint: row.fingerprint,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
        throw error;
      }
    },
    async updateResponse(accountId, id, expectedVersion, next) {
      const updated = await db.applyFlowInboundResponseRecord.updateMany({
        where: { accountId, id, version: expectedVersion },
        data: {
          applicationId: next.applicationId,
          state: next.state,
          payload: json(next.payload),
          fingerprint: next.fingerprint,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        const current = await db.applyFlowInboundResponseRecord.findUnique({
          where: { accountId_id: { accountId, id } },
        });
        return { ok: false, reason: current ? "conflict" : "not_found" };
      }
      const row = await db.applyFlowInboundResponseRecord.findUnique({ where: { accountId_id: { accountId, id } } });
      if (!row) return { ok: false, reason: "not_found" };
      return { ok: true, row };
    },
    async listEvents(accountId) {
      const rows = await db.applyFlowCareerEventRecord.findMany({
        where: { accountId },
        orderBy: { occurredAt: "asc" },
      });
      return rows.map(
        (row): CareerEventRow => ({
          ...row,
          occurredAt: row.occurredAt.toISOString(),
        }),
      );
    },
    async insertEvent(row) {
      try {
        const created = await db.applyFlowCareerEventRecord.create({
          data: {
            accountId: row.accountId,
            id: row.id,
            applicationId: row.applicationId,
            jobId: row.jobId,
            eventType: row.eventType,
            occurredAt: new Date(row.occurredAt),
            dedupeKey: row.dedupeKey,
            payload: json(row.payload),
          },
        });
        return { ...created, occurredAt: created.occurredAt.toISOString() };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate";
        throw error;
      }
    },
    async findImportSession(accountId, module, bundleFingerprint) {
      const row = await db.applyFlowPersonalImportSession.findUnique({
        where: {
          accountId_module_bundleFingerprint: { accountId, module, bundleFingerprint },
        },
      });
      return row ? toSession(row) : null;
    },
    async insertImportSession(row) {
      const created = await db.applyFlowPersonalImportSession.create({
        data: {
          id: row.id,
          accountId: row.accountId,
          module: row.module,
          bundleFingerprint: row.bundleFingerprint,
          status: row.status,
          expectedCount: row.expectedCount,
          processedCount: row.processedCount,
          conflictSummary: row.conflictSummary == null ? Prisma.DbNull : json(row.conflictSummary),
          completedAt: row.completedAt ? new Date(row.completedAt) : null,
        },
      });
      return toSession(created);
    },
    async updateImportSession(id, accountId, patch) {
      const current = await db.applyFlowPersonalImportSession.findUnique({ where: { id } });
      if (!current || current.accountId !== accountId) return null;
      const updated = await db.applyFlowPersonalImportSession.update({
        where: { id },
        data: {
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.processedCount != null ? { processedCount: patch.processedCount } : {}),
          ...(patch.conflictSummary !== undefined
            ? {
                conflictSummary:
                  patch.conflictSummary == null ? Prisma.DbNull : json(patch.conflictSummary),
              }
            : {}),
          ...(patch.completedAt !== undefined
            ? { completedAt: patch.completedAt ? new Date(patch.completedAt) : null }
            : {}),
        },
      });
      return toSession(updated);
    },
    async hasApplication(accountId, id) {
      const row = await db.applyFlowApplication.findUnique({
        where: { accountId_id: { accountId, id } },
        select: { id: true },
      });
      return row != null;
    },
    async hasJob(accountId, id) {
      const row = await db.applyFlowJob.findUnique({
        where: { accountId_id: { accountId, id } },
        select: { id: true },
      });
      return row != null;
    },
  };
}

function toSession(row: {
  id: string;
  accountId: string;
  module: string;
  bundleFingerprint: string;
  status: string;
  expectedCount: number;
  processedCount: number;
  conflictSummary: unknown;
  completedAt: Date | null;
}): ImportSessionRow {
  return {
    id: row.id,
    accountId: row.accountId,
    module: row.module as PersonalImportModule,
    bundleFingerprint: row.bundleFingerprint,
    status: row.status as ImportSessionRow["status"],
    expectedCount: row.expectedCount,
    processedCount: row.processedCount,
    conflictSummary: row.conflictSummary,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export const applyFlowPersonalStore = createPrismaPersonalStore();
