# PR 1 — Cutover Financeiro: canon e superfície pública (plano técnico)

**Tipo de PR:** preparatório — **não** inclui redirects nem remoção de rotas operacionais na raiz (isso é PR 2+).  
**Épico:** `EPICO-FINANCEIRO-CUTOVER.md`  
**Runbook `main` (blocos A–D, tag, smoke, revert por bloco):** `CUTOVER-FINANCEIRO-RUNBOOK-MAIN.md`  
**Pré-requisito organizacional:** job **Routing governance** como required + time alinhado.

---

## 0. Decisão a fechar antes do merge (gargalo)

### `/billing` e modelo de cobrança

**Recomendação do épico (ratificar explicitamente no PR ou em comentário de merge):**

| Produto | Billing |
|---------|---------|
| **Financeiro** | **Próprio** — UI + APIs + Stripe no app canônico (`apps/financeiro` após cutover). |
| **WhatsApp Platform** | **Próprio** — já isolado em `apps/whatsapp-platform`. |
| **Portal (raiz)** | **Sem billing operacional** — no máximo `/precos`, `/pricing`, CTAs; nada de Customer Portal Stripe “genérico” na raiz após migração. |

Isso é **billing por produto**, não portal central nem híbrido com gateway de pagamento único.

Se a equipe escolher **híbrido** (portal só lista planos + deep link), documentar no `EPICO` e ajustar esta seção antes de PR 3.

---

## 1. Objetivo do PR 1

1. **Congelar o canon** em documentação versionada (donos, URLs, o que é portal vs app).  
2. **Delimitar** o que permanece na raiz nesta fase: landing pública, demo, hub/ferramentas e SEO — **sem** retirar ainda as rotas operacionais duplicadas.  
3. **Registrar** a URL canônica do app Financeiro para links futuros (env + docs alinhados).  
4. **Escolher** modo portal: **só aquisição** (recomendado no cutover) vs **gateway** (redirects finos na raiz — pode ser PR 2).

---

## 2. Escopo **incluído** no PR 1

| Item | Detalhe |
|------|---------|
| Atualizar **`EPICO-FINANCEIRO-CUTOVER.md`** | Preencher Bloco 1 (canon) com valores reais ou placeholders `<!-- PREENCHER -->` resolvidos em review. |
| Atualizar **`MATRIZ-DECISAO-ROTAS.md`** | Uma linha ou nota: “Cutover em andamento — PR1 canon fechado em DATA”. |
| **`docs/ENV_STRUCTURE.md` + `.env.example`** | Documentar `NEXT_PUBLIC_FINANCEIRO_APP_URL` como **origem pública canônica** do app Financeiro (hoje pode ser igual à raiz; pós-cutover = URL do deploy `apps/financeiro`). **Não** introduzir segundo nome (`*_ORIGIN`) sem necessidade — já existe `NEXT_PUBLIC_FINANCEIRO_APP_URL`. |
| **`ROUTING_POLICY.md` ou `routing-governance.ts`** | Apenas se o PR tocar em `page.tsx`/`route.ts` (gate CI). Preferência: **neste PR não alterar rotas** — só docs + env example — assim o CI não exige diff em governança. Se alguém alterar rota, atualizar governança. |
| **Modo portal** | Documentar em épico: “Portal = só aquisição; operação só no app.” |

---

## 3. Escopo **excluído** do PR 1 (evitar big bang)

- Redirects `next.config` ou edge.  
- Remover `src/app/ferramentas/financeiro/{auth,dashboard,...}`.  
- Mudar `FINANCEIRO_*_PATH` em runtime para apontar para outro host (PR 3 ou helper dedicado).  
- Migrar APIs `/api/me`, expenses, etc.

---

## 4. Arquivos-alvo (referência)

| Arquivo | Ação típica no PR 1 |
|---------|---------------------|
| `docs/architecture/EPICO-FINANCEIRO-CUTOVER.md` | Preencher Bloco 1; anexar decisão `/billing`. |
| `docs/architecture/PR1-CUTOVER-FINANCEIRO-PLANO-TECNICO.md` | Este arquivo — pode receber data/versão após merge. |
| `docs/site/MATRIZ-DECISAO-ROTAS.md` | Nota de estado do cutover. |
| `docs/ENV_STRUCTURE.md` | Clarificar `NEXT_PUBLIC_FINANCEIRO_APP_URL`. |
| `.env.example` | Comentário acima da variável + exemplo produção/staging. |
| `apps/financeiro/.env.staging.example` | Alinhar comentário “URL canônica” se divergir da realidade. |

**Consulta (sem obrigação de editar no PR 1):** `src/modules/financeiro/navigation/constants.ts` — paths estáveis até PR 3.

---

## 5. Critérios de aceite

- [ ] Decisão de **billing** explícita (comentário no PR ou seção preenchida no épico).  
- [ ] **URL canônica** do app Financeiro documentada (mesmo que temporariamente igual à raiz).  
- [ ] Lista **explícita** do que fica na raiz após cutover completo (pode repetir tabela do épico) aprovada em review.  
- [ ] Nenhuma mudança de comportamento em produção **não intencional** (ideal: zero mudança de código de runtime no PR 1).  
- [ ] Time sabe: **PR 2** = redirects; **PR 3** = mover/remover rotas operacionais na raiz.

---

## 6. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Doc desatualizado em semana | Data + owner do épico no topo do `EPICO`. |
| Dois nomes de env (`URL` vs `ORIGIN`) | Manter só `NEXT_PUBLIC_FINANCEIRO_APP_URL` até haver refactor nomeado. |
| PR 1 crescer e incluir redirects | Recusar em review — fatiar PR 2. |

---

## 7. Encadeamento (lembrete)

| PR | Foco |
|----|------|
| **PR 1** | Canon + billing + env + docs (este plano). |
| **PR 2** | Redirects + marcar depreciação. |
| **PR 3** | Auth, dashboard, settings, invites… no app; raiz afunila. |
| **PR 4** | Limpeza, matriz, billing impact review. |

---

## 8. Prioridade executiva (checklist externo ao repo)

1. GitHub: **Routing governance** required.  
2. Fechar **/billing** (esta seção §0).  
3. Abrir e mergear **PR 1** conforme este plano.  
4. Só então **PR 2**.

---

*Plano técnico do primeiro passo operacional; não substitui o épico nem a matriz.*
