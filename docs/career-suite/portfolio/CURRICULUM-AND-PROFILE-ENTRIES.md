# Career Suite — Curriculum and profile entries

**Copy-ready.** Replace `[PERIOD]` and `[REPO_OR_CASE_URL]` before external use.  
Do not invent employment dates or commercial outcomes.

---

## GitHub repository

### Short description (EN, ≤350 chars)

Local-first Career Suite portfolio case — ApplyFlow + Interview Lab, typed CareerBundle handoff, provider-derived read-only enrichment, 1,045 Vitest tests. Apply/import deferred.

### About section (EN)

DevFlow monorepo includes **Career Suite** as a product and engineering portfolio case: modular apps (ApplyFlow, Interview Lab, Chrome MV3 extension) sharing `career-core` and `career-sync` packages. Local-first artifacts, human-reviewed provider signals, explicit export/handoff, ADRs and threat model. Not the public GTM focus of devflowlabs.com.br (WhatsApp + Financeiro).

**Start here:** `docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

### Suggested topics

```txt
typescript
nextjs
react
monorepo
turborepo
vitest
privacy
local-first
product-engineering
career-tech
chrome-extension
zod
architecture
```

### README hero line (EN)

> **Career Suite** — local-first, privacy-first career workflow with typed cross-app handoff, human-reviewed enrichment, and 1,045 Vitest tests. [Full case →](docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md)

---

## Curriculum — Portuguese

**Projeto:** DevFlow Career Suite (ApplyFlow + Interview Lab)  
**Papel:** Product Engineer / autor do case (portfólio)  
**Período:** `[PERIOD]`  
**Link:** `[REPO_OR_CASE_URL]` → `docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

**Impacto (bullets):**

- Concebido e implementado workflow **local-first** que liga organização de candidaturas à preparação para entrevistas via contrato **CareerBundle** versionado (Zod), sem backend obrigatório no loop principal.
- Implementado handoff **ApplyFlow → Interview Lab** com `postMessage`, validação de origem, ACK e fallback clipboard — sem dados sensíveis na URL.
- Modelado ciclo **provider-derived read-only** (sinais client-safe → revisão manual → proposta → preview → export) com **ADRs**, threat model e apply/import **explicitamente deferred**.
- Entregue **1.045 testes Vitest** no escopo Career Suite (`career-sync`, `career-core`, `applyflow`, `interview-lab`) e governança CI (routing, design system).
- Documentado case público com **screenshots verificados** da aplicação real (dados demo) e pacote de lançamento reutilizável.

**Tecnologias:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Chrome MV3, pnpm workspaces, Turborepo, Vitest, Zod, Recharts

---

## Curriculum — English

**Project:** DevFlow Career Suite (ApplyFlow + Interview Lab)  
**Role:** Product Engineer / case author (portfolio)  
**Period:** `[PERIOD]`  
**Link:** `[REPO_OR_CASE_URL]` → `docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

**Impact (bullets):**

- Designed and built a **local-first** workflow connecting job application organization to role-specific interview prep via a versioned **CareerBundle** contract (Zod), without a mandatory backend for the core loop.
- Implemented **ApplyFlow → Interview Lab** handoff using `postMessage`, origin validation, ACK, and clipboard fallback — no sensitive data in URLs.
- Modeled a **read-only provider-derived** enrichment lifecycle (client-safe signals → manual review → proposal → preview → export) with **ADRs**, threat model, and apply/import **explicitly deferred**.
- Delivered **1,045 Vitest tests** across Career Suite packages and CI governance (routing, design system).
- Published a public engineering case with **verified application screenshots** (demo data) and reusable launch materials.

**Technologies:** TypeScript, Next.js 16, React 19, Tailwind CSS v4, Chrome MV3, pnpm workspaces, Turborepo, Vitest, Zod, Recharts

---

## LinkedIn — project entry

**Title:** DevFlow Career Suite — Local-first career workflow (portfolio case)

**Description (EN):**

Portfolio case connecting ApplyFlow (applications dashboard + Chrome extension) and Interview Lab (import, Resume Match, practice) through a typed CareerBundle JSON contract. Highlights: human-in-the-loop provider-derived signals, explicit export/handoff, threat model and ADRs, 1,045 Vitest tests. Apply and proposal import explicitly deferred — read-only lifecycle through handoff.

**Skills (suggested):** TypeScript · Next.js · React · Product Engineering · System Design · Privacy by Design · Vitest · Monorepo · API Design · Chrome Extensions

**Media:** Upload `01-applyflow-dashboard.png` or `06-interview-lab-handoff.png`

**Link:** `[REPO_OR_CASE_URL]` or deep link to case markdown on GitHub

---

## LinkedIn — project entry (PT, short)

**Título:** DevFlow Career Suite — workflow de carreira local-first (case de portfólio)

**Descrição:** Case que conecta ApplyFlow e Interview Lab via CareerBundle tipado: organização de candidaturas, handoff explícito, enrichment read-only com revisão humana, 1.045 testes Vitest e documentação ADR. Sem auto-apply; apply/import deferred.

**Competências:** TypeScript · Next.js · Engenharia de Produto · Arquitetura de Software · Privacidade · Vitest

**Mídia recomendada:** `docs/career-suite/assets/01-applyflow-dashboard.png`
