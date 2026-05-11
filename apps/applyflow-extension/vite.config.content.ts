/**
 * Build isolado do content script: `inlineDynamicImports` só é permitido com um único entry.
 * O build principal (`vite.config.ts`) gera options + background e não apaga `content.js`.
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/content/index.ts"),
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "content.js",
      },
    },
  },
});
