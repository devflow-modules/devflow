import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Options + service worker. Correr depois de `vite build --config vite.config.content.ts`
 * (`emptyOutDir: false` preserva `content.js`).
 */
export default defineConfig({
  base: "./",
  /* Automatic JSX runtime (react-jsx): evita React.createElement sem `import React` nos .tsx das opções. */
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background/service-worker.ts"),
        options: path.resolve(__dirname, "options.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
