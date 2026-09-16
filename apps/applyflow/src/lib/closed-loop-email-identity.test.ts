import { describe, expect, it } from "vitest";

import {
  applyClosedLoopInboundIdentity,
  bindLegacyClosedLoopAccountScope,
  confirmLegacyClosedLoopAccountOwnership,
  resolveClosedLoopInboundEmailId,
} from "./closed-loop-email-identity";

const ACCOUNT_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const LEGACY_ID = "11111111111111111111111111111111";
const SCOPED_A = "22222222222222222222222222222222";
const SCOPED_B = "33333333333333333333333333333333";

const twentyLegacyIds = Array.from({ length: 20 }, (_, index) => `legacy-${String(index).padStart(2, "0")}-${"1".repeat(21)}`);

describe("closed-loop email identity", () => {
  it("reuses a legacy detection only for the already bound owner", () => {
    expect(
      resolveClosedLoopInboundEmailId({
        scopedId: SCOPED_A,
        legacyId: LEGACY_ID,
        accountScope: ACCOUNT_A,
        existingEmailIds: [LEGACY_ID],
        legacyOwnerScope: ACCOUNT_A,
      }),
    ).toBe(LEGACY_ID);
    expect(
      resolveClosedLoopInboundEmailId({
        scopedId: SCOPED_B,
        legacyId: LEGACY_ID,
        accountScope: ACCOUNT_B,
        existingEmailIds: [LEGACY_ID],
        legacyOwnerScope: ACCOUNT_A,
      }),
    ).toBe(SCOPED_B);
  });

  it("does not bind or reuse aliases when a different account is read first", () => {
    expect(
      bindLegacyClosedLoopAccountScope({
        existingEmailIds: twentyLegacyIds,
        selectedAccountScope: ACCOUNT_B,
      }),
    ).toBeUndefined();
    const firstRead = applyClosedLoopInboundIdentity({
      emails: [
        {
          id: SCOPED_B,
          legacyId: twentyLegacyIds[0],
          accountScope: ACCOUNT_B,
          receivedAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      existingEmailIds: twentyLegacyIds,
      selectedAccountScope: ACCOUNT_B,
    });
    expect(firstRead.legacyOwnerScope).toBeUndefined();
    expect(firstRead.emails[0]?.id).toBe(SCOPED_B);
    expect(firstRead.emails[0]?.id).not.toBe(twentyLegacyIds[0]);
  });

  it("keeps legacy unowned until explicit confirmation of the original account", () => {
    expect(
      bindLegacyClosedLoopAccountScope({
        existingEmailIds: twentyLegacyIds,
        selectedAccountScope: ACCOUNT_A,
      }),
    ).toBeUndefined();
    expect(
      bindLegacyClosedLoopAccountScope({
        existingEmailIds: twentyLegacyIds,
        selectedAccountScope: ACCOUNT_A,
        explicitConfirmation: true,
      }),
    ).toBe(ACCOUNT_A);
    expect(
      confirmLegacyClosedLoopAccountOwnership({
        existingEmailIds: twentyLegacyIds,
        selectedAccountScope: ACCOUNT_B,
        currentOwnerScope: ACCOUNT_A,
      }),
    ).toEqual({ ok: false, error: "already_bound" });
    expect(
      confirmLegacyClosedLoopAccountOwnership({
        existingEmailIds: twentyLegacyIds,
        selectedAccountScope: ACCOUNT_A,
      }),
    ).toEqual({ ok: true, legacyOwnerScope: ACCOUNT_A });
  });

  it("reuses legacy aliases only after explicit ownership confirmation", () => {
    const before = applyClosedLoopInboundIdentity({
      emails: [
        {
          id: SCOPED_A,
          legacyId: LEGACY_ID,
          accountScope: ACCOUNT_A,
          receivedAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      existingEmailIds: [LEGACY_ID],
      selectedAccountScope: ACCOUNT_A,
    });
    const after = applyClosedLoopInboundIdentity({
      emails: [
        {
          id: SCOPED_A,
          legacyId: LEGACY_ID,
          accountScope: ACCOUNT_A,
          receivedAt: "2026-09-15T18:00:00.000Z",
        },
      ],
      existingEmailIds: [LEGACY_ID],
      selectedAccountScope: ACCOUNT_A,
      explicitConfirmation: true,
    });
    expect(before.emails[0]?.id).toBe(SCOPED_A);
    expect(before.legacyOwnerScope).toBeUndefined();
    expect(after.emails[0]?.id).toBe(LEGACY_ID);
    expect(after.legacyOwnerScope).toBe(ACCOUNT_A);
  });
});
