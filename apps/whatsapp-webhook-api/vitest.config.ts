import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: {
      WHATSAPP_DATABASE_URL: process.env.WHATSAPP_DATABASE_URL ?? "postgresql://localhost:5432/test",
    },
  },
});
