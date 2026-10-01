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

## Domain / backend

No Match Engine, lifecycle, Prisma, auth semantics, or provider algorithm changes.
