import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const APP_NAMES = [
  "site",
  "financeiro",
  "investigamais",
  "funklab",
  "whatsapp-platform",
  "ops",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "**/.next/**",
    "out/**",
    "**/out/**",
    "build/**",
    "**/dist/**",
    "next-env.d.ts",
    "node_modules/**",
    ".turbo/**",
    /** Prisma client gerado (CommonJS / tipos com `any` internos). */
    "apps/whatsapp-platform/src/generated/**",
  ]),
  // Boundary: no one may import from app packages (apps are not published).
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@devflow/app-*"], message: "Apps are not importable packages. Use packages/* only." },
          ],
        },
      ],
    },
  },
  // Packages: cannot import from any app.
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: APP_NAMES.map((app) => `*apps/${app}*`),
              message: "Packages cannot import from apps. Use only other packages.",
            },
          ],
        },
      ],
    },
  },
  // Apps: cannot import from other apps (per-app overrides).
  ...APP_NAMES.map((app) => ({
    files: [`apps/${app}/**/*.ts`, `apps/${app}/**/*.tsx`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: APP_NAMES.filter((a) => a !== app).map((a) => `*apps/${a}*`),
              message: "Apps cannot import from other apps.",
            },
          ],
        },
      ],
    },
  })),
  // Financeiro tests: mocks e spies costumam usar `any`; gate de CI cobre app + módulo.
  {
    files: [
      "src/modules/financeiro/__tests__/**/*.{ts,tsx}",
      "apps/financeiro/**/*.{test,spec}.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
