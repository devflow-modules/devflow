import { describe, expect, it } from "vitest";

import { bumpAutofillSession, emptyAutofillSession } from "./autofill-session.js";

describe("bumpAutofillSession", () => {
  it("incrementa filled / failed / blocked", () => {
    let s = emptyAutofillSession();
    s = bumpAutofillSession(s, "success");
    s = bumpAutofillSession(s, "failed");
    s = bumpAutofillSession(s, "blocked");
    expect(s).toEqual({ filled: 1, failed: 1, blocked: 1 });
  });
});
