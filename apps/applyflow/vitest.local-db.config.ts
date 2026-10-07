import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/lib/persistence-v2/personal/personal-persistence.local.test.ts",
      "src/lib/persistence-v2/personal/runtime-role.local.test.ts",
    ],
    exclude: [],
    setupFiles: ["./src/lib/persistence-v2/personal/personal-local-db.setup.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
