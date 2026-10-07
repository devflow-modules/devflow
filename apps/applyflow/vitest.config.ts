import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: [
      "src/lib/persistence-v2/personal/personal-persistence.local.test.ts",
      "src/lib/persistence-v2/personal/runtime-role.local.test.ts",
    ],
    setupFiles: ["./src/lib/persistence-v2/migration/f3-5-vitest-env-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
