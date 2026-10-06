import { createHash, randomBytes, randomUUID } from "node:crypto";

import { applyflowPrisma } from "../db";

export const EXTENSION_GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ExtensionGrantRecord = {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ExtensionGrantStore = {
  insert(row: ExtensionGrantRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<ExtensionGrantRecord | null>;
  revokeAll(accountId: string, revokedAt: Date): Promise<number>;
};

export function hashExtensionGrantToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createMemoryExtensionGrantStore(): ExtensionGrantStore {
  const rows: ExtensionGrantRecord[] = [];
  return {
    async insert(row) {
      rows.push(row);
    },
    async findByHash(tokenHash) {
      return rows.find((row) => row.tokenHash === tokenHash) ?? null;
    },
    async revokeAll(accountId, revokedAt) {
      let count = 0;
      for (const row of rows) {
        if (row.accountId === accountId && row.revokedAt == null) {
          row.revokedAt = revokedAt;
          count += 1;
        }
      }
      return count;
    },
  };
}

export function createExtensionGrantService(store: ExtensionGrantStore, now = () => new Date()) {
  return {
    async mint(accountId: string): Promise<{ token: string; accountId: string; expiresAt: string }> {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(now().getTime() + EXTENSION_GRANT_TTL_MS);
      await store.insert({
        id: randomUUID(),
        accountId,
        tokenHash: hashExtensionGrantToken(token),
        expiresAt,
        revokedAt: null,
      });
      return { token, accountId, expiresAt: expiresAt.toISOString() };
    },

    async resolve(token: string | null | undefined): Promise<{ accountId: string } | null> {
      if (!token) return null;
      const row = await store.findByHash(hashExtensionGrantToken(token));
      if (!row || row.revokedAt) return null;
      if (row.expiresAt.getTime() <= now().getTime()) return null;
      return { accountId: row.accountId };
    },

    async revokeAccount(accountId: string): Promise<void> {
      await store.revokeAll(accountId, now());
    },
  };
}

export function createPrismaExtensionGrantStore(
  db: typeof applyflowPrisma = applyflowPrisma,
): ExtensionGrantStore {
  return {
    async insert(row) {
      await db.applyFlowExtensionGrant.create({
        data: {
          id: row.id,
          accountId: row.accountId,
          tokenHash: row.tokenHash,
          expiresAt: row.expiresAt,
        },
      });
    },
    async findByHash(tokenHash) {
      return db.applyFlowExtensionGrant.findUnique({ where: { tokenHash } });
    },
    async revokeAll(accountId, revokedAt) {
      const result = await db.applyFlowExtensionGrant.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt },
      });
      return result.count;
    },
  };
}

export const applyFlowExtensionGrants = createExtensionGrantService(createPrismaExtensionGrantStore());
