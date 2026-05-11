import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: [path.resolve(__dirname, "./src/test/setup-vitest.ts")],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  },
});
