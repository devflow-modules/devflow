import { Prisma } from "@prisma/client";

import { applyflowPrisma } from "../db";
import type {
  ApplyFlowJob,
  ApplyFlowJobCreateInput,
  ApplyFlowJobUpdateInput,
  ApplyFlowPersistenceDb,
  OptimisticUpdateResult,
} from "./types";

export type JobListOptions = {
  take?: number;
  skip?: number;
};

function requireAccountId(accountId: string): string {
  if (!accountId || typeof accountId !== "string") {
    throw new Error("accountId is required for ApplyFlow job repository calls.");
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

export function createApplyFlowJobRepository(db: ApplyFlowPersistenceDb = applyflowPrisma) {
  return {
    async create(input: ApplyFlowJobCreateInput): Promise<ApplyFlowJob> {
      const accountId = requireAccountId(input.accountId);
      return db.applyFlowJob.create({
        data: {
          accountId,
          id: input.id,
          title: input.title,
          company: input.company ?? null,
          location: input.location ?? null,
          url: input.url ?? null,
          canonicalUrl: input.canonicalUrl ?? null,
          source: input.source,
          status: input.status,
          jobContext: input.jobContext,
          descriptionSnapshot: input.descriptionSnapshot ?? null,
          descriptionHash: input.descriptionHash ?? null,
          jobMatch: input.jobMatch,
          evaluatedWith: jsonOrDbNull(input.evaluatedWith),
          curriculumRecommendation: jsonOrDbNull(input.curriculumRecommendation),
          applicationPack: jsonOrDbNull(input.applicationPack),
        },
      });
    },

    async upsert(input: ApplyFlowJobCreateInput): Promise<ApplyFlowJob> {
      const accountId = requireAccountId(input.accountId);
      return db.applyFlowJob.upsert({
        where: { accountId_id: { accountId, id: input.id } },
        create: {
          accountId,
          id: input.id,
          title: input.title,
          company: input.company ?? null,
          location: input.location ?? null,
          url: input.url ?? null,
          canonicalUrl: input.canonicalUrl ?? null,
          source: input.source,
          status: input.status,
          jobContext: input.jobContext,
          descriptionSnapshot: input.descriptionSnapshot ?? null,
          descriptionHash: input.descriptionHash ?? null,
          jobMatch: input.jobMatch,
          evaluatedWith: jsonOrDbNull(input.evaluatedWith),
          curriculumRecommendation: jsonOrDbNull(input.curriculumRecommendation),
          applicationPack: jsonOrDbNull(input.applicationPack),
        },
        update: {
          title: input.title,
          company: input.company ?? null,
          location: input.location ?? null,
          url: input.url ?? null,
          canonicalUrl: input.canonicalUrl ?? null,
          source: input.source,
          status: input.status,
          jobContext: input.jobContext,
          descriptionSnapshot: input.descriptionSnapshot ?? null,
          descriptionHash: input.descriptionHash ?? null,
          jobMatch: input.jobMatch,
          evaluatedWith: jsonOrDbNull(input.evaluatedWith),
          curriculumRecommendation: jsonOrDbNull(input.curriculumRecommendation),
          applicationPack: jsonOrDbNull(input.applicationPack),
        },
      });
    },

    async findById(accountId: string, id: string): Promise<ApplyFlowJob | null> {
      return db.applyFlowJob.findUnique({
        where: { accountId_id: { accountId: requireAccountId(accountId), id } },
      });
    },

    async list(accountId: string, options: JobListOptions = {}): Promise<ApplyFlowJob[]> {
      return db.applyFlowJob.findMany({
        where: { accountId: requireAccountId(accountId) },
        orderBy: { updatedAt: "desc" },
        take: options.take,
        skip: options.skip,
      });
    },

    async findByCanonicalUrl(accountId: string, canonicalUrl: string): Promise<ApplyFlowJob[]> {
      return db.applyFlowJob.findMany({
        where: { accountId: requireAccountId(accountId), canonicalUrl },
      });
    },

    async findByDescriptionHash(accountId: string, descriptionHash: string): Promise<ApplyFlowJob[]> {
      return db.applyFlowJob.findMany({
        where: { accountId: requireAccountId(accountId), descriptionHash },
      });
    },

    async updateWithVersion(
      accountId: string,
      id: string,
      expectedVersion: number,
      patch: ApplyFlowJobUpdateInput,
    ): Promise<OptimisticUpdateResult<ApplyFlowJob>> {
      const scopedAccountId = requireAccountId(accountId);
      const data: Prisma.ApplyFlowJobUpdateManyMutationInput = {
        version: { increment: 1 },
      };
      if (patch.title !== undefined) data.title = patch.title;
      if (patch.company !== undefined) data.company = patch.company;
      if (patch.location !== undefined) data.location = patch.location;
      if (patch.url !== undefined) data.url = patch.url;
      if (patch.canonicalUrl !== undefined) data.canonicalUrl = patch.canonicalUrl;
      if (patch.source !== undefined) data.source = patch.source;
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.jobContext !== undefined) data.jobContext = patch.jobContext;
      if (patch.descriptionSnapshot !== undefined) data.descriptionSnapshot = patch.descriptionSnapshot;
      if (patch.descriptionHash !== undefined) data.descriptionHash = patch.descriptionHash;
      if (patch.jobMatch !== undefined) data.jobMatch = patch.jobMatch;
      if (patch.evaluatedWith !== undefined) data.evaluatedWith = jsonOrDbNull(patch.evaluatedWith);
      if (patch.curriculumRecommendation !== undefined) {
        data.curriculumRecommendation = jsonOrDbNull(patch.curriculumRecommendation);
      }
      if (patch.applicationPack !== undefined) data.applicationPack = jsonOrDbNull(patch.applicationPack);

      const result = await db.applyFlowJob.updateMany({
        where: { accountId: scopedAccountId, id, version: expectedVersion },
        data,
      });

      if (result.count === 0) {
        const existing = await db.applyFlowJob.findUnique({
          where: { accountId_id: { accountId: scopedAccountId, id } },
        });
        return { ok: false, reason: existing ? "conflict" : "not_found" };
      }

      const record = await db.applyFlowJob.findUnique({
        where: { accountId_id: { accountId: scopedAccountId, id } },
      });
      if (!record) {
        return { ok: false, reason: "not_found" };
      }
      return { ok: true, record };
    },

    /**
     * Hard-delete a Job and soft-unlink Applications (null sourceJobId only).
     * Preserves Application.accountId ownership — intentional SET NULL semantics
     * without an unsafe composite FK.
     */
    async deleteById(accountId: string, id: string): Promise<{ deleted: boolean; unlinkedApplications: number }> {
      const scopedAccountId = requireAccountId(accountId);
      return db.$transaction(async (tx) => {
        const existing = await tx.applyFlowJob.findUnique({
          where: { accountId_id: { accountId: scopedAccountId, id } },
        });
        if (!existing) {
          return { deleted: false, unlinkedApplications: 0 };
        }

        const unlinked = await tx.applyFlowApplication.updateMany({
          where: { accountId: scopedAccountId, sourceJobId: id },
          data: { sourceJobId: null },
        });

        await tx.applyFlowJob.delete({
          where: { accountId_id: { accountId: scopedAccountId, id } },
        });

        return { deleted: true, unlinkedApplications: unlinked.count };
      });
    },
  };
}

export type ApplyFlowJobRepository = ReturnType<typeof createApplyFlowJobRepository>;

export const applyFlowJobRepository = createApplyFlowJobRepository();
