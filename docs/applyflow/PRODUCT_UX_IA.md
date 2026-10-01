# ApplyFlow — Product UX / Information Architecture (Phase 11)

**Decision date:** 2026-10-01  
**Baseline:** `fc049fab`  
**Audience:** maintainers implementing the end-to-end experience sprint.

---

## Choice

**C — HYBRID: Overview dashboard + dedicated core workspaces**

Not A (long single page remains primary) — cognitive load too high for first-time users.  
Not B (full route split of every surface) — JobInbox couples Discovery + Queue in one persistence client; full split without a shared provider is high-risk for this sprint.

### What C means here

| Route | Responsibility |
|-------|----------------|
| `/` | Product landing — understand & enter |
| `/dashboard` | Overview — next action + setup + summaries |
| `/dashboard/discover` | Find & evaluate jobs (discovery + paste + queue after save) |
| `/dashboard/opportunities` | Prioritize saved jobs (queue-first) |
| `/dashboard/applications` | Track registered applications |
| `/dashboard/jobs/[id]` | Job workspace (unchanged semantics) |
| `/dashboard/analytics` | Secondary patterns (demoted from primary nav) |
| `/account` | Session + account status |
| `/documentacao` | Technical docs (footer / secondary only) |
| `/login` | Sign in |

Compatibility: `#applications`, `#job-inbox`, `#como-importar` map to new routes or overview anchors.

---

## Public nav (logged out)

ApplyFlow · Como funciona (`/#como-funciona`) · Entrar · **Começar** (primary → `/dashboard`)

No Documentação / Analytics in primary public nav.

## Authenticated nav

Visão geral · Descobrir · Oportunidades · Candidaturas · Conta  

Analytics → overview link / applications secondary.  
Documentação → footer.

---

## Home audit summary

| Element | Action |
|---------|--------|
| Career workflow positioning | KEEP / strengthen |
| Local-first / privacy | REWRITE in human language |
| Extension / Easy Apply / Autofill / JSON hero | REMOVE from hero |
| Documentation as hero CTA | MOVE to footer |
| Import JSON / Carregar demo on `/` | Not on `/` (dashboard data section only) |
| Three equal CTAs | REPLACE with one primary + one secondary |
| Legacy hero mock (Pipeline/Extensão) | REPLACE with workflow visual |

---

## Job workspace UX contract (Phase 11B)

Above the fold on `/dashboard/jobs/[id]`:

1. Company / role / location·work model·source  
2. Match (algorithm) vs Candidatura (human lifecycle) — visually separate  
3. Readiness summary (guidance, expandable checklist)  
4. Current status → next step → **one** primary lifecycle CTA  
5. Secondary transitions under “Outras atualizações de status”

Tabs: Visão geral · Preparação · Pack · Networking; Evidências/Entrevista under “Mais detalhes”.

## Analytics UX contract (Phase 11B)

Framing + empty CTA to Discover. Primary tabs: Pipeline · Fontes · Resumo · Histórico. Secondary under “Mais detalhes”. No fake demo numbers.

## Discovery mobile (Phase 11B)

Primary: keyword · location · provider · Buscar. Optional filters under “Mais filtros”. Manual paste under disclosure after search.

## Domain / backend

No Match Engine, lifecycle, Prisma, auth semantics, or provider algorithm changes.
