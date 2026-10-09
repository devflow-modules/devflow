import assert from "node:assert/strict";
import test from "node:test";

import { childEnvWithoutPreviousSha, ignoreExitCode } from "./applyflow-vercel-ignore.mjs";

test("drops the previous SHA so turbo does not collapse the filter range", () => {
  const env = childEnvWithoutPreviousSha({
    VERCEL: "1",
    VERCEL_GIT_PREVIOUS_SHA: "18cf66203510e0f3d37917833b5fd41a601fba6a",
    TURBO_FORCE: "true",
    PATH: "kept",
  });
  assert.equal(env.VERCEL, "1");
  assert.equal(env.PATH, "kept");
  assert.equal("VERCEL_GIT_PREVIOUS_SHA" in env, false);
  assert.equal("TURBO_FORCE" in env, false);
});

test("skips only when the affected package list is empty", () => {
  assert.equal(ignoreExitCode([]), 0);
  assert.equal(ignoreExitCode(["applyflow"]), 1);
  assert.equal(ignoreExitCode(["@devflow/applyflow-core"]), 1);
  assert.equal(ignoreExitCode(undefined), 1);
});
