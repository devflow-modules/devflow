# WhatsApp Client 1 — Production Readiness, UX Simplification & Activation

**Status:** `VALIDATE`
**Classe:** `current` / `backlog`
**Data:** 2026-07-27
**Runtime canónico:** `apps/whatsapp-platform`
**Epic proposta:** `ux(whatsapp): simplify operator inbox for Client 1 pilot`

Plano versionável para preparar o primeiro cliente real sem reescrever a aplicação nem remover capacidades.
Este documento consolida diagnóstico, decisões de produto aprovadas, arquitetura da informação, roadmap e a
matriz de cobertura da primeira issue.

Não substitui:

- [CURRENT-SCOPE.md](./CURRENT-SCOPE.md), para capacidades atuais;
- [ARCHITECTURE.md](./ARCHITECTURE.md), para ownership e trust boundaries;
- [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md), para ativação e operação do piloto;
- [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md), para o smoke real;
- [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md), para privacidade operacional;
- [`INBOX_STATE_MACHINE.md`](../../apps/whatsapp-platform/docs/product/INBOX_STATE_MACHINE.md), para estados;
- [`CONVERSATION_OWNERSHIP_AND_HANDOFF.md`](../../apps/whatsapp-platform/docs/architecture/CONVERSATION_OWNERSHIP_AND_HANDOFF.md),
  para ownership, transferência e CAS.

---

## 1. Diagnóstico executivo

### Recomendação

**`VALIDATE`**, com escopo reduzido e reversível.

A base técnica da WhatsApp Platform é madura: multitenancy, autenticação, Inbox humana, assignment,
transferência, transições CAS, auditoria, webhook Meta, persistência inbound, IA supervisionada e testes.

O risco principal antes do Client 1 é operacional:

- a lista mistura atenção, filtros, CRM, IA, score, filas e ações rápidas;
- o cabeçalho mistura identidade, estado, ownership, fila, tags, notas, auditoria e encerramento;
- o composer mistura resposta, templates, IA, playbook, follow-up e fechamento comercial;
- alguns erros da UI não têm feedback acionável;
- os E2E da Inbox usam APIs mockadas e não substituem o smoke real Meta.

Não há evidência para `GO` amplo antes de:

1. proteger contratos críticos com testes focados;
2. simplificar a jornada principal;
3. validar a UX com usuários;
4. provisionar em staging;
5. executar smoke real;
6. concluir sign-off e LGPD do piloto.

### Principais riscos

| Risco | Evidência | Impacto |
|---|---|---|
| Falha silenciosa em ações rápidas | `ConversationsList` usa mutations sem `onError`; ações em `ConversationItem` | Operador não sabe se claim/close falhou |
| Carga cognitiva na lista | `ConversationItem` mostra estado, CRM, score, IA, SLA, fila e ownership | Próxima conversa fica menos evidente |
| Cabeçalho denso | `ChatHeader` concentra estado e ações primárias/secundárias | Leitura e resposta perdem prioridade |
| Visibilidade por role divergente | fila é renderizada no header; API de mudança exige `manager+` | CTA pode resultar em 403 para operator |
| Cobertura crítica incompleta | não há testes de rota de `send` nem testes de serviço/rota de notas | Mudanças visuais podem mascarar regressões |
| Smoke real pendente | E2E Inbox intercepta APIs em `tests/e2e/helpers/inbox-api-mock.ts` | Produção não foi provada por mocks |

---

## 2. Decisões aprovadas para o Client 1

As decisões abaixo são requisitos de produto aprovados para este plano, não inferências do código.

| Tema | Decisão aprovada |
|---|---|
| Perfil do cliente | Suporte e vendas, priorizando atendimento conversacional no piloto |
| Operação inicial | Um `operator` principal e um `manager` de contingência |
| CRM e fechamento comercial | Fora do caminho principal e fora do piloto inicial |
| IA | Sem resposta autônoma; no máximo sugestão supervisionada |
| Tags | Disponíveis no painel contextual, não no fluxo principal |
| Filas | Só aparecem quando necessárias e para perfis autorizados |
| Filtros primários | `Precisa resposta`, `Minhas`, `Sem responsável` |
| Busca | Permanece em `/conversations` (Histórico) durante o piloto |
| Ownership | Preservar regras atuais |
| Exclusão de notas | Issue separada; não faz parte da primeira issue |
| Ambiente | Staging antes de produção |
| Primeira implementação | Testes críticos antes de alterações visuais |

---

## 3. Fatos, hipóteses, dívidas e preferências

### 3.1 Fatos confirmados no repositório

- `/inbox` é a superfície operacional canónica:
  [`src/app/(protected)/inbox/page.tsx`](../../apps/whatsapp-platform/src/app/%28protected%29/inbox/page.tsx).
- O filtro inicial é `needs_response`: `InboxShell`, estado `filter`.
- A lista oferece sete fases em `ConversationsList`: `all`, `needs_response`, `mine`, `unassigned`,
  `in_attendance`, `awaiting_customer`, `closed`.
- A API de listagem aceita `phase`, `priority`, `businessPhoneNumberId`, `queueId`, `q`, `from` e `to`:
  [`GET /api/inbox/conversations`](../../apps/whatsapp-platform/src/app/api/inbox/conversations/route.ts).
- A busca `q` já existe na API e na superfície `/conversations`, mas não é um campo da lista da Inbox.
- Assignment e status usam CAS, tenant scope, auditoria e realtime:
  `assignThread`, `unassignThread` e `updateThreadStatus`.
- O envio valida autenticação, tenant, billing e canal `ACTIVE`, mas **não** exige que o autor seja o assignee:
  [`POST /api/inbox/conversations/[id]/send`](../../apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/send/route.ts).
- Notas são criadas e listadas por `tenantId` e `threadId` em `internalNoteService`.
- O composer desabilita textarea e botão enquanto `mutation.isPending`, mas o endpoint outbound não recebe
  idempotency key.
- Os E2E da Inbox usam `installInboxOperationalMocks`; não exercitam Prisma, Meta ou Cloud API reais.
- O smoke real está documentado, mas sua execução por ambiente continua obrigatória.

### 3.2 Hipóteses que exigem validação

- Os três filtros primários são suficientes para o Client 1 no uso diário.
- O manager prefere iniciar no dashboard e chegar à Inbox em até dois cliques.
- Manter busca apenas em Histórico é suficiente para o piloto.
- O painel contextual preserva discoverability de notas e tags sem competir com a resposta.
- IA supervisionada agrega valor sem aumentar tempo de primeira resposta.

### 3.3 Dívidas técnicas e documentais

- Não há teste direto do route handler de envio.
- Não há teste direto de `internalNoteService` nem das rotas de notas.
- Estados de erro e vazio de `MessageList` não têm a mesma profundidade de cobertura do loading.
- A UI de assignment cobre erro genérico, mas as ações rápidas da lista não exibem erro.
- `INBOX_UI.md` apresenta drift em relação a SSE e à composição atual.
- A proteção contra clique duplicado é apenas client-side; não existe idempotência HTTP outbound documentada.

### 3.4 Preferências estéticas que não justificam mudança isoladamente

- emojis de ativação;
- estilo residual de chips;
- variações de paleta;
- preferência por cards, tabs ou ícones.

Esses itens só entram se melhorarem legibilidade, acessibilidade ou conclusão das jornadas.

---

## 4. Inventário da experiência atual

### 4.1 Rotas

| Rota | Responsabilidade | Perfis |
|---|---|---|
| `/login` | autenticação | todos |
| `/inbox` | operação diária | `operator`, `manager`, `platform_admin` |
| `/conversations` | histórico, busca e período | `operator`, `manager`, `platform_admin` |
| `/distribuir` | próxima conversa da fila | roles operacionais, sujeito a entitlement |
| `/queues` | visualização/gestão de filas | leitura operacional; mutação `manager+` |
| `/agents` | equipe | `manager`, `platform_admin` |
| `/settings` | configurações do tenant | `manager`, `platform_admin`; operator recebe estado restrito |
| `/admin/tenants` | operação de tenants | `platform_admin` |
| `/admin/whatsapp` | provisionamento de canais | `platform_admin` |

Fontes:

- [`nav-matrix.ts`](../../apps/whatsapp-platform/src/lib/navigation/nav-matrix.ts);
- [`nav-config.ts`](../../apps/whatsapp-platform/src/components/shell/nav-config.ts);
- [`middleware.ts`](../../apps/whatsapp-platform/src/middleware.ts);
- [`settings/layout.tsx`](../../apps/whatsapp-platform/src/app/settings/layout.tsx).

### 4.2 Composição da Inbox

```text
InboxShell
├── PageHeader
│   ├── modo foco
│   ├── estado realtime
│   ├── ajuda
│   └── link Ajustes
├── banners de ativação e billing
├── métricas/equipe em <details>
├── ConversationsList
│   ├── sete filtros de fase
│   ├── filtros de linha e fila
│   ├── alertas agregados de SLA
│   └── ConversationItem
└── ChatWindow
    ├── ChatHeader
    ├── InternalNotesPanel
    ├── ChatAuditTab
    ├── ConversationActionBanner
    ├── MessageList
    ├── DealClosePanel
    ├── MessageInput
    └── LeadDataPanel
```

### 4.3 Estados atuais

| Superfície | Loading | Error | Empty |
|---|---|---|---|
| Página `/inbox` | `Suspense` + `StateLoading` | — | — |
| Lista | skeleton | `StateError` + retry | primeira mensagem ou filtro vazio |
| Mensagens | `StateLoading` | `StateError` + retry | `StateEmpty` + atualizar |
| Envio | botão `A enviar…` | rollback otimista + retry | composer sem thread |
| Notas | texto de loading | erro de criação | “Ainda não há notas” |
| Canal não ativo | banner e composer bloqueado | mensagem 403/503 do servidor | — |

### 4.4 Visibilidade atual por perfil

| Capacidade | Operator | Manager | Platform admin |
|---|---:|---:|---:|
| Inbox e Histórico | sim | sim | sim |
| Claim de conversa sem owner | sim | sim | sim |
| Liberar conversa própria | sim | sim | sim |
| Transferir conversa própria | sim | sim | sim |
| Transferir conversa alheia | não | sim | sim |
| Alterar fila via API | não | sim | sim |
| Confirmar fechamento comercial | não | sim | sim |
| Tenant/canais/provisionamento | não | não | sim |

Essas regras são implementadas no servidor. Ocultar controles no frontend não substitui:

- `threadAssignmentService`;
- `requireRole`;
- `requireFeatureOr403`;
- queries filtradas por `tenantId`.

---

## 5. Problemas priorizados

| ID | Problema | Evidência | Perfil | Jornada | Severidade | Classe | Recomendação |
|---|---|---|---|---|---|---|---|
| F01 | Ações rápidas da lista falham sem feedback | `ConversationsList` mutations | todos | assumir, encerrar, erros | alta | fato | feedback acionável para 403/409/rede |
| F02 | Lista concentra sinais concorrentes | `ConversationItem` | todos | identificar atenção | alta | fato | manter SLA/unread/ownership; mover CRM/IA |
| F03 | Header mistura estado e ações secundárias | `ChatHeader` | todos | compreender e agir | alta | fato | ação primária + menu secundário |
| F04 | Sete filtros sempre visíveis | `ConversationsList` | operator | encontrar próxima | média | fato | três primários + disclosure |
| F05 | Busca fora da Inbox | API `q` + `/conversations` | todos | localizar anterior | média | decisão aprovada | manter Histórico no piloto |
| F06 | “Ajustes” aparece ao operator | `InboxShell` + settings guard | operator | navegação | média | fato | esconder CTA; manter guard server |
| F07 | Fila editável é renderizada para operator | `ChatHeader`; queue API `manager+` | operator | ações secundárias | alta | fato | read-only/oculta por role |
| F08 | Encerrar é imediato | `ChatHeader`, `ConversationItem` | todos | encerrar | média | fato | confirmação mínima |
| F09 | Composer compete com IA/playbook/deal | `MessageInput`, `ChatWindow` | todos | responder | média | fato | texto/enviar dominantes |
| F10 | Tags podem falhar apenas no console | `ChatHeader` | todos | feedback | média | fato | erro inline |
| F11 | Send e notas sem testes diretos | ausência de suites adjacentes | todos | responder/notar | alta | dívida | primeira issue |
| F12 | Smoke real pendente | runbook/sign-off | todos | E2E | crítica | fato | staging + smoke antes de produção |

---

## 6. Arquitetura da informação proposta

### 6.1 Sempre visível

**Lista**

- `Precisa resposta`;
- `Minhas`;
- `Sem responsável`;
- nome/telefone;
- preview;
- tempo de espera/SLA;
- unread;
- owner;
- CTA `Assumir`, quando aplicável.

**Conversa**

- identidade;
- estado operacional em linguagem humana;
- timeline;
- composer;
- feedback de envio;
- ação primária conforme estado.

### 6.2 Conforme o estado

- sem owner → `Assumir`;
- assigned to me → `Liberar` e transferir;
- assigned to another operator → read-only para operator;
- `CLOSED` → `Reabrir`;
- canal não ativo → composer bloqueado e próximo passo claro;
- conflito CAS → mensagem 409 acionável.

### 6.3 Painel contextual

- resumo do cliente;
- notas internas;
- tags;
- dados comerciais, se existentes;
- auditoria;
- sugestões de IA supervisionadas.

### 6.4 Menu secundário

- transferir;
- fila;
- tags;
- estado avançado;
- histórico de auditoria.

### 6.5 Restrição por perfil

- `operator`: Inbox, Minhas, Histórico e contexto operacional;
- `manager`: equipe, filas, métricas e configurações operacionais;
- `platform_admin`: tenants, canais e provisionamento, separados da operação diária.

### 6.6 Adiado para depois do piloto

- CRM e fechamento comercial;
- prospect lens;
- analytics avançado;
- IA autônoma;
- busca inline na Inbox;
- novas automações;
- rebranding.

### 6.7 Wireframe textual

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Canal pendente? aviso acionável]                                   │
│ Inbox · Tempo real · Ajuda                                          │
├────────────────────────┬─────────────────────────────────────────────┤
│ Precisa resposta       │ Cliente · estado · tempo de espera          │
│ Minhas                 │ [Assumir] [Encerrar] [Mais ações]           │
│ Sem responsável        ├─────────────────────────────────────────────┤
│ Mais filtros ▸         │ Timeline                                    │
│                        │                                             │
│ Crítico (2)            ├─────────────────────────────────────────────┤
│ Cliente A · 8 min      │ [Mensagem____________________] [Enviar]     │
│ Cliente B · comigo     │ Respostas assistidas ▸ · Contexto ▸        │
└────────────────────────┴─────────────────────────────────────────────┘
```

---

## 7. Epic e issues

### Epic

`ux(whatsapp): simplify operator inbox for Client 1 pilot`

### Dependências

```text
Issue 1 (baseline de contratos)
  → Issue 2 (shell e role visibility)
    → Issue 3 (lista e priorização)
      → Issue 4 (header e ações)
        → Issue 5 (composer)
          → Issue 6 (painel contextual)
            → Issue 7 (estados e a11y)
              → Issue 8 (validação E2E/usabilidade)
```

As issues são sequenciais por segurança de revisão, mas cada uma deve produzir diff próprio e reversível.

### Issue 1

`test(whatsapp): lock critical inbox contracts before Client 1 UX changes`

- **Objetivo:** criar baseline de regressão antes da mudança visual.
- **Escopo:** send, notas, tenant, CAS, roles, audit e estados críticos.
- **Fora:** comportamento de produção, autorização nova, policy de notas, migrations.
- **Dependências:** nenhuma.
- **Rollback:** remover apenas testes novos; nenhum efeito runtime.

Detalhamento completo na [secção 10](#10-primeira-issue--baseline-de-contratos-críticos).

### Issue 2

`ux(whatsapp): simplify inbox shell and role-aware navigation`

- **Objetivo:** deixar a entrada operacional clara para operator.
- **Escopo:** shell, CTA Ajustes, métricas/hints por perfil, modo foco.
- **Fora:** guards server-side, dashboard, billing e admin.
- **Dependência:** Issue 1.
- **Risco:** confundir apresentação com autorização.
- **Aceite:** operator vê apenas navegação útil; manager/admin mantêm superfícies autorizadas.
- **Testes:** UI, nav matrix, permissions e a11y.
- **Rollback:** render condicional.

### Issue 3

`ux(whatsapp): prioritize conversations requiring operator attention`

- **Objetivo:** identificar a próxima conversa sem instrução.
- **Escopo:** três filtros primários, disclosure dos demais, item simplificado, feedback de ações.
- **Fora:** remover filtros/API, alterar SLA/ranking/CAS, adicionar busca.
- **Dependência:** Issue 2.
- **Risco:** esconder refinamento usado.
- **Aceite:** `Precisa resposta` default; SLA/ownership visíveis; filtros avançados preservados.
- **Testes:** UI, URL state, E2E lista e teclado.
- **Rollback:** composição da lista; API intacta.

### Issue 4

`ux(whatsapp): clarify conversation header and primary actions`

- **Objetivo:** separar identidade/estado de ações secundárias.
- **Escopo:** header compacto, claim/release/close, confirmação de close e menu secundário.
- **Fora:** alterar assignment/status/CAS/audit.
- **Dependência:** Issue 3.
- **Risco:** esconder ação necessária ou regredir foco.
- **Aceite:** ações corretas por estado/role; 403/409 acionáveis.
- **Testes:** header, E2E transfer/close, a11y.
- **Rollback:** header; serviços intactos.

### Issue 5

`ux(whatsapp): simplify composer and sending feedback`

- **Objetivo:** tornar responder a ação dominante.
- **Escopo:** textarea/enviar, pending/error/retry, canal inativo, IA/templates em disclosure.
- **Fora:** Cloud API, billing, IA e contratos de envio.
- **Dependência:** Issue 4 e baseline de send da Issue 1.
- **Risco:** envio duplicado, rollback otimista incorreto, esconder 402/403.
- **Aceite:** envio único por interação; texto preservado no erro; retry acionável.
- **Testes:** component, route send, E2E mock; smoke real posterior.
- **Rollback:** UI; endpoint intacto.

### Issue 6

`ux(whatsapp): move secondary data into an on-demand context panel`

- **Objetivo:** preservar capacidades sem competir com leitura/resposta.
- **Escopo:** resumo, notas, tags, dados e auditoria em painel contextual.
- **Fora:** remover dados/rotas, reescrever CRM, alterar auth.
- **Dependência:** Issues 4 e 5.
- **Risco:** discoverability e focus trap.
- **Aceite:** painel abre por teclado, fecha com Escape, restaura foco e respeita role.
- **Testes:** UI, notas, a11y e role visibility.
- **Rollback:** layout; dados preservados.

### Issue 7

`fix(whatsapp-ui): harden empty, loading, error and responsive inbox states`

- **Objetivo:** eliminar estados ambíguos.
- **Escopo:** loading, empty, filtered empty, error, offline/realtime fallback, mobile e teclado.
- **Fora:** dashboard, atalhos globais, redesign.
- **Dependência:** Issues 2–6 estabilizadas.
- **Risco:** E2E frágil e anúncios excessivos para screen reader.
- **Aceite:** todo estado explica situação e próximo passo; nenhuma ação principal cortada.
- **Testes:** UI, E2E Inbox e a11y.
- **Rollback:** componentes de estado.

### Issue 8

`test(whatsapp): validate Client 1 operator inbox usability and pilot readiness`

- **Objetivo:** validar antes do provisionamento real.
- **Escopo:** dez jornadas, teste moderado, métricas e sign-off UX.
- **Fora:** provisionamento Meta e declaração automática de `GO`.
- **Dependência:** Issues 1–7.
- **Risco:** amostra enviesada, Playwright skipped e evidência com PII.
- **Aceite:** metas da secção 8.
- **Testes:** E2E autenticado, a11y e sessão humana.
- **Rollback:** não aplicável à validação; rollout segue runbook.

---

## 8. Estratégia de validação

| Critério | Meta | Evidência |
|---|---:|---|
| Conclusão do fluxo principal | ≥ 80% sem ajuda | tarefas fixas, pass/fail |
| Identificar próxima conversa | sem instrução | primeira escolha observada |
| Primeira resposta | ≤ 2 minutos | cronómetro até outbound confirmado |
| Erros graves | 0 | sem duplicidade, perda, wrong tenant ou close indevido |
| Dúvidas | ≤ 1 por tarefa | registro do facilitador |
| Clareza percebida | ≥ 4/5 | pergunta pós-tarefa |
| Teclado | ações principais completas | checklist de foco |
| A11y automatizada | 0 violações serious/critical | axe no chat/drawer/estados |
| Segurança | 0 regressões | tenant, roles, CAS, audit, feature gates |

### Participantes

- dois operadores com experiência em atendimento WhatsApp;
- um manager;
- opcionalmente um participante reserva;
- facilitador DevFlow sem interferir até o fim da tarefa.

### Tarefas

1. entrar;
2. identificar conversa que exige atenção;
3. abrir e compreender;
4. assumir;
5. responder;
6. adicionar nota;
7. transferir para o manager quando necessário;
8. encerrar;
9. encontrar conversa no Histórico;
10. reconhecer erro, bloqueio e confirmação.

Evidência não deve conter tokens, corpo integral de mensagens nem PII desnecessária.

---

## 9. Ordem no roadmap

1. **Production readiness mínima:** baseline de contratos e revisão dos runbooks.
2. **Simplificação UX da Inbox:** Issues 2–8.
3. **Ativação Meta e provisionamento:** tenant, usuários e canal em staging.
4. **Smoke técnico real:** inbound → assign → send → close.
5. **Onboarding assistido:** treinamento do operator e manager.
6. **Piloto de 14 dias:** uso real com suporte assistido.
7. **Métricas e entrevistas:** tempos, erros, clareza e tickets.
8. **Decisão:** `GO`, `ITERATE` ou `NO-GO`.

---

## 10. Primeira issue — baseline de contratos críticos

### 10.1 Título

`test(whatsapp): lock critical inbox contracts before Client 1 UX changes`

### 10.2 Problema

A próxima sprint alterará composição, visibilidade e feedback da Inbox. Hoje, os contratos mais sensíveis
estão cobertos de forma desigual:

- assignment e status têm suites fortes;
- envio tem cobertura de component/E2E mock, mas não do route handler real;
- notas têm apenas cobertura superficial de componente;
- role visibility cobre ownership, mas não todas as ações secundárias;
- loading/empty/error não possuem baseline uniforme.

Sem baseline, um diff visual pode:

- ocultar 401/402/403/409;
- enviar duas vezes por interação;
- perder rollback otimista;
- deixar notas cross-tenant acessíveis;
- remover auditoria;
- alterar acidentalmente ownership/CAS.

### 10.3 Risco reduzido

Esta issue reduz risco de regressão antes da mudança visual. Ela **não** corrige regras de negócio nem
transforma dívidas atuais em novos contratos.

### 10.4 Contratos existentes protegidos

#### Envio

Rota: `POST /api/inbox/conversations/[id]/send`

Símbolos:

- `POST` em `send/route.ts`;
- `sendInboxMessage`;
- `MessageInput`;
- `InboxComposerTextField`.

Contrato atual:

- `401` sem sessão;
- `400` para JSON/text inválido ou telefone inválido;
- thread lida com `{ id, tenantId }`;
- `402` quando billing bloqueia;
- `403` para canal não ativo;
- `503` para canal não configurado;
- `502` para falha Cloud;
- sucesso persiste outbound, atualiza preview, registra usage e audit `message_send`;
- qualquer usuário autenticado do tenant pode chamar a rota; **não existe assignee gate no envio**.

#### Duplicidade outbound

Contrato atual:

- o composer passa `sendDisabled={mutation.isPending}`;
- `InboxComposerTextField.send` não chama `onSend` quando `sendDisabled`;
- botão/textarea ficam desabilitados enquanto pending.

Limite:

- o endpoint não recebe idempotency key;
- repetir a requisição HTTP pode gerar dois envios Meta;
- idempotência inbound por `waMessageId` é um contrato diferente e não prova idempotência outbound.

A primeira issue deve testar apenas a prevenção de interação duplicada existente no client. Se o teste
falhar, parar e abrir decisão de comportamento; não implementar idempotência server-side nesta issue.

#### Ownership

Rotas/símbolos:

- `POST /api/inbox/conversations/[id]/assign`;
- `assignThread`;
- `unassignThread`;
- `ChatHeader`.

Contrato atual:

- claim somente `null → user`, com CAS;
- owner ou `manager+` transfere/libera;
- operator terceiro recebe forbidden/conflict;
- `CLOSED` não muda ownership;
- no-op não gera audit/realtime.

Ownership de assignment **não** deve ser reinterpretado como autorização de envio.

#### Status

Rotas/símbolos:

- `POST /api/inbox/conversations/[id]/status`;
- `updateThreadStatus`;
- `autoUpdateStatusOnNewMessage`.

Contrato atual:

- `OPEN`, `PENDING`, `CLOSED`;
- mesma transição é no-op;
- update usa CAS;
- conflito persistente retorna `409`;
- mudança real registra audit e realtime;
- inbound reabre `CLOSED/PENDING`.

#### Notas

Rotas/símbolos:

- `GET/POST /api/inbox/conversations/[id]/internal-notes`;
- `listInternalNotes`;
- `createInternalNote`;
- `InternalNotesPanel`.

Contrato atual:

- autenticação obrigatória;
- listagem por `tenantId` e `threadId`;
- criação valida existência da thread no tenant;
- texto é trimado;
- criação registra `internal_note_create`;
- nota é interna e não é enviada à Meta.

Exclusão e política autor/manager ficam fora desta issue.

#### Auditoria

A baseline deve preservar:

- `message_send`;
- `assign`;
- `unassign`;
- `status_change` com `previousStatus` e `status`;
- `internal_note_create`.

### 10.5 Matriz requisito × cobertura × lacuna

| Requisito | Contrato real | Teste atual | Lacuna | Teste proposto | Nível | Real ou mock |
|---|---|---|---|---|---|---|
| Envio com sucesso | `send/route.ts::POST` | `inboxUi.test.tsx` “MessageInput envia resposta”; E2E “envia mensagem” | route real não coberto | sucesso chama adapter uma vez, persiste outbound, atualiza preview, usage e `message_send` | integração de route | handler real; Prisma/Meta/billing mockados |
| 401 no envio | `getAuthFromRequest` | nenhum teste de send route | ausência total | sem auth retorna 401 e não chama adapter/persistência | integração de route | handler real; auth mock |
| Isolamento da conversa no envio | `findFirst({ id, tenantId })` | só inspeção do código | sem assert | thread de outro tenant resulta 404; query inclui tenant da sessão | integração de route | handler real; Prisma mock |
| Billing/canal | 402/403/503 | nenhum teste direto | ausência | casos de limite, canal inativo e canal ausente preservam payload/status | integração de route | handler real; boundaries mockadas |
| Erro Cloud visível | route 502 + `MessageInput` retry | E2E “falha de envio mostra aviso e retry” com mock | sem component assert de texto preservado/retry único | erro remove optimistic, mantém `retryText`, retry reenvia uma vez | component | componente real; fetch mock |
| Prevenção de clique duplicado | `mutation.isPending` + `sendDisabled` | nenhum teste específico | contrato client não protegido | duas interações rápidas enquanto promise pendente produzem uma chamada | component | componente real; promise/fetch mock |
| Persistência outbound repetida | `waInboxCreateOutbound` verifica `tenantId_waMessageId` | idempotência inbound coberta; outbound não | contrato de persistência sem teste | mesmo `waMessageId` no tenant não cria segunda row nem repete side effects | unit/service | implementação real; transaction/realtime mockados |
| Idempotência HTTP outbound | inexistente | inexistente | não é contrato atual | **não criar teste**; registrar limite | fora de escopo | — |
| Claim CAS | `assignThread` | `threadAssignmentService.test.ts`: claim, dois claims, CAS miss | coberto | manter suite sem alteração | unit/integration service | implementação real; Prisma/audit/realtime mock |
| Transfer/release por role | owner/manager+ | service tests + `ChatHeader.assignment.test.tsx` | E2E de transfer ausente, mas não bloqueia baseline | manter testes; E2E transfer pertence à Issue 4 | unit/component | implementação real nos services; UI dependencies mock |
| 409 assignment | route mapping | `assign/route.test.ts` “retorna 409 conflict”; UI erro acessível | coberto | manter suite sem alteração | route/component | route real com service mock |
| Close/reopen | `updateThreadStatus` | service, route, UI e E2E mock | forte | adicionar somente assert UI com mensagem de conflito 409 específica | component | componente real; API mock |
| 409 status CAS | route mapping | `status/route.test.ts` + service retry | UI cobre erro genérico, não mensagem de conflito | mockar erro de conflito e validar `role=alert` + retry | component | componente real; fetch function mock |
| Audit assignment/status | `logAction` | service tests verificam `assign`, `unassign`, `status_change` | coberto | manter | service | implementação real; audit mock observado |
| Audit send | `logAction(..., "message_send")` | nenhum teste | ausência | sucesso chama audit com tenant/thread/user e apenas `textLength` | route | handler real; audit mock |
| Criar nota | `createInternalNote` | componente só lista empty | serviço/route sem testes | trim, tenant/thread, DTO e audit create | service + route | implementação real; Prisma/audit mock |
| Visualizar notas | `listInternalNotes` | `inboxUi.test.tsx` só empty | não cobre linhas/autor/ordem | lista retorna notas do tenant/thread e painel renderiza conteúdo/autor | service + component | implementação real no service; UI fetch mock |
| Isolamento de notas | `where: { tenantId, threadId }` | nenhum teste | ausência | assert query e POST cross-tenant retorna 404 via service | service + route | implementação real; Prisma mock |
| Delete de nota | contrato atual separado | nenhum teste | policy não decidida | **não cobrir nesta issue** | issue separada | — |
| Role visibility ownership | `ChatHeader` | operator/owner/manager/CLOSED cobertos | coberto para ownership | manter; não codificar fila divergente | component | componente real; hooks/fetch mock |
| Fila por role | API `manager+`; UI atual diverge | sem teste de alinhamento | gap confirmado | não criar teste que congele UI indesejada; corrigir na Issue 2 | fora da Issue 1 | — |
| Loading de mensagens | `MessageList` | `inboxUi.test.tsx` “MessageList mostra loading” | coberto | manter | component | componente real; query pendente mock |
| Error de mensagens | `StateError` + retry | nenhum teste direto | ausência | erro exibe título/mensagem e retry chama refetch | component | componente real; fetch mock |
| Empty de mensagens | `StateEmpty` + atualizar | nenhum teste direto | ausência | vazio mostra copy e ação Atualizar | component | componente real; fetch mock |
| Empty da lista | primeira mensagem/filtro vazio | teste de primeira mensagem | filtro vazio/error da lista não cobertos | cobrir filtered empty e `StateError` + retry | component | componente real; fetch mock |
| E2E browser | jornada crítica | `tests/e2e/inbox.spec.ts` cobre list, send, retry, assign, status e mobile | usa API mock; não cobre notas/tenant/Meta | não ampliar nesta issue salvo regressão de selector; manter como gate | E2E | browser real; APIs mockadas |
| Smoke real | Meta → DB → Inbox → Meta | somente runbook | execução pendente | executar após provisionamento em staging, não nesta issue | manual E2E | implementação/serviços reais |

#### Limite deliberado da Issue 1

A auditoria também encontrou ausência de testes diretos para rotas de mensagens, audit log e listagem por
fase. Esses gaps são reais, mas não entram na primeira issue porque já existem contratos de service/component
que protegem as mudanças visuais imediatas. Incluir todas as rotas, filtros SQL, Histórico e E2E adicionais
transformaria a issue de `M` para `L`.

Ficam explicitamente adiados:

- testes próprios de `GET .../messages`;
- testes próprios de `GET .../audit`;
- testes de route para `phase=mine` e `phase=unassigned`;
- testes SQL internos de `waInboxQueries`;
- expansão da busca do Histórico;
- UI do `ChatAuditTab`;
- delete de nota.

### 10.6 Arquivos exatos

#### Adicionar

1. `apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/send/__tests__/route.test.ts`
2. `apps/whatsapp-platform/src/modules/inbox/__tests__/internalNoteService.test.ts`
3. `apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/internal-notes/__tests__/route.test.ts`
4. `apps/whatsapp-platform/src/modules/inbox/__tests__/waInboxMessageService.outbound.test.ts`

#### Modificar

5. `apps/whatsapp-platform/src/components/inbox/__tests__/inboxUi.test.tsx`
6. `apps/whatsapp-platform/src/components/inbox/__tests__/ChatHeader.status.test.tsx`

#### Executar sem modificar inicialmente

7. `apps/whatsapp-platform/src/modules/inbox/__tests__/threadAssignmentService.test.ts`
8. `apps/whatsapp-platform/src/modules/inbox/__tests__/threadStatusService.test.ts`
9. `apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/assign/__tests__/route.test.ts`
10. `apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/status/__tests__/route.test.ts`
11. `apps/whatsapp-platform/src/components/inbox/__tests__/ChatHeader.assignment.test.tsx`
12. `apps/whatsapp-platform/tests/e2e/inbox.spec.ts`

Não modificar código de produção nesta issue.

### 10.7 Estratégia por camada

#### Unit / service

Usar implementação real de:

- `assignThread`;
- `unassignThread`;
- `updateThreadStatus`;
- `listInternalNotes`;
- `createInternalNote`.
- `waInboxCreateOutbound`.

Mockar apenas:

- Prisma;
- audit publisher observado;
- realtime;
- automation dispatch.

#### Route integration

Importar o route handler real e mockar boundaries:

- `getAuthFromRequest`;
- Prisma;
- `WhatsAppCloudAdapter`;
- billing enforcement;
- channel guard/resolution;
- persistence outbound;
- usage/audit/observability.

Asserir status HTTP, payload e efeitos observáveis.

#### Component

Renderizar componentes reais com:

- `QueryClient`;
- `fetch`/funções de API mockadas;
- promises controladas para pending;
- roles mockadas apenas no boundary de sessão.

Asserir por role, mensagem acessível e ação do usuário, não por snapshot amplo.

#### E2E

`tests/e2e/inbox.spec.ts` continua com browser real e APIs mockadas. É gate de composição, não prova:

- tenant isolation real;
- Prisma;
- Meta;
- Cloud API;
- webhook;
- idempotência outbound.

O smoke real pertence às etapas 3–4 do roadmap.

### 10.8 Critérios de aceite

- nenhum arquivo de produção alterado;
- nenhum contrato HTTP alterado;
- nenhum guard de auth/tenant/role relaxado;
- suite nova de send cobre sucesso, 401, cross-tenant 404, 402, 403/503 e 502;
- sucesso de send verifica persistência, preview, usage e `message_send`;
- component test prova uma chamada durante pending e retry após erro;
- persistência do mesmo `waMessageId` outbound não cria segunda row nem repete side effects;
- testes de notas cobrem list/create, trim, tenant/thread e `internal_note_create`;
- delete de notas permanece fora;
- suites existentes de assignment/status/CAS continuam verdes;
- conflito 409 permanece visível e recuperável na UI;
- loading/error/empty críticos ficam cobertos;
- Playwright skipped é reportado como não executado;
- nenhuma evidência contém PII ou secrets.

### 10.9 Comandos de validação

Executar a partir de `apps/whatsapp-platform`:

```bash
pnpm test:node -- \
  "src/app/api/inbox/conversations/[id]/send/__tests__/route.test.ts" \
  "src/modules/inbox/__tests__/internalNoteService.test.ts" \
  "src/app/api/inbox/conversations/[id]/internal-notes/__tests__/route.test.ts" \
  "src/modules/inbox/__tests__/waInboxMessageService.outbound.test.ts" \
  "src/modules/inbox/__tests__/threadAssignmentService.test.ts" \
  "src/modules/inbox/__tests__/threadStatusService.test.ts" \
  "src/app/api/inbox/conversations/[id]/assign/__tests__/route.test.ts" \
  "src/app/api/inbox/conversations/[id]/status/__tests__/route.test.ts"
```

```bash
pnpm test:ui -- \
  "src/components/inbox/__tests__/inboxUi.test.tsx" \
  "src/components/inbox/__tests__/ChatHeader.assignment.test.tsx" \
  "src/components/inbox/__tests__/ChatHeader.status.test.tsx"
```

```bash
pnpm test:e2e:inbox
```

Antes de merge:

```bash
pnpm test:node
pnpm test:ui
pnpm lint
```

Se as credenciais E2E não estiverem presentes, `test:e2e:inbox` deve ser reportado como `SKIPPED`,
não como `PASS`.

### 10.10 Evidências esperadas

- output dos comandos com contagem `passed`, `failed` e `skipped`;
- lista dos cenários adicionados;
- diff restrito a testes e, se necessário, atualização desta matriz;
- demonstração de falha dos testes quando tenant/CAS/audit são removidos nos mocks de mutação;
- resultado E2E explicitamente classificado;
- nenhum log com tokens, mensagens reais ou dados de cliente.

### 10.11 Riscos e stop conditions

| Risco | Mitigação |
|---|---|
| Teste excessivamente acoplado a chamadas internas | asserir status/payload/efeitos observáveis |
| Mocks que sempre retornam sucesso | cenários 401/402/403/404/409/502 obrigatórios |
| Teste de duplicidade falhar no comportamento atual | parar; não corrigir produção dentro desta issue |
| Descobrir que send precisa assignee gate | decisão de produto separada; não mudar aqui |
| Descobrir policy de delete de notas | issue separada |
| E2E skipped | registrar; não declarar gate verde |
| Issue crescer para código de produção | interromper e replanejar |

### 10.12 Rollback

Como a issue é test-only:

- reverter arquivos de teste adicionados/modificados;
- não há migration;
- não há dados a restaurar;
- não há contrato/runtime a reverter.

Se um teste revelar bug real, a issue deve terminar com evidência vermelha ou ser seguida por issue específica;
não misturar correção de produção no mesmo diff sem nova aprovação.

### 10.13 Estimativa

**Tamanho:** `M`

Estimativa relativa:

- 4 suites novas;
- 2 suites existentes ampliadas;
- aproximadamente 20–30 cenários/asserts;
- sem mudanças de produção.

A issue permanece reviewable se respeitar os seis arquivos alterados. Se exigir mudança em handler,
component ou schema de produção, deve ser reduzida e replanejada.

### 10.14 Branch recomendada

`test/whatsapp-client-1-inbox-contracts`

Não criar a branch antes de aprovação explícita.

### 10.15 Plano de commits pequenos

1. `test(whatsapp): cover inbox send route contracts`
   - route handler de send;
   - auth, tenant, billing, channel, Cloud error, persistence e audit.

2. `test(whatsapp): cover outbound persistence idempotency`
   - mesmo `waMessageId` não cria segunda row;
   - não confundir com repetição de `POST /send`.

3. `test(whatsapp): cover internal note isolation and audit`
   - service e route de list/create;
   - tenant/thread, trim e audit;
   - sem delete.

4. `test(whatsapp-ui): lock inbox feedback and critical states`
   - duplicate interaction guard;
   - send retry;
   - status 409;
   - loading/error/empty.

Cada commit deve passar os testes focados correspondentes antes do próximo.

### 10.16 Recomendação para iniciar a Issue 1

**`APPROVE`**, após a redução explícita para o baseline `M`, com estas condições:

1. diff test-only;
2. sem idempotência HTTP nova;
3. sem assignee gate novo no envio;
4. sem policy de delete de notas;
5. parar se qualquer teste exigir mudança de produção;
6. reportar Playwright skipped como não executado.
7. não expandir para routes de messages/audit/list, filtros SQL ou Histórico.

---

## 11. Decisões futuras que ainda exigem aprovação

- landing do manager: dashboard ou Inbox;
- critério para habilitar filas no piloto;
- momento de disponibilizar IA supervisionada;
- policy autor/manager para excluir notas;
- eventual idempotência outbound no servidor;
- eventual restrição de send ao assignee;
- promoção de busca inline após evidência do piloto.

Nenhuma dessas decisões é necessária para começar a Issue 1 no escopo test-only.
