import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Disposable-Postgres check for the scopes DEFAULT migration.
 * No setupFiles: the default Vitest setup loads apps/applyflow/.env.local.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/persistence-v2/personal/extension-grant-scopes-default.local.test.ts"],
    setupFiles: [],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
