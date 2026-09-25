import type { ApplyFlowApplication, ApplyFlowJob, Prisma, PrismaClient } from "@prisma/client";

type JobDelegate = PrismaClient["applyFlowJob"];
type ApplicationDelegate = PrismaClient["applyFlowApplication"];

export type ApplyFlowPersistenceDb = {
  applyFlowJob: JobDelegate;
  applyFlowApplication: ApplicationDelegate;
  $transaction: <T>(
    fn: (tx: { applyFlowJob: JobDelegate; applyFlowApplication: ApplicationDelegate }) => Promise<T>,
  ) => Promise<T>;
};

export type OptimisticUpdateResult<T> =
  | { ok: true; record: T }
  | { ok: false; reason: "conflict" | "not_found" };

export type ApplyFlowJobCreateInput = {
  accountId: string;
  id: string;
  title: string;
  company?: string | null;
  location?: string | null;
  url?: string | null;
  canonicalUrl?: string | null;
  source: string;
  status: string;
  jobContext: Prisma.InputJsonValue;
  descriptionSnapshot?: string | null;
  descriptionHash?: string | null;
  jobMatch: Prisma.InputJsonValue;
  evaluatedWith?: Prisma.InputJsonValue | null;
  curriculumRecommendation?: Prisma.InputJsonValue | null;
  applicationPack?: Prisma.InputJsonValue | null;
};

export type ApplyFlowJobUpdateInput = {
  title?: string;
  company?: string | null;
  location?: string | null;
  url?: string | null;
  canonicalUrl?: string | null;
  source?: string;
  status?: string;
  jobContext?: Prisma.InputJsonValue;
  descriptionSnapshot?: string | null;
  descriptionHash?: string | null;
  jobMatch?: Prisma.InputJsonValue;
  evaluatedWith?: Prisma.InputJsonValue | null;
  curriculumRecommendation?: Prisma.InputJsonValue | null;
  applicationPack?: Prisma.InputJsonValue | null;
};

export type ApplyFlowApplicationCreateInput = {
  accountId: string;
  id: string;
  sourceJobId?: string | null;
  source: string;
  status: string;
  jobTitle?: string | null;
  companyName?: string | null;
  jobUrl?: string | null;
  fitScore?: number | null;
  notes?: string | null;
  jobMeta?: Prisma.InputJsonValue | null;
  v2Meta?: Prisma.InputJsonValue | null;
  extras?: Prisma.InputJsonValue | null;
  appliedAt?: Date | null;
};

export type ApplyFlowApplicationUpdateInput = {
  sourceJobId?: string | null;
  source?: string;
  status?: string;
  jobTitle?: string | null;
  companyName?: string | null;
  jobUrl?: string | null;
  fitScore?: number | null;
  notes?: string | null;
  jobMeta?: Prisma.InputJsonValue | null;
  v2Meta?: Prisma.InputJsonValue | null;
  extras?: Prisma.InputJsonValue | null;
  appliedAt?: Date | null;
};

export type { ApplyFlowApplication, ApplyFlowJob };
