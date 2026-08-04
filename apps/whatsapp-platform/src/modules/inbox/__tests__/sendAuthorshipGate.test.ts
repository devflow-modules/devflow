import { describe, expect, it } from "vitest";
import {
  evaluateSendAuthorship,
  shouldEnforceSendAuthorship,
  SEND_AUTHORSHIP_CODES,
} from "../sendAuthorshipGate";

describe("sendAuthorshipGate", () => {
  it("permite OPEN unassigned ou próprio assignee", () => {
    expect(
      evaluateSendAuthorship({
        status: "OPEN",
        assignedToUserId: null,
        callerUserId: "u1",
      })
    ).toEqual({ ok: true });
    expect(
      evaluateSendAuthorship({
        status: "PENDING",
        assignedToUserId: "u1",
        callerUserId: "u1",
      })
    ).toEqual({ ok: true });
  });

  it("bloqueia CLOSED", () => {
    const r = evaluateSendAuthorship({
      status: "CLOSED",
      assignedToUserId: "u1",
      callerUserId: "u1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(SEND_AUTHORSHIP_CODES.THREAD_CLOSED);
  });

  it("bloqueia outro assignee", () => {
    const r = evaluateSendAuthorship({
      status: "OPEN",
      assignedToUserId: "u2",
      callerUserId: "u1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(SEND_AUTHORSHIP_CODES.THREAD_ASSIGNED_TO_OTHER);
  });

  it("fail-closed para caller ou status desconhecido", () => {
    expect(
      evaluateSendAuthorship({ status: "OPEN", assignedToUserId: null, callerUserId: "" }).ok
    ).toBe(false);
    expect(
      evaluateSendAuthorship({ status: "WEIRD", assignedToUserId: null, callerUserId: "u1" }).ok
    ).toBe(false);
  });

  it("shouldEnforceSendAuthorship salta COMPLETED/META_ACCEPTED/SENDING", () => {
    expect(shouldEnforceSendAuthorship(null)).toBe(true);
    expect(shouldEnforceSendAuthorship("PENDING")).toBe(true);
    expect(shouldEnforceSendAuthorship("FAILED_PRE_META")).toBe(true);
    expect(shouldEnforceSendAuthorship("COMPLETED")).toBe(false);
    expect(shouldEnforceSendAuthorship("META_ACCEPTED")).toBe(false);
    expect(shouldEnforceSendAuthorship("SENDING")).toBe(false);
  });
});
