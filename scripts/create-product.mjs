#!/usr/bin/env node
/**
 * Creates a new product app from templates/product-app.
 * Usage: pnpm create-product <name>
 * Example: pnpm create-product crm
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE = path.join(ROOT, "templates", "product-app");
const APPS = path.join(ROOT, "apps");

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error("Usage: pnpm create-product <name>");
  console.error("  name: lowercase, alphanumeric and hyphens only (e.g. crm, my-product)");
  process.exit(1);
}

const appDir = path.join(APPS, name);
if (fs.existsSync(appDir)) {
  console.error(`Error: apps/${name} already exists.`);
  process.exit(1);
}

const title = name
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(" ");

function copyRecursive(src, dest, replacements = {}) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === ".gitkeep") continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry), replacements);
    }
    return;
  }
  let content = fs.readFileSync(src, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(dest, content);
}

const replacements = {
  "Product | DevFlow": `${title} | DevFlow`,
  "Product app — replace": `${title} app`,
  "ProductHome": `${title.replace(/\s/g, "")}Home`,
  Product: title,
  "product": name,
  '"product"': `"${name}"`,
};

fs.mkdirSync(appDir, { recursive: true });
copyRecursive(TEMPLATE, appDir, replacements);

const KNOWN_APP_PORTS = { site: 3000, financeiro: 3001, investigamais: 3002, funklab: 3003, "whatsapp-platform": 3004, ops: 3005 };
const port = KNOWN_APP_PORTS[name] ?? 3010;

const pkgPath = path.join(appDir, "package.json");
if (!fs.existsSync(pkgPath)) {
  const pkg = {
    name: `@devflow/app-${name}`,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: `next dev --port ${port}`,
      build: "next build",
      start: "next start",
      lint: "eslint",
    },
    dependencies: {
      "@devflow/ui": "workspace:*",
      next: "16.1.6",
      react: "19.2.3",
      "react-dom": "19.2.3",
    },
    devDependencies: {
      "@tailwindcss/postcss": "^4",
      "@types/node": "^20",
      "@types/react": "^19",
      "@types/react-dom": "^19",
      eslint: "^9",
      "eslint-config-next": "16.1.6",
      tailwindcss: "^4",
      typescript: "^5",
    },
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
} else {
  let pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = `@devflow/app-${name}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

// Add next.config and postcss if missing
const nextConfigPath = path.join(appDir, "next.config.ts");
if (!fs.existsSync(nextConfigPath)) {
  fs.writeFileSync(
    nextConfigPath,
    `import type { NextConfig } from "next";
const nextConfig: NextConfig = { transpilePackages: ["@devflow/ui"] };
export default nextConfig;
`
  );
}

const postcssPath = path.join(appDir, "postcss.config.mjs");
if (!fs.existsSync(postcssPath)) {
  fs.writeFileSync(
    postcssPath,
    `const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
`
  );
}

// tsconfig with paths
const tsconfigPath = path.join(appDir, "tsconfig.json");
if (!fs.existsSync(tsconfigPath)) {
  const tsconfig = {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: {
        "@/*": ["./src/*"],
        "@devflow/ui": ["../../packages/ui/src"],
        "@devflow/billing-core": ["../../packages/billing-core/src"],
        "@devflow/analytics-core": ["../../packages/analytics-core/src"],
        "@devflow/auth-core": ["../../packages/auth-core/src"],
        "@devflow/supabase-utils": ["../../packages/supabase-utils/src"],
        "@devflow/testing-utils": ["../../packages/testing-utils/src"],
        "@devflow/config": ["../../packages/config"],
        "@devflow/whatsapp-core": ["../../packages/whatsapp-core/src"],
        "@devflow/ai-core": ["../../packages/ai-core/src"],
      },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
    exclude: ["node_modules"],
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
}

console.log(`Created apps/${name}. Next steps:`);
console.log(`  cd apps/${name} && pnpm install`);
console.log(`  Add apps/${name} to eslint.config.mjs APP_NAMES if you want boundary rules.`);
console.log(`  See docs/PRODUCT_CREATION_GUIDE.md.`);
