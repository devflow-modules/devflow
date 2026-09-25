import { Prisma } from "@prisma/client";

import { applyflowPrisma } from "../db";
import type {
  ApplyFlowApplication,
  ApplyFlowApplicationCreateInput,
  ApplyFlowApplicationUpdateInput,
  ApplyFlowPersistenceDb,
  OptimisticUpdateResult,
} from "./types";

export type ApplicationListOptions = {
  take?: number;
  skip?: number;
};

function requireAccountId(accountId: string): string {
  if (!accountId || typeof accountId !== "string") {
    throw new Error("accountId is required for ApplyFlow application repository calls.");
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

export function createApplyFlowApplicationRepository(
  db: ApplyFlowPersistenceDb = applyflowPrisma,
) {
  return {
    async create(input: ApplyFlowApplicationCreateInput): Promise<ApplyFlowApplication> {
      const accountId = requireAccountId(input.accountId);
      return db.applyFlowApplication.create({
        data: {
          accountId,
          id: input.id,
          sourceJobId: input.sourceJobId ?? null,
          source: input.source,
          status: input.status,
          jobTitle: input.jobTitle ?? null,
          companyName: input.companyName ?? null,
          jobUrl: input.jobUrl ?? null,
          fitScore: input.fitScore ?? null,
          notes: input.notes ?? null,
          jobMeta: jsonOrDbNull(input.jobMeta),
          v2Meta: jsonOrDbNull(input.v2Meta),
          extras: jsonOrDbNull(input.extras),
          appliedAt: input.appliedAt ?? null,
        },
      });
    },

    async upsert(input: ApplyFlowApplicationCreateInput): Promise<ApplyFlowApplication> {
      const accountId = requireAccountId(input.accountId);
      return db.applyFlowApplication.upsert({
        where: { accountId_id: { accountId, id: input.id } },
        create: {
          accountId,
          id: input.id,
          sourceJobId: input.sourceJobId ?? null,
          source: input.source,
          status: input.status,
          jobTitle: input.jobTitle ?? null,
          companyName: input.companyName ?? null,
          jobUrl: input.jobUrl ?? null,
          fitScore: input.fitScore ?? null,
          notes: input.notes ?? null,
          jobMeta: jsonOrDbNull(input.jobMeta),
          v2Meta: jsonOrDbNull(input.v2Meta),
          extras: jsonOrDbNull(input.extras),
          appliedAt: input.appliedAt ?? null,
        },
        update: {
          sourceJobId: input.sourceJobId ?? null,
          source: input.source,
          status: input.status,
          jobTitle: input.jobTitle ?? null,
          companyName: input.companyName ?? null,
          jobUrl: input.jobUrl ?? null,
          fitScore: input.fitScore ?? null,
          notes: input.notes ?? null,
          jobMeta: jsonOrDbNull(input.jobMeta),
          v2Meta: jsonOrDbNull(input.v2Meta),
          extras: jsonOrDbNull(input.extras),
          appliedAt: input.appliedAt ?? null,
        },
      });
    },

    async findById(accountId: string, id: string): Promise<ApplyFlowApplication | null> {
      return db.applyFlowApplication.findUnique({
        where: { accountId_id: { accountId: requireAccountId(accountId), id } },
      });
    },

    async list(accountId: string, options: ApplicationListOptions = {}): Promise<ApplyFlowApplication[]> {
      return db.applyFlowApplication.findMany({
        where: { accountId: requireAccountId(accountId) },
        orderBy: { updatedAt: "desc" },
        take: options.take,
        skip: options.skip,
      });
    },

    async findBySourceJobId(accountId: string, sourceJobId: string): Promise<ApplyFlowApplication[]> {
      return db.applyFlowApplication.findMany({
        where: { accountId: requireAccountId(accountId), sourceJobId },
        orderBy: { createdAt: "asc" },
      });
    },

    async updateWithVersion(
      accountId: string,
      id: string,
      expectedVersion: number,
      patch: ApplyFlowApplicationUpdateInput,
    ): Promise<OptimisticUpdateResult<ApplyFlowApplication>> {
      const scopedAccountId = requireAccountId(accountId);
      const data: Prisma.ApplyFlowApplicationUpdateManyMutationInput = {
        version: { increment: 1 },
      };
      if (patch.sourceJobId !== undefined) data.sourceJobId = patch.sourceJobId;
      if (patch.source !== undefined) data.source = patch.source;
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.jobTitle !== undefined) data.jobTitle = patch.jobTitle;
      if (patch.companyName !== undefined) data.companyName = patch.companyName;
      if (patch.jobUrl !== undefined) data.jobUrl = patch.jobUrl;
      if (patch.fitScore !== undefined) data.fitScore = patch.fitScore;
      if (patch.notes !== undefined) data.notes = patch.notes;
      if (patch.jobMeta !== undefined) data.jobMeta = jsonOrDbNull(patch.jobMeta);
      if (patch.v2Meta !== undefined) data.v2Meta = jsonOrDbNull(patch.v2Meta);
      if (patch.extras !== undefined) data.extras = jsonOrDbNull(patch.extras);
      if (patch.appliedAt !== undefined) data.appliedAt = patch.appliedAt;

      const result = await db.applyFlowApplication.updateMany({
        where: { accountId: scopedAccountId, id, version: expectedVersion },
        data,
      });

      if (result.count === 0) {
        const existing = await db.applyFlowApplication.findUnique({
          where: { accountId_id: { accountId: scopedAccountId, id } },
        });
        return { ok: false, reason: existing ? "conflict" : "not_found" };
      }

      const record = await db.applyFlowApplication.findUnique({
        where: { accountId_id: { accountId: scopedAccountId, id } },
      });
      if (!record) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: true, record };
    },
  };
}

export type ApplyFlowApplicationRepository = ReturnType<typeof createApplyFlowApplicationRepository>;

export const applyFlowApplicationRepository = createApplyFlowApplicationRepository();
