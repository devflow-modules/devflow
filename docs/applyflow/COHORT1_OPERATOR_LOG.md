# ApplyFlow — Cohort 1 operator log (sanitized)

Invite-only. **No** emails, names, passwords, CV text, or auth tokens in this file.

Production app: https://devflow-applyflow.vercel.app · SHA `18cf6620`  
Wave 1 target: **5** users (`BETA-01`…`BETA-05`) · do **not** invite `BETA-06+` yet.

Related: [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md) · [`BETA_EVIDENCE.md`](./BETA_EVIDENCE.md)

Operator smoke accounts **never** count as cohort evidence.

---

## Phase 13A status

| Field | Value |
|-------|-------|
| Recruitment copy | READY |
| Outreach sent by agent | **NO** (operator sends manually) |
| People contacted | 0 |
| Interested / Qualified / Accepted | 0 / 0 / 0 |
| Accounts created / Pilot grants / Activated | 0 / 0 / 0 |
| First sessions | 0 |

---

## Qualification (quick)

**REQUIRED:** looking for work now **or** expects to apply within weeks; will use ApplyFlow in real search; short feedback OK.

**PREFERRED mix:** seniority, tech/non-tech, volume, remote/local, spreadsheet/notes users, ApplyFlow-unfamiliar.

**NOT for primary evidence:** operator/fake accounts; not job-searching; UI-only reviewers; architecture reviewers; full guided tour before first use.

Acceptance: `QUALIFIED` · `MAYBE` · `NOT CURRENT FIT` (+ one-line reason).

---

## Screening (max 3 questions)

1. Você está buscando vagas atualmente?
2. Com que frequência costuma se candidatar?
3. Hoje você organiza suas candidaturas de alguma forma?

---

## Recruitment copy — WhatsApp (PT-BR)

Oi — tô abrindo um beta fechado pequeno do **ApplyFlow**, uma ferramenta que eu construí pra organizar busca de vagas e candidaturas (sem enviar candidatura automática).

Procuro gente que **está de fato buscando emprego** agora (ou vai se candidatar nas próximas semanas) e topa usar no fluxo normal por alguns dias.

É gratuito no beta. Quero feedback sincero de uso — não precisa entrevista longa.

Primeira onda é bem limitada (poucas pessoas). Se fizer sentido pra você, te mando o link e libero o acesso.

---

## Recruitment copy — LinkedIn DM (PT-BR, ~700 chars)

Oi — estou abrindo um beta fechado pequeno do ApplyFlow, produto que construí para organizar descoberta de vagas e candidaturas (sem submissão automática).

Busco pessoas que estejam buscando emprego agora ou pretendam se candidatar nas próximas semanas, para usar no fluxo real e me dar um retorno curto de usabilidade.

É gratuito durante o beta; a primeira onda é limitada. Se fizer sentido, te envio o acesso.

---

## Follow-up (after interest)

Perfeito. Te mando o acesso.

1. Abre https://devflow-applyflow.vercel.app  
2. Cria / entra com o e-mail que pretende usar no beta  
3. Me avisa quando a conta estiver criada — aí eu libero o acesso beta  

Não me envie senha. Depois que liberar, uso normal da sua busca; sem tour guiado das telas no começo.

---

## Minimal onboarding (after pilot grant + activation)

Seu acesso foi liberado.

A ideia é usar o ApplyFlow na sua busca de vagas normalmente.

Comece pela página inicial e tente seguir o fluxo sem eu explicar as telas. Se em algum momento você ficar em dúvida, anota ou me chama — esse ponto é importante para o beta.

O ApplyFlow não envia candidatura automaticamente. Quando você realmente se candidatar fora dele, registre isso no fluxo.

URL: https://devflow-applyflow.vercel.app

---

## Activation checklist (per accepted participant)

1. Participant creates/signs in on Production (their password — never ask for it)
2. Optional: confirm non-pilot V2 → `403 persistence_v2_not_eligible` (gate already proven; not required every time)
3. `cd apps/applyflow`
4. `pnpm pilot:status -- --account <accountId|authProviderSub>`
5. `pnpm pilot:grant -- --account <id> --confirm <token> --production --confirm-production <hostFp>`
6. Participant completes empty activation → `canonicalPersistence=v2_cloud`
7. Confirm product entry works
8. Send **minimal onboarding** only — **no product tour**
9. Update wave table below (labels only)

---

## First-session observation (capture yes/no/unknown)

For each BETA: Home understood? · Entry found? · Discovery reached? · Search/paste understood? · Match understood? · Save understood? · Saved opp found? · Opportunities ≠ Applications? · Readiness? · Register Application? · Mark Sent? · Pause points? · Help asked?

**Minimum useful path:** Home → entry → Discovery → Match → Save → Opportunities.  
Do **not** require a real external application in session 1.

Evidence type: `OBSERVED` or `REPORTED`.

### Post-session questions (exactly these)

1. O que você entendeu que o ApplyFlow faz?
2. Onde você teve mais dúvida?
3. Teve alguma coisa que você procurou e não encontrou?
4. O Match fez sentido para você?
5. Ficou clara a diferença entre uma vaga salva e uma candidatura?
6. Você usaria o ApplyFlow novamente na próxima busca?

---

## Wave 1 invite table

| Label | Invite date (UTC) | Account created | Pilot granted | Activated | First session | Discovery | Opp saved | App registered | App sent | Return | Help required | Friction (brief) | Status |
|-------|-------------------|-----------------|---------------|-----------|---------------|-----------|-----------|----------------|----------|--------|---------------|------------------|--------|
| BETA-01 | | | | | | | | | | | | | NOT_INVITED |
| BETA-02 | | | | | | | | | | | | | NOT_INVITED |
| BETA-03 | | | | | | | | | | | | | NOT_INVITED |
| BETA-04 | | | | | | | | | | | | | NOT_INVITED |
| BETA-05 | | | | | | | | | | | | | NOT_INVITED |

Statuses: `NOT_INVITED` · `CONTACTED` · `INTERESTED` · `QUALIFIED` · `INVITED` · `ACCOUNT_CREATED` · `ACTIVATED` · `USED` · `RETURNED` · `BLOCKED` · `WITHDRAWN` · `NOT_CURRENT_FIT`

---

## Candidate screening notes (labels only — no PII)

| Temp id | Channel | Acceptance | Reason (brief) | Assigned BETA |
|---------|---------|------------|----------------|---------------|
| | | | | |

---

## Friction log (append; no PII)

| Participant | Surface | Task | Observed | Expected | Intervention | Freq | Severity | Possible cause |
|-------------|---------|------|----------|----------|--------------|------|----------|----------------|
| | | | | | | | | |

---

## Feature requests (do not implement)

| Request | Count | Classification A–E |
|---------|------:|--------------------|
| | | |

A = core workflow · B = repeated friction · C = enhancement · D = preference · E = out of scope

---

## Daily check (while wave active)

- [ ] Sentry unexpected Production errors (only if error reported / 500)
- [ ] Pilot access problems
- [ ] TheirStack remains SHARED OFF
- [ ] P0/P1 reports → pause new invites

---

## Aggregate counters (evidence only — never smoke accounts)

| Metric | Count |
|--------|------:|
| Contacted | 0 |
| Interested | 0 |
| Qualified | 0 |
| Accepted | 0 |
| Invited | 0 |
| Accounts created | 0 |
| Pilot grants | 0 |
| Activated V2 | 0 |
| First sessions | 0 |
| Reached Discovery | 0 |
| Saved ≥1 opportunity | 0 |
| Registered ≥1 application | 0 |
| Marked ≥1 sent | 0 |
| Returned | 0 |
| P0 | 0 |
| Systemic P1 | 0 |
