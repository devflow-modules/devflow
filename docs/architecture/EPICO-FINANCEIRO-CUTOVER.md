# Épico — Cutover Financeiro (portal × `apps/financeiro`)

**Objetivo:** usar a governança já existente para **reduzir duplicidade real** entre a raiz (`src/app`) e `apps/financeiro`, com deploy e narrativa claros.

**Pré-requisitos (Fase 1):**

1. No GitHub: job **Routing governance** como **required** na branch principal.  
2. Comunicar no time: PR com mudança em `page.tsx` / `route.ts` exige toque em governança (template + CI).  
3. Congelar novas telas **operacionais** de Financeiro na raiz até o épico estar encaminhado.

**Referências:** `MATRIZ-DECISAO-ROTAS.md`, `ROUTING_POLICY.md`, `ROUTING_MIGRATION_EXECUCAO.md` (Fase 2), `INVENTARIO-ROTAS-MONOREPO.md`.  
**Plano técnico do PR 1 (canon + superfície pública):** `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md`.  
**Execução na `main` (4 blocos, teste entre blocos, rollback):** `CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md`.

---

## Bloco 1 — Canon final (fechar por escrito)

| Decisão | Registro (preencher em reunião) |
|---------|--------------------------------|
| **Host canônico do app Financeiro** | <!-- ex.: app.financeiro.devflowlabs.com.br ou path único --> |
| **Host do portal (marketing)** | <!-- ex.: devflowlabs.com.br --> |
| **Sessão Supabase** | Cookie/domínio compartilhado ou separado? |
| **Variáveis de ambiente** | `NEXT_PUBLIC_FINANCEIRO_APP_URL` (já no `.env.example`) para origem canônica / links pós-cutover |

**Canon alvo (alinhado à matriz):**

- **Portal (raiz):** landing pública, demo pública, SEO, CTAs — **sem** operação autenticada após cutover.  
- **`apps/financeiro`:** todo fluxo **auth → onboarding → dashboard → contas → …** como fonte da verdade.

---

## Bloco 2 — Rotas que **permanecem** na raiz

| Rota / prefixo | Papel |
|----------------|--------|
| `/ferramentas/financeiro` | Landing pública (só marketing + CTA) |
| `/ferramentas/financeiro/demo` | Demo pública |
| `/ferramentas` (hub) | Hub de ferramentas do portal |
| `/produtos` e narrativa Financeiro | Continua no portal se for só posicionamento |

*(Ajustar lista se alguma landing for movida de propósito.)*

---

## Bloco 3 — Rotas que **migram** para `apps/financeiro`

Operação hoje duplicada ou só na raiz e que deve existir **só** no app:

| Rota (hoje na raiz) | Destino |
|---------------------|---------|
| `/ferramentas/financeiro/auth` | App canônico |
| `/ferramentas/financeiro/auth/callback` | App canônico |
| `/ferramentas/financeiro/onboarding` | App canônico |
| `/ferramentas/financeiro/dashboard` | App canônico |
| `/ferramentas/financeiro/expenses` | App canônico |
| `/ferramentas/financeiro/sources` | App canônico |
| `/ferramentas/financeiro/rules` | App canônico |
| `/ferramentas/financeiro/settings` | App canônico |
| `/ferramentas/financeiro/invites/accept` | App canônico |

Rotas **já** fortes no app (`contas`, `importar`, `historico`, …): manter só no app; raiz não deve reintroduzir cópias.

**APIs na raiz** ligadas a dados do Financeiro: migrar ou proxy documentado junto com o cutover de UI (ver inventário `/api/me`, expenses, …).

---

## Bloco 4 — Redirects e depreciação

| Etapa | Ação |
|-------|------|
| 1 | Publicar redirects **301** (ou rewrite na borda) da raiz → URL canônica do app, path a path onde possível |
| 2 | Manter páginas finas na raiz só se necessário (“você foi redirecionado…”) — idealmente só redirect |
| 3 | Após janela de medição (analytics, logs 404), **remover** implementação morta na raiz |
| 4 | Atualizar `routing-governance.ts` (Fase 1 → rotas operacionais saem de “Fase 2” na raiz ou somem do registro) |
| 5 | Atualizar `MATRIZ-DECISAO-ROTAS.md` (status **ok**, ação **manter** no app) |

**Rollback:** feature flag ou reversão de redirect na borda em minutos.

---

## Revisão `/billing` (dentro do épico)

**Recomendação padrão:** billing **por produto** (Financeiro e WhatsApp cada um com Stripe/telas próprias; raiz sem billing operacional — só preços/comercial). Ratificar no **PR 1** — ver `PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md` §0.

Decisão explícita — preencher:

| Pergunta | Resposta |
|----------|----------|
| `/billing` na raiz hoje é **Stripe do Financeiro**? | Sim → dono final = **app Financeiro** com redirect a partir do portal se ainda existir link institucional |
| Billing **WhatsApp** | Permanece em `apps/whatsapp-platform` |
| “Billing do portal” genérico | Evitar; preferir **um billing por produto** ou página índice com links |

---

## Ordem de execução sugerida

1. Fechar **Fase 1** no GitHub (required check + comunicação).  
2. Workshop **Bloco 1** (canon + env).  
3. Implementar **Bloco 4** redirects para **Bloco 3** (sem remover código na primeira leva, se quiserem dual-run curto).  
4. Remover duplicatas na raiz + ajustar APIs.  
5. Encerrar com **/billing** e atualização da matriz/governança.

---

## Evolução futura (não bloqueia este épico)

**Fase 1.5 — validação semântica (opcional):** segundo script de CI com regras do tipo:

- mudança em `src/app/ferramentas/financeiro/**` → exigir menção correspondente em `routing-governance.ts`;
- nova rota pública na raiz → `owner: portal`;
- rota em `apps/*/src/app` → owner alinhado à policy.

Documentar quando a duplicidade Financeiro estiver resolvida, para não acoplar lint frágil ao estado transitório.

---

*Épico de produto/engineering: abrir no tracker (Linear/Jira) espelhando estes blocos.*
