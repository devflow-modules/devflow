# Career Suite — Evidence and claims matrix

**Revalidated:** 2026-06-16 · **Tests:** `pnpm --filter` on `career-sync`, `career-core`, `applyflow`, `@devflow/app-interview-lab`

---

## Evidence matrix

| Claim | Evidence | Source path | Safe to publish? | Qualification |
|-------|----------|-------------|------------------|---------------|
| 1,045 Vitest tests on Career Suite scope | 443 + 54 + 396 + 152 = 1,045 (run 2026-06-16) | `packages/career-sync`, `packages/career-core`, `apps/applyflow`, `apps/interview-lab` | **Yes** | Scope = four packages only; not full monorepo |
| Real screenshots from application | 5 PNGs, 1440×900, demo/sandbox data | `docs/career-suite/assets/01|05|06|07|09-*.png` | **Yes** | Provider-derived 02–04 **blocked** — do not reference as captured |
| postMessage handoff with ACK | Implementation + screenshot `06` | `apps/applyflow`, `apps/interview-lab`, `docs/career-suite/assets/06-interview-lab-handoff.png` | **Yes** | Popup may be blocked → clipboard fallback documented |
| Read-only provider-derived lifecycle | ADR-002, ADR-003, case §9 | `docs/adr/`, `docs/career-suite/CAREER-SUITE-PRODUCT-AND-ARCHITECTURE-CASE.md` | **Yes** | Ends at export/handoff — no apply |
| Apply explicitly deferred | ADR-003 | `docs/adr/ADR-003-*.md` | **Yes** | State as deferred, not “never” |
| Proposal import explicitly deferred | ADR-002 | `docs/adr/ADR-002-*.md` | **Yes** | |
| Contract architecture proposed | ADR-004 status Proposed | `docs/adr/ADR-004-*.md` | **Yes** | Not implemented |
| CareerBundle Zod contract | `parseCareerBundle`, handoff envelopes | `packages/career-core` | **Yes** | |
| Composition source visibility | Badge demo / none / provider-derived | `apps/applyflow`, screenshot `05` | **Yes** | Provider-derived badge needs runtime — demo path captured |
| Local-first artifacts | Browser storage, explicit export | Case §7, app READMEs | **Yes** | Not offline-first |
| No mandatory Career Suite backend | Architecture case | Case §6–7 | **Yes** | Provider preview needs server when enabled |
| Routing / design-system governance | CI scripts | `scripts/ci/check-routing-governance.sh`, `pnpm check:buttons` | **Yes** | Monorepo-wide baseline |
| Threat model documented | Integration docs | `docs/career-suite/integrations/PROVIDER-DERIVED-ENRICHMENT-APPLICATION-THREAT-MODEL.md` | **Yes** | |
| No Playwright E2E for ApplyFlow | Case §12, §20 | Case doc | **Yes** | Vitest + manual demo |
| No public deploy of Career Suite | Monorepo is portfolio case; hub GTM = WhatsApp + Financeiro | `README.md` | **Yes** | Local dev demo only |
| No recorded demo video in repo | Walkthrough + scripts only | `docs/career-suite/demo/`, `portfolio/VIDEO-SCRIPTS.md` | **Yes** | Script ≠ video exists |
| Provider panels without Nango | Screenshots 02–04 blocked | `docs/career-suite/assets/README.md` | **Yes** | Qualify as “requires sandbox config” |

---

## Claims policy

### Allowed (use freely with source)

- local-first · privacy-first · human-in-the-loop · human-reviewed
- modular monorepo · typed CareerBundle contract · explicit export/handoff
- read-only enrichment lifecycle (through export/handoff)
- provider-derived **client-safe** signals (when runtime configured)
- **explicitly deferred**: Apply, proposal import
- **proposed for review**: enrichment apply contract (ADR-004)
- **designed with** threat model and ADRs
- **validated through** 1,045 Vitest tests (Career Suite scope)
- screenshots captured from real application states (listed assets only)
- deterministic Resume Match / prep paths (no mandatory LLM)
- AI opt-in only where implemented (Interview Lab coaching)

### Qualified (always add context)

| Claim | Required qualification |
|-------|------------------------|
| Provider-derived enrichment | Read-only today; runtime needs feature flags + Nango when enabled |
| AI-assisted | Deterministic core first; LLM only on explicit user action |
| Complete lifecycle | Read-only path complete; apply/import deferred |
| Integration with Gmail/Calendar | Contract + sandbox adapters; production OAuth not demo default |
| Tests | 1,045 = four Career Suite packages, not entire monorepo |
| Product Engineer / AI Integrator | Portfolio case — evidence in repo, not commercial deployment |

### Prohibited (without future evidence)

- production-ready · enterprise-ready · fully secure · GDPR compliant
- autonomous AI platform · AI agent that applies for users
- used by companies · paying customers · validated by users (research)
- revenue-generating · market traction · adoption metrics
- complete provider integration in production
- offline-first · full offline provider runtime
- screenshots of blocked panels (02–04) as if captured
- invented dates, clients, team size, or commercial outcomes

### Preferred phrasing

- **currently supports** · **designed with** · **validated through tests**
- **explicitly deferred** · **proposed for review**
- **portfolio case** · **engineering case study**
