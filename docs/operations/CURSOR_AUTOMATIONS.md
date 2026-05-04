# Cursor Automations — DevFlow Labs (runbook)

Runbook para **automations em modo revisão** (primeira versão: **sem** commits, edições, branches ou PRs — só relatório/comentário). Alinhar com [`AGENTS.md`](../../AGENTS.md), [`docs/operations/REDIRECT_SAFETY.md`](./REDIRECT_SAFETY.md) e [`docs/operations/GITHUB_LABELS.md`](./GITHUB_LABELS.md).

---

## Princípios (v1)

| Regra | Detalhe |
|--------|---------|
| Modo | **Review only** — não alterar ficheiros, não fazer push, não criar branches. |
| Saída | Comentário no PR/issue, ou relatório colado no chat / doc interno. |
| Segurança | Não pedir nem colar secrets; usar issues com templates Cursor quando aplicável. |

---

## 1. PR Redirect Safety Review

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | PR Redirect Safety Review |
| **Trigger** | Abertura ou atualização de PR que toca `middleware.ts`, `**/login/**`, `**/signup/**`, `*redirect*`, `*safe-redirect*`, `portal-whatsapp-login-url`, `financeiro-app-href`, `whatsapp-routes`, `financeiro-routes`. |
| **Modo** | Review only |
| **Propósito** | Garantir que não regressam `login?next=` manuais, URLs absolutas/protocol-relative em `next`, ou redirects externos sem allowlist. |
| **Quando correr** | PR com label `risk:auth` ou `area:portal` / `area:whatsapp-platform` e alterações em rotas ou auth. |

### Prompt (copiar para a Automation)

```
Review only. Do not edit files or push.

Follow AGENTS.md and docs/operations/REDIRECT_SAFETY.md.

Review this PR for redirect safety: manual /login?next=, loginUrlWithNext vs portal-whatsapp-login-url, financeiroAppHref, resolveSignupClientNavigationHref, URLSearchParams → navigation, open redirect, protocol-relative and encoded //, Stripe allowlist only for external hosts.

Output: findings by severity, exact file:line if any, verdict safe / safe with follow-up / block, recommended tests. No secrets.
```

### Saída esperada

Lista curta de achados + veredito + follow-ups (ex.: alinhar `HeroSection.tsx` com helpers).

### Nunca fazer

Commits, patches, alterar CI, `.env`, `package.json`.

### Labels sugeridos

`risk:auth`, `needs:security-review`, `cursor:review-only`.

---

## 2. Weekly Test Coverage Opportunities

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Weekly Test Coverage Opportunities |
| **Trigger** | Agendamento semanal (ex. segunda 09:00) ou comando manual. |
| **Modo** | Review only |
| **Propósito** | Sugerir 2–4 módulos **pur helpers / cutover / URLs** com cobertura fraca, sem implementar testes. |
| **Quando correr** | Planeamento de sprint; **não** em release freeze sem humano. |

### Prompt (copiar)

```
Review only. Do not edit files.

Follow AGENTS.md and .cursor/skills/test-hardening.md.

Scan src/lib and packages/*-routes for pure functions with few or no Vitest tests. List candidates with file path, why low risk to test, suggested 1–2 behaviour tests (no implementation). Exclude auth/billing/Prisma/webhook core.

Output: bullet list + suggested pnpm exec vitest run ... commands. No code edits.
```

### Saída esperada

Backlog de issues pequenas (`type:test`, `cursor:small-diff`).

### Nunca fazer

Gerar migrations, alterar `package.json`, correr suite completa obrigatória no relatório.

### Labels sugeridos

`type:test`, `area:packages` ou `area:portal`, `cursor:needs-plan` se houver dúvida de âmbito.

---

## 3. Docs Needed Check

| Campo | Conteúdo |
|--------|-----------|
| **Nome** | Docs Needed Check |
| **Trigger** | Semanal ou após merge de features com `needs:docs-update`. |
| **Modo** | Review only |
| **Propósito** | Verificar se `docs/`, `ARCHITECTURE.md` ou `apps/*/docs/` precisam de uma linha de atualização após mudanças de rotas/cutover. |
| **Quando correr** | Pós-merge de PRs com `needs:docs-update` ou mudanças em `middleware` / `next.config`. |

### Prompt (copiar)

```
Review only. Do not edit files.

Follow AGENTS.md. Compare recent merges (or this branch diff) against docs/README.md, ARCHITECTURE.md, docs/operations/REDIRECT_SAFETY.md. List doc gaps in one paragraph per gap: what changed, which doc should mention it, suggested owner. No file edits.
```

### Saída esperada

Lista de gaps + referência a ficheiros; opcionalmente rascunho de texto para copy-paste humano.

### Nunca fazer

Editar markdown no repo automaticamente.

### Labels sugeridos

`type:docs`, `needs:docs-update`, `area:docs`.

---

## Configuração manual no Cursor

1. **Cursor Cloud / Team:** criar automations com o **trigger** e colar o **prompt** acima; definir repositório e branch alvo (ex. `main` ou padrão de PR).  
2. **Sem Cloud:** usar **agenda pessoal** + snippet guardado (mesmo prompt) e colar no chat ao abrir o PR ou na segunda-feira.  
3. Ligar labels no GitHub conforme [`GITHUB_LABELS.md`](./GITHUB_LABELS.md) para filtrar o que dispara revisão opcional.

Quando a equipa validar o formato em produção, pode evoluir para automations com **branch de sugestão** (ainda fora do âmbito deste runbook v1).
