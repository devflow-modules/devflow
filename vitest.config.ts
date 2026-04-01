import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    /**
     * Padrão: node (motores, analytics, integridade).
     * jsdom: comentário @vitest-environment jsdom no topo do arquivo (RTL, storage, componentes).
     */
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@wa": path.resolve(__dirname, "./apps/whatsapp-platform/src"),
    },
  },
});
