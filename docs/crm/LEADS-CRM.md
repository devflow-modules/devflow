# `/admin/leads` — CRM outbound

Arquitetura geral: **[CRM-ARCHITECTURE.md](./CRM-ARCHITECTURE.md)** (fonte de verdade no Inbox; portal = prospecção interna DevFlow).

Painel **interno** para leads manuais: listagem, filtros, notas, follow-up, métricas de funil e ações rápidas (incl. WhatsApp com templates).

---

## Objetivo

Centralizar **prospecção manual** (origem diversa) num único lugar, com visibilidade de:

- estágio comercial (`status`);
- último contato e próximo follow-up;
- conversão (“ganho” comercial) e ponte opcional para **conversa** no inbox.

Não substitui o produto **WhatsApp Platform** (`apps/whatsapp-platform`); é uma camada **leve** no portal.

---

## Ciclo de vida (conceitual)

1. **Entrada** — lead criado (API ou UI) com `status` padrão `novo`.  
2. **Prospecção** — contatos e mudanças de `status` (ex.: `contato_iniciado` → `respondeu`).  
3. **Qualificação / demo** — estágios como `demo_enviada`, `negociacao`.  
4. **Fecho** — `fechado`, `perdido`, `ganho`, ou **conversão** explícita (ver abaixo).

Os valores exatos de `status` são **strings** livres no modelo, com um conjunto **recomendado** na UI (ordenado por prioridade comercial).

---

## Status (UI recomendada)

Ordem típica na interface (referência):

`novo` → `contato_iniciado` → `respondeu` → `qualificado` → `demo_enviada` → `negociacao` → `reuniao` → `ganho` / `fechado` / `perdido` / `pausado`

- **`fechado`** e **`ganho`** tratam-se como estágios finais positivos para métricas e sugestões automáticas.  
- **`perdido`** / **`pausado`** reduzem pressão de follow-up automático.

---

## Origem (`origin`)

Valores canónicos (recomendado, validados no **POST** da API e na UI de `/admin/leads`):

- `outbound_whatsapp` — prospecção WhatsApp  
- `lead_finder_google_maps` — lead finder (Maps)  
- `inbound_site` — site / inbound  
- `demo` — pedido de demo / fluxo de demo  

Leads antigos com texto livre podem ainda ser guardados/alterados vão **PATCH**; novos must usar o catálogo. Ver `src/lib/outbound-lead-origins.ts` e `docs/whatsapp/DATA-ISOLATION-LEADS-AND-OPERATORS.md`.

---

## Notas (`notes`)

Texto livre por lead; persistido com `PATCH`. Na UI há rascunho local + botão salvar por linha.

---

## Follow-up agendado (`nextFollowUpAt`)

Data/hora do próximo toque planejado. A UI oferece atalhos (+1d / +3d / +7d) e filtros “atrasado / hoje / sem follow-up”.

---

## Conversão comercial (`POST …/convert`)

Regista que o lead foi **convertido** comercialmente (sem criar tenant automaticamente):

| Campo | Significado |
|--------|-------------|
| `convertedAt` | Data/hora da conversão |
| `convertedToType` | Canal alvo (ex.: `whatsapp_platform`) |
| `convertedToRef` | Referência opcional no sistema de destino (pode ser `null`) |

Após conversão, o lead costuma aparecer como **convertido** na UI e ações de mudança de status podem ficar restritas.

---

## Ponte com inbox — `conversationRef`

Identificador canónico da **conversa** (ex. UUID no WhatsApp Platform). Atualizável via `PATCH` com `conversationRef`.

- Com valor: badge **Conversa vinculada** e link para o chat no app (URL canónica no WA: `/admin/conversations/{id}`; ainda existe **redirect** em `/admin/chat?conversationId=…` no deploy do WhatsApp Platform; o host vem de `NEXT_PUBLIC_WHATSAPP_APP_URL`).  
- Sem valor: operador cola o ID e usa **Vincular conversa**.

---

## Resumo de API (leitura)

`GET /api/admin/leads` devolve, entre outros:

- `leads[]` com campos Prisma + derivados (`daysSinceLastContact`, `leadActionState`, `suggestedAction`);
- `actionList[]` — subset que precisa de ação hoje (ver [FOLLOW-UP-ENGINE.md](./FOLLOW-UP-ENGINE.md));
- `summary` — contagens por status, `funnelStageCounts`, `conversionMetrics` (taxas seguras, denominador = total do resumo filtrado).

Detalhe de métricas: [../shared/DEVFLOW-METRICS-DASHBOARD.md](../shared/DEVFLOW-METRICS-DASHBOARD.md) (métricas gerais) e código em `src/lib/admin-lead-conversion-metrics.ts`.
