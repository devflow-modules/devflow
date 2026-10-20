import { createHash, randomBytes, randomUUID } from "node:crypto";

import { applyflowPrisma } from "../db";

import {
  type ExtensionGrantScope,
  parseExtensionGrantScopes,
} from "./extension-grant-scopes";

export const EXTENSION_GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ExtensionGrantRecord = {
  id: string;
  accountId: string;
  tokenHash: string;
  scopes: ExtensionGrantScope[];
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ExtensionGrantStore = {
  insert(row: ExtensionGrantRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<ExtensionGrantRecord | null>;
  revokeAll(accountId: string, revokedAt: Date): Promise<number>;
};

export type MintedExtensionGrant = {
  token: string;
  accountId: string;
  expiresAt: string;
  scopes: ExtensionGrantScope[];
};

export type ResolvedExtensionGrant = {
  accountId: string;
  scopes: ExtensionGrantScope[];
};

export function hashExtensionGrantToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeStoredScopes(raw: unknown): ExtensionGrantScope[] {
  const parsed = parseExtensionGrantScopes(raw);
  return parsed ?? [];
}

export function createMemoryExtensionGrantStore(): ExtensionGrantStore {
  const rows: ExtensionGrantRecord[] = [];
  return {
    async insert(row) {
      rows.push({ ...row, scopes: [...row.scopes] });
    },
    async findByHash(tokenHash) {
      const row = rows.find((item) => item.tokenHash === tokenHash);
      return row ? { ...row, scopes: [...row.scopes] } : null;
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
    async mint(accountId: string, scopes: readonly ExtensionGrantScope[]): Promise<MintedExtensionGrant> {
      const normalized = parseExtensionGrantScopes([...scopes]);
      if (!normalized) {
        throw new Error("extension_grant_scopes_required");
      }
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(now().getTime() + EXTENSION_GRANT_TTL_MS);
      await store.insert({
        id: randomUUID(),
        accountId,
        tokenHash: hashExtensionGrantToken(token),
        scopes: normalized,
        expiresAt,
        revokedAt: null,
      });
      return {
        token,
        accountId,
        expiresAt: expiresAt.toISOString(),
        scopes: normalized,
      };
    },

    async resolve(token: string | null | undefined): Promise<ResolvedExtensionGrant | null> {
      if (!token) return null;
      const row = await store.findByHash(hashExtensionGrantToken(token));
      if (!row || row.revokedAt) return null;
      if (row.expiresAt.getTime() <= now().getTime()) return null;
      const scopes = normalizeStoredScopes(row.scopes);
      if (scopes.length === 0) return null;
      return { accountId: row.accountId, scopes };
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
          scopes: row.scopes,
          expiresAt: row.expiresAt,
        },
      });
    },
    async findByHash(tokenHash) {
      const row = await db.applyFlowExtensionGrant.findUnique({ where: { tokenHash } });
      if (!row) return null;
      return {
        id: row.id,
        accountId: row.accountId,
        tokenHash: row.tokenHash,
        scopes: normalizeStoredScopes(row.scopes),
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
      };
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
