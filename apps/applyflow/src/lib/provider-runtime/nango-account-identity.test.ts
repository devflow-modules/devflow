import { describe, expect, it } from "vitest";

import {
  buildApplyFlowNangoAccountEndUserId,
  resolveNangoEndUserId,
} from "./nango-account-identity";
import { buildApplyFlowNangoEndUserId } from "./nango-server-provider";
import { CALLER_NONCE_A } from "./nango-route-test-fixtures";

const ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("Nango account ownership", () => {
  it("derives a stable end user id from the account and ignores the browser nonce", () => {
    const account = buildApplyFlowNangoAccountEndUserId("gmail", ACCOUNT_A);
    expect(account).toBe(buildApplyFlowNangoAccountEndUserId("gmail", ACCOUNT_A));
    expect(account).not.toBe(buildApplyFlowNangoAccountEndUserId("gmail", ACCOUNT_B));
    expect(account).not.toBe(buildApplyFlowNangoEndUserId("gmail", CALLER_NONCE_A));
    expect(account).not.toBe(buildApplyFlowNangoAccountEndUserId("calendar", ACCOUNT_A));
    expect(resolveNangoEndUserId("gmail", { accountId: ACCOUNT_A, callerNonce: CALLER_NONCE_A })).toBe(account);
  });
});
