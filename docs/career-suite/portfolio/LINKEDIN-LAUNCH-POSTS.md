# Career Suite — LinkedIn launch posts

**Copy-ready drafts.** Publish manually — nothing in this repo posts automatically.  
**Evidence:** [EVIDENCE-AND-CLAIMS-MATRIX.md](./EVIDENCE-AND-CLAIMS-MATRIX.md) · **Screenshots:** `docs/career-suite/assets/`

**Suggested hero image:** `01-applyflow-dashboard.png` (posts 1–2) · `06-interview-lab-handoff.png` (handoff-focused)

**Canonical case link:** https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md

---

## Launch post — short (PT)

Candidaturas e preparação para entrevistas costumam viver em ferramentas separadas.

No **DevFlow Career Suite** (case de portfólio), conectei **ApplyFlow** + **Interview Lab** com um contrato tipado **CareerBundle**: organização local, handoff explícito por `postMessage` com ACK, e ciclo read-only de enrichment com revisão humana.

**1.045 testes Vitest** no escopo Career Suite. Apply e import de propostas **explicitamente deferred**.

Case + screenshots reais: `https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

#ProductEngineering #LocalFirst #TypeScript #NextJS

---

## Launch post — technical (PT)

Publiquei um case completo da **Career Suite** no monorepo DevFlow:

- **ApplyFlow** (Next.js 16 + React 19) — dashboard local-first, exportação CareerBundle
- **Interview Lab** — import validado com Zod, Resume Match determinístico
- **Packages** `career-core` + `career-sync` — contratos versionados, sinais provider-derived client-safe
- Handoff **postMessage + ACK** (screenshot verificado no repo)
- ADRs 002–004 + threat model — apply/import deferred, arquitetura de mutation **proposed**

Stack: TypeScript, pnpm workspaces, Turborepo, Vitest (**443+54+396+152 = 1.045** testes).

Não é auto-apply nem plataforma autónoma — é engenharia com **human-in-the-loop** e export explícito.

`https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

---

## Launch post — product + engineering (PT)

O problema não era “aplicar mais rápido”. Era **candidaturas dispersas** e **preparação desconectada da vaga real** — com ferramentas que empurram upload na nuvem por defeito.

Construí a **Career Suite** como workflow modular:

1. **ApplyFlow** organiza candidaturas no browser  
2. **CareerBundle** transporta contexto tipado entre apps  
3. **Interview Lab** importa, mostra preview read-only de sync enrichment, e prepara prática por role  

Destaques de engenharia: composição com origem auditável (`demo` / `provider-derived-proposal`), lifecycle read-only até export/handoff, governança de routing e design system no CI.

Screenshots capturados da app real (dados demo). Vídeo: roteiro pronto, gravação pendente.

Explorar o case: `https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

---

## Launch post — short (EN)

Job applications and interview prep usually live in different tools.

**DevFlow Career Suite** (portfolio case) connects **ApplyFlow** and **Interview Lab** through a typed **CareerBundle** contract — local-first artifacts, explicit `postMessage` handoff with ACK, and a human-reviewed read-only enrichment path.

**1,045 Vitest tests** on the Career Suite scope. Apply and proposal import are **explicitly deferred**.

Case + verified screenshots: `https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`

---

## Follow-up series (up to 5 posts)

### Post 1 — Por que local-first

| Field | Content |
|-------|---------|
| **Hook** | “Your career data doesn’t need a mandatory cloud upload to move between tools.” |
| **Thesis** | Local-first = user-controlled artifacts on device; explicit export/handoff instead of silent sync. |
| **Evidence** | Case §7; CareerBundle built in browser; no bundle in URL. |
| **Image** | `01-applyflow-dashboard.png` |
| **CTA** | “Full trust model in the case doc → `https://github.com/devflow-modules/devflow/blob/main/docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md`” |

### Post 2 — CareerBundle e interoperabilidade

| Field | Content |
|-------|---------|
| **Hook** | “One JSON contract, four import paths — same Zod validation.” |
| **Thesis** | Versioned `devflow.careerBundle.v1` enables postMessage, clipboard, file, and download without a shared database. |
| **Evidence** | `packages/career-core`; screenshot `06-interview-lab-handoff.png`. |
| **Image** | `06-interview-lab-handoff.png` |
| **CTA** | “Handoff validation doc in `docs/career-suite/integrations/`” |

### Post 3 — Human-in-the-loop e provider-derived signals

| Field | Content |
|-------|---------|
| **Hook** | “Derived signals are useless if they auto-mutate your career record.” |
| **Thesis** | Server produces client-safe metadata → user reviews → proposal in memory → change preview → export only. |
| **Evidence** | ADR-003; consent preview on dashboard; panels 02–04 need Nango for screenshots. |
| **Image** | `05-export-composition-source.png` (demo path) |
| **CTA** | “Read-only lifecycle — apply explicitly deferred.” |

### Post 4 — Threat modeling e ADRs

| Field | Content |
|-------|---------|
| **Hook** | “Before ‘apply enrichment’, we wrote what must never cross the trust boundary.” |
| **Thesis** | Threat model + ADR-002 (import deferred) + ADR-003 (apply deferred) + ADR-004 (contract proposed). |
| **Evidence** | `docs/career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md` |
| **Image** | Case architecture diagram (export from case MD) or `09-explicit-export.png` |
| **CTA** | “Engineering case §8–11” |

### Post 5 — Handoff ApplyFlow → Interview Lab

| Field | Content |
|-------|---------|
| **Hook** | “No CareerBundle in the URL — postMessage, validation, ACK.” |
| **Thesis** | Cross-app handoff with origin allowlist, typed envelope, clipboard fallback when popup blocked. |
| **Evidence** | Screenshot `06`; tests in `applyflow` + `interview-lab`. |
| **Image** | `06-interview-lab-handoff.png` |
| **CTA** | “60s demo script in `docs/public-cases/CAREER-SUITE-DEMO-SCRIPT.md`” |

---

## Publishing notes

- Attach **one** hero image per post; avoid carousel overload on first launch.
- Do not claim live Gmail/Calendar unless recording with configured sandbox.
- Pin the post that links to the **full case** after publish.
- Hashtags (optional, max 3–5): `#ProductEngineering` `#TypeScript` `#Privacy` `#LocalFirst` `#NextJS`
