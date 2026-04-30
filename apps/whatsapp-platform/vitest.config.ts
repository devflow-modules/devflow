import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    /**
     * Projects separados para manter previsibilidade:
     * - node: API/services
     * - ui: componentes React/Testing Library
     */
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
          exclude: ["src/**/*.test.tsx", "src/lib/__tests__/useMediaMinWidth.test.ts"],
          setupFiles: ["./src/test/setup-node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "src/lib/__tests__/useMediaMinWidth.test.ts"],
          setupFiles: ["./src/test/setup-ui.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/generated/**",
        "**/*.config.*",
        "**/test/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
