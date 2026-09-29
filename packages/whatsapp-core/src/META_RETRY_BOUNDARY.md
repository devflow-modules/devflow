/**
 * Docs: timeout / network after outbound send does not prove Meta rejection.
 * Ledger must treat as FAILED_PRE_META only when Meta returned an error response;
 * ambiguous outcomes must not trigger automatic resend (UNKNOWN_OUTCOME / reconcile).
 */
export const META_SEND_AMBIGUOUS_OUTCOME_NOTE =
  "A timeout or network failure after the HTTP request starts does not prove Meta rejected the message. Do not blind-retry sendText; use the outbound ledger / UNKNOWN_OUTCOME reconcile path.";
