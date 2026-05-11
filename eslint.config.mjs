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
  "applyflow-extension",
  "applyflow",
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
            ...(app === "whatsapp-platform"
              ? [
                  {
                    group: ["**/modules/queues", "**/modules/queues/**"],
                    message:
                      "Módulo legado removido; use inboxOperationalQueueService. Ver docs/architecture/OPERATIONAL_QUEUES_CANONICAL.md.",
                  },
                  {
                    group: ["**/modules/agents", "**/modules/agents/**"],
                    message:
                      "Módulo legado removido; agentes operacionais = User + WaInboxThread.assignedToUserId + operationsAgentsService. Ver CONVERSATION_OWNERSHIP_AND_HANDOFF.md.",
                  },
                ]
              : []),
          ],
          ...(app === "whatsapp-platform"
            ? {
                paths: [
                  {
                    name: "@/modules/queues",
                    message:
                      "Removido: use inboxOperationalQueueService e WaInboxQueue (OPERATIONAL_QUEUES_CANONICAL.md).",
                  },
                  {
                    name: "@/modules/agents",
                    message:
                      "Removido: use threadAssignmentService, operationsAgentsService (CONVERSATION_OWNERSHIP_AND_HANDOFF.md).",
                  },
                ],
              }
            : {}),
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
  /** Design system: literais de className com utilitários Tailwind legados (paridade com `lint:design-system`). */
  {
    files: [
      "src/**/*.{ts,tsx}",
      "apps/**/src/**/*.{ts,tsx}",
      "packages/**/src/**/*.{ts,tsx}",
      "templates/**/src/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/generated/**",
      "**/__tests__/**",
      "**/*.{test,spec}.{ts,tsx}",
      /** Dashboard ApplyFlow: UI autónoma dark (sem df-* do portal). */
      "apps/applyflow/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/text-(slate|gray|zinc)-/]",
          message: "Usar df-text-* / tokens DevFlow em vez de text-slate|gray|zinc.",
        },
        {
          selector: "Literal[value=/border-(slate|gray|zinc)-/]",
          message: "Usar border-border / df-border-dark em vez de border-slate|gray|zinc.",
        },
        {
          selector: "Literal[value=/bg-(slate|gray|zinc)-/]",
          message: "Usar bg-card / bg-muted / tokens em vez de bg-slate|gray|zinc.",
        },
        {
          selector: "Literal[value=/\\\\bbg-white\\\\b/]",
          message: "Evitar bg-white solto; preferir bg-card / df-section-light.",
        },
      ],
    },
  },
]);

export default eslintConfig;
