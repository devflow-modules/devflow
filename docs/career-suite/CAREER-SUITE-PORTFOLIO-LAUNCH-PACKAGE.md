# DevFlow Career Suite — Portfolio launch package

**Purpose:** Reusable professional materials for GitHub, LinkedIn, curriculum, interviews, and partner conversations.  
**Status:** Copy-ready — **not published externally** by this repository.  
**Revalidated:** 2026-06-16 · Tests: **1,045** Vitest (443 + 54 + 396 + 152)

**Canonical deep dive:** [CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md)  
**Copy modules:** [portfolio/](./portfolio/) — LinkedIn, curriculum, video scripts, evidence matrix

---

## Index

| Section | Content |
|---------|---------|
| §1 | [Canonical descriptions](#1-canonical-project-description) |
| §2 | [Problem statement](#2-problem-statement) |
| §3 | [Solution statement](#3-solution-statement) |
| §4 | [Technical highlights](#4-technical-highlights) |
| §5 | [Product highlights](#5-product-highlights) |
| §6 | [Portfolio positioning](#6-portfolio-positioning) |
| §7 | [Recruiter summary](#7-recruiter-summary-20-30s) |
| §8 | [Engineering interview narrative](#8-engineering-interview-narrative) |
| §9 | [Potential client summary](#9-potential-client-summary) |
| §10 | [GitHub copy](#10-github-repository-copy) |
| §11 | [Curriculum & LinkedIn entries](#11-curriculum--linkedin-entries) |
| §12 | [LinkedIn launch posts](#12-linkedin-launch-posts) |
| §13 | [Follow-up technical series](#13-follow-up-technical-posts) |
| §14 | [Video scripts](#14-video-scripts) |
| §15 | [Screenshot usage map](#15-screenshot-usage-map) |
| §16 | [Evidence matrix](#16-evidence-matrix) |
| §17 | [Claims policy](#17-claims-policy) |
| §18 | [Launch checklist](#18-launch-checklist) |
| §19 | [Success indicators](#19-success-indicators-future) |

---

## 1. Canonical project description

### One-line

| PT | EN |
|----|-----|
| Suite de carreira **local-first** e **privacy-first** que liga candidaturas, sinais derivados com revisão humana e preparação para entrevistas — handoff tipado, sem auto-apply. | **Local-first**, **privacy-first** career suite connecting applications, human-reviewed derived signals, and interview prep — typed handoff, no auto-apply. |

### ~50 words

**PT:** DevFlow Career Suite conecta ApplyFlow (dashboard + extensão) e Interview Lab via contrato CareerBundle versionado. Artefactos no browser, export explícito, ciclo read-only de enrichment provider-derived, 1.045 testes Vitest. Apply e import de propostas explicitamente deferred.

**EN:** DevFlow Career Suite connects ApplyFlow (dashboard + extension) and Interview Lab through a versioned CareerBundle contract. Browser-local artifacts, explicit export, read-only provider-derived enrichment lifecycle, 1,045 Vitest tests. Apply and proposal import explicitly deferred.

### ~100 words

**PT:** A Career Suite resolve a fragmentação entre candidaturas e preparação para entrevistas com um workflow modular: ApplyFlow organiza o funil localmente; CareerBundle transporta contexto tipado entre apps; Interview Lab importa, mostra preview read-only de sync enrichment e executa Resume Match determinístico. Sinais de Gmail/Calendar são derivados e client-safe, com revisão manual antes de qualquer proposta — o ciclo termina em export/handoff, sem persistência silenciosa. Monorepo TypeScript (Next.js 16, React 19), ADRs, threat model e governança CI. Case de portfólio com screenshots reais (dados demo).

**EN:** Career Suite addresses scattered applications and disconnected interview prep through a modular workflow: ApplyFlow organizes the funnel locally; CareerBundle carries typed context across apps; Interview Lab imports, shows read-only sync enrichment preview, and runs deterministic Resume Match. Gmail/Calendar signals are derived and client-safe, with manual review before proposals — the lifecycle ends at export/handoff, without silent persistence. TypeScript monorepo (Next.js 16, React 19), ADRs, threat model, and CI governance. Portfolio case with verified screenshots (demo data).

### ~200 words

**PT:** DevFlow Career Suite é um ecossistema modular de carreira concebido como case de produto e engenharia: ApplyFlow (aplicação Next.js + extensão Chrome MV3) captura e organiza candidaturas no dispositivo; pacotes partilhados `@devflow/career-core` e `@devflow/career-sync` definem contratos Zod, sinais provider-derived e validação de privacidade; Interview Lab recebe o CareerBundle por postMessage, clipboard ou ficheiro, valida o payload e prepara prática por vaga. O diferencial não é velocidade de candidatura — é **human-in-the-loop**, **origem de composição auditável** e **ação explícita** em cada passo sensível. O lifecycle provider-derived (metadados → sinais → revisão → proposta → preview → export) está implementado em modo read-only; enrichment apply e import de propostas exportadas estão **explicitamente deferred** (ADR-002, ADR-003). Arquitetura de mutation futura está **proposed** (ADR-004). O repositório inclui 1.045 testes Vitest no escopo Career Suite, documentação de threat model e cinco screenshots verificados da aplicação real. Não há deploy público dedicado nem vídeo gravado no repo — materiais prontos para divulgação profissional controlada.

**EN:** DevFlow Career Suite is a modular career ecosystem built as a product and engineering portfolio case: ApplyFlow (Next.js app + Chrome MV3 extension) captures and organizes applications on-device; shared packages `@devflow/career-core` and `@devflow/career-sync` define Zod contracts, provider-derived signals, and privacy validation; Interview Lab receives CareerBundle via postMessage, clipboard, or file, validates the payload, and prepares role-specific practice. The differentiator is not application speed — it is **human-in-the-loop** review, **auditable composition source**, and **explicit user action** at every sensitive step. The provider-derived lifecycle (metadata → signals → review → proposal → preview → export) is implemented read-only; enrichment apply and imported proposal trust are **explicitly deferred** (ADR-002, ADR-003). Future mutation architecture is **proposed** (ADR-004). The repository includes 1,045 Vitest tests on the Career Suite scope, threat model documentation, and five verified application screenshots. There is no dedicated public deploy or recorded video in the repo — materials are ready for controlled professional outreach.

---

## 2. Problem statement

### Short

Candidaturas ficam dispersas; a preparação para entrevistas raramente reflete a vaga em curso; ferramentas empurram automação opaca ou upload na nuvem por defeito.

### Long

Profissionais em busca ativa acumulam candidaturas em abas, notas e planilhas sem um funil acionável. Easy Apply acelera submissão mas não gera preparação estruturada por empresa, stack ou senioridade. Ferramentas de IA frequentemente exigem upload de currículo e descrição de vaga antes de qualquer valor, com pouca transparência sobre persistência e automação. A Career Suite parte da pergunta: **como transformar candidaturas em preparação deliberada**, mantendo o utilizador no controlo dos artefactos e sem auto-apply — não de “como aplicar mais rápido”. *(Problemas qualitativos — sem métricas de pesquisa formal no repositório.)*

---

## 3. Solution statement

| Piece | Role |
|-------|------|
| **ApplyFlow** | Organiza candidaturas (dashboard + extensão), métricas, exportação CareerBundle, UI provider-derived read-only |
| **CareerBundle** | Contrato JSON versionado (`@devflow/career-core`) — transporta aplicações e enrichment opcional entre produtos |
| **Interview Lab** | Importa bundle, preview read-only de sync enrichment, Resume Match, prática por role |
| **career-sync / career-core** | Validam sinais, privacidade, handoff, composição e export |

Fluxo implementado: organizar → (opcional) sinais derivados com revisão → proposta em memória → preview → export/handoff → fim do ciclo read-only.

---

## 4. Technical highlights

Facts verified in repository (June 2026):

| Area | Detail |
|------|--------|
| Apps | Next.js **16.1.6**, React **19**, TypeScript, Tailwind CSS **v4** |
| Monorepo | pnpm workspaces + Turborepo; apps import only `packages/*` |
| Contract | `devflow.careerBundle.v1`, Zod parse/validate in `@devflow/career-core` |
| Handoff | `postMessage` + ACK + origin allowlist; clipboard/file fallback |
| Provider path | Server-side runtime boundary; client-safe derived signals; Nango when enabled |
| Lifecycle | Read-only through export/handoff; forbidden keys guard in change preview path |
| Governance | ADR-002, ADR-003, ADR-004 (Proposed); threat model documented |
| CI | `check-routing-governance.sh`, `pnpm check:buttons`, `lint:design-system` |
| Tests | **1,045** Vitest — career-sync **443**, career-core **54**, applyflow **396**, interview-lab **152** |
| E2E | No ApplyFlow Playwright E2E — Vitest + manual demo scripts |

---

## 5. Product highlights

- **Human-in-the-loop** — revisão manual de sinais antes de proposta
- **Explicit user control** — botões para preview, export, handoff; sem sync em background
- **Local-first artifacts** — histórico e bundle gerados no browser
- **No silent persistence** — enrichment provider-derived em memória até export; sync preview não persistido no Interview Lab
- **Auditable composition source** — badge `none` / `demo` / `provider-derived-proposal`
- **Cross-product handoff** — ApplyFlow ↔ Interview Lab sem base de dados partilhada
- **Deterministic-first** — Resume Match e prep sem LLM obrigatório; IA opt-in onde implementada

---

## 6. Portfolio positioning

### Senior Fullstack Engineer

End-to-end delivery: Next.js apps, Chrome MV3 extension, shared packages, Vitest, CI governance. Evidence: monorepo boundaries, 1,045 tests, handoff implementation.

### Product Engineer

Problem framing, trust model, explicit deferrals (apply/import), composition source UX, demo walkthrough, public case. Evidence: ADRs, case doc, screenshots, launch package.

### AI Integration Engineer

Provider-derived signal pipeline, client-safe redaction, human review gate, deterministic agents (`career-agents`), opt-in LLM paths — **not** autonomous application. Evidence: `career-sync`, threat model, read-only lifecycle.

### Software Architecture

Package boundaries, versioned contracts, trust boundaries diagram, routing governance, proposed mutation architecture (ADR-004). Evidence: case §6, integration docs, handoff validation.

*Positioning is portfolio-based — no commercial deployment claimed.*

---

## 7. Recruiter summary (20–30s)

**PT:** Construí a **DevFlow Career Suite**, um case que liga organização de candidaturas (ApplyFlow) à preparação para entrevistas (Interview Lab) com um contrato JSON tipado e handoff explícito no browser — sem backend obrigatório no MVP. Como Product Engineer no próprio repositório, priorizei privacidade, revisão humana e ciclo read-only de enrichment, com **1.045 testes** e ADRs que adiam apply automático. Stack: TypeScript, Next.js, monorepo. Material completo e screenshots no GitHub.

---

## 8. Engineering interview narrative

### STAR

| | |
|--|--|
| **Situation** | Candidaturas e prep de entrevista vivem em ferramentas desconectadas; mercado empurra auto-apply e upload na nuvem. |
| **Task** | Projetar workflow modular local-first com handoff tipado entre apps e path provider-derived auditável — sem comprometer privacidade. |
| **Action** | Defini CareerBundle em `career-core`; implementei postMessage+ACK; modelei sinais em `career-sync`; UI de revisão e export em ApplyFlow; import + preview em Interview Lab; escrevi threat model e ADRs para defer apply/import. |
| **Result** | Lifecycle read-only completo até handoff; 1,045 testes; case público com screenshots verificados; decisões documentadas para mutation futura. |
| **Trade-offs** | Sem persistência server-side de propostas (simplicidade + privacidade); sem E2E Playwright (Velocidade CI + Vitest focado); provider runtime atrás de flags. |
| **Next decision** | ADR-004 gates antes de qualquer apply; Nango sandbox para screenshots 02–04. |

### Prepared Q&A

| Question | Short answer |
|----------|--------------|
| Por que local-first? | Utilizador controla artefactos no dispositivo; export/handoff explícito; sem API Career Suite obrigatória no loop core. |
| Por que não persistir? | Enrichment sensível fica em memória até export; ADR-003 defer apply; reduz superfície de ataque e confusão de trust. |
| Por que não aplicar automaticamente? | Invariantes de revisão humana e stale protection; auto-apply quebraria threat model — explicitamente deferred. |
| Como funciona o handoff? | ApplyFlow abre IL sem `noopener`; envia `devflow.careerBundle.v1`; IL valida origem+payload; ACK `devflow.careerBundle.ack.v1`. |
| Como protege dados externos? | Server descarta raw; UI só sinais client-safe; forbidden keys; meeting links removidos; provider IDs bloqueados no cliente. |
| Por que 1.045 testes? | Contratos, composição, handoff, change preview VMs, parse/validate — regressão em boundaries críticos. |
| Principal trade-off? | Feature completeness vs. trust — deferimos apply/import até arquitetura de contratos aprovada (ADR-004). |

---

## 9. Potential client summary

*Capabilities today vs. future potential — no commercial claims.*

| Segment | Today | Future (not committed) |
|---------|-------|------------------------|
| **Career coach** | Demo local de funil + handoff para prep por vaga; materiais educativos no case | White-label com hosting e consent flows configurados |
| **Recruitment consultancy** | Contratos tipados, threat model, read-only enrichment narrative | Integração CRM via export explícito — não implementado |
| **White-label platform** | Modular packages, ADRs, extension capture pattern | Multi-tenant backend — fora do escopo actual |
| **Internal talent mobility** | Local-first prototype para equipas que proíbem auto-apply | SSO + policy engine — research only |

**Message:** “Auditable, human-reviewed career workflow engine — not an autonomous applicant bot.”

---

## 10. GitHub repository copy

Full text: [portfolio/CURRICULUM-AND-PROFILE-ENTRIES.md](./portfolio/CURRICULUM-AND-PROFILE-ENTRIES.md#github-repository)

**Topics:** `typescript` `nextjs` `react` `monorepo` `privacy` `local-first` `product-engineering` `vitest` `chrome-extension` `zod`

*Do not change remote GitHub settings from this PR.*

---

## 11. Curriculum & LinkedIn entries

Copy-ready PT/EN: [portfolio/CURRICULUM-AND-PROFILE-ENTRIES.md](./portfolio/CURRICULUM-AND-PROFILE-ENTRIES.md)

Placeholders: `[PERIOD]`, `[REPO_OR_CASE_URL]`

---

## 12. LinkedIn launch posts

Three launch variants + EN short: [portfolio/LINKEDIN-LAUNCH-POSTS.md](./portfolio/LINKEDIN-LAUNCH-POSTS.md)

---

## 13. Follow-up technical posts

Five-post series planned (hooks, thesis, evidence, image, CTA): see [portfolio/LINKEDIN-LAUNCH-POSTS.md § Follow-up series](./portfolio/LINKEDIN-LAUNCH-POSTS.md#follow-up-series-up-to-5-posts)

1. Por que local-first  
2. CareerBundle e interoperabilidade  
3. Human-in-the-loop e provider-derived signals  
4. Threat modeling e ADRs  
5. Handoff ApplyFlow → Interview Lab  

---

## 14. Video scripts

60s · 90s · 3min — [portfolio/VIDEO-SCRIPTS.md](./portfolio/VIDEO-SCRIPTS.md)

**No video file in repo.** Scripts reference verified screenshot paths only.

---

## 15. Screenshot usage map

| Asset | GitHub | LinkedIn | Currículo | Apresentação | Vídeo |
|-------|--------|----------|-----------|--------------|-------|
| `01-applyflow-dashboard.png` | **Hero** README | Launch hero | Thumb do projeto | Slide 1 problema/solução | 0–10s |
| `05-export-composition-source.png` | Case §9 | Post 3 composição | Bullet export | Slide composição | 60–72s (90s) |
| `06-interview-lab-handoff.png` | Case §10 | Post 5 handoff | Handoff bullet | Slide integração | 28–38s |
| `07-resume-match.png` | Case §23 | Post técnico opcional | Skills ATS | Slide determinístico | 38–50s |
| `09-explicit-export.png` | Case export | Post alternativo | Export explícito | Slide trust | 72–82s (90s) |
| `02–04` (blocked) | — | **Do not use** | — | Mencionar como pending | — |

**Hero image:** `01-applyflow-dashboard.png` — melhor primeira dobra (funil + contexto ApplyFlow).

Paths: `docs/career-suite/assets/` · Checklist: [assets/README.md](./assets/README.md)

---

## 16. Evidence matrix

Full table: [portfolio/EVIDENCE-AND-CLAIMS-MATRIX.md](./portfolio/EVIDENCE-AND-CLAIMS-MATRIX.md)

---

## 17. Claims policy

Summary: [portfolio/EVIDENCE-AND-CLAIMS-MATRIX.md § Claims policy](./portfolio/EVIDENCE-AND-CLAIMS-MATRIX.md#claims-policy)

**Prohibited without evidence:** production-ready, enterprise-ready, fully secure, GDPR compliant, autonomous platform, paying customers, revenue, user validation studies.

---

## 18. Launch checklist

*Human actions — not executed by automation.*

- [ ] Merge PR #106 (this package)
- [ ] Verify public repository visibility policy (monorepo may stay private — see ApplyFlow publication checklist)
- [ ] Verify README links to case + launch package
- [ ] Verify all image paths render on GitHub
- [ ] Record 60–90s video per [VIDEO-SCRIPTS.md](./portfolio/VIDEO-SCRIPTS.md)
- [ ] Select hero: `01-applyflow-dashboard.png`
- [ ] Publish LinkedIn post (choose variant from [LINKEDIN-LAUNCH-POSTS.md](./portfolio/LINKEDIN-LAUNCH-POSTS.md))
- [ ] Add LinkedIn project entry
- [ ] Update curriculum with `[PERIOD]` filled
- [ ] Pin repository or case link on profile (if public)
- [ ] Collect feedback from 2–3 reviewers (recruiter, engineer, coach)

---

## 19. Success indicators (future)

Track after external publish — **do not claim results now:**

| Indicator | Notes |
|-----------|-------|
| Repository views / stars | If repo or case mirror is public |
| Demo video views | YouTube/LinkedIn native |
| LinkedIn impressions / profile visits | Campaign analytics |
| Recruiter / hiring manager inbound | Qualitative |
| Demo completions | Self-reported or calendar bookings |
| Feedback themes | Privacy, architecture, product sense |

---

## Related documentation

| Doc | Use |
|-----|-----|
| [Product case](./CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md) | Technical depth |
| [Public case](../public-cases/CAREER-SUITE.md) | Recruiter narrative |
| [Demo walkthrough](./demo/CAREER-SUITE-WALKTHROUGH.md) | Live demo steps |
| [Demo script](../public-cases/CAREER-SUITE-DEMO-SCRIPT.md) | Recording timing |
| [Assets](./assets/README.md) | Screenshot provenance |

---

## Limitations visible in launch

- No dedicated Career Suite public deploy (local dev demo)
- No recorded video in repository
- Provider-derived screenshots 02–04 blocked without Nango sandbox
- Apply and proposal import **explicitly deferred**
- Portfolio case — not current devflowlabs.com.br GTM (WhatsApp + Financeiro)
