# ApplyFlow — Cohort 1 operator log (sanitized)

Invite-only. **No** emails, names, passwords, CV text, or auth tokens in this file.

Production app: https://devflow-applyflow.vercel.app · SHA `18cf6620`  
Wave 1 target: **5** users · expand toward **10** only if P0=0 and no systemic P1.

Related: [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) · [`BETA_EVIDENCE.md`](./BETA_EVIDENCE.md)

---

## Onboarding message (copy as-is)

ApplyFlow ajuda a organizar descoberta de vagas e candidaturas.  
O perfil/CV não é enviado a provedores de busca.  
O ApplyFlow **não** submete candidaturas automaticamente.  
**Salvar ≠ candidatar.** Depois de aplicar no site do empregador, registe e marque como enviada.

URL: https://devflow-applyflow.vercel.app

---

## Invite steps (per participant)

1. User creates/signs in (no guided tour for at least some users)
2. `pnpm pilot:status -- --account <accountId|authProviderSub>`
3. `pnpm pilot:grant -- --account <id> --confirm <token> --production --confirm-production <hostFp>`
4. User completes empty activation / migration so `v2_cloud`
5. Confirm `/api/applyflow/v2/me` shows pilot + active mode
6. Log row below — labels only

---

## Wave 1 invite table

| Label | Invite date (UTC) | Pilot | First login | First meaningful action | Return session | Status | Blocker (safe) |
|-------|-------------------|-------|-------------|-------------------------|----------------|--------|----------------|
| BETA-01 | | | | | | NOT_INVITED | |
| BETA-02 | | | | | | NOT_INVITED | |
| BETA-03 | | | | | | NOT_INVITED | |
| BETA-04 | | | | | | NOT_INVITED | |
| BETA-05 | | | | | | NOT_INVITED | |

Statuses: `NOT_INVITED` · `INVITED` · `ACTIVATED` · `USED` · `RETURNED` · `BLOCKED` · `WITHDRAWN`

---

## Friction log (append rows; no PII)

| Participant | Surface | Task | Observed | Expected | Intervention | Freq | Severity | Possible cause |
|-------------|---------|------|----------|----------|--------------|------|----------|----------------|
| | | | | | | | | |

---

## Daily check (tick while wave active)

- [ ] Sentry unexpected Production errors
- [ ] Pilot access problems reported
- [ ] Provider failures (TheirStack stays OFF shared)
- [ ] P0/P1 reports

---

## Aggregate counters (update from evidence only)

| Metric | Count |
|--------|------:|
| Invited | 0 |
| Activated V2 | 0 |
| Reached Discovery | 0 |
| Saved ≥1 opportunity | 0 |
| Registered ≥1 application | 0 |
| Marked ≥1 sent | 0 |
| Returned | 0 |
| P0 | 0 |
| Systemic P1 | 0 |
