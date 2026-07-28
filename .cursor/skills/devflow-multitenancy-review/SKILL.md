---
name: devflow-multitenancy-review
description: >-
  Reviews multi-tenant isolation for tenant authority, Prisma scoping, IDOR,
  roles, webhooks, jobs and cross-tenant tests. Use when auditing tenant
  boundaries or reviewing authz diffs; emits APPROVE, FIX or BLOCK.
---

# DevFlow — multitenancy review

## Objetivo

Produzir um veredito `APPROVE` | `FIX` | `BLOCK` sobre isolamento multi-tenant nas superfícies afetadas pelo diff/domínio. Default: **review-only** (capacidade `action-enabled`, sem editar produção). Achados vão para issue/fatia separada — esta skill **não** corrige código de produção.

Não é um checklist genérico: cada finding precisa de **path + evidência** (diff, schema, teste ou ausência justificável). O veredito depende do fluxo de autoridade, escopo, retorno e efeitos observáveis — não da mera presença textual de APIs Prisma ou da palavra `tenantId`.

## Gatilhos de uso

- PR/diff em auth, inbox, billing, webhook, admin, ownership/assignment, jobs/filas/cron, schema ou storage com dados de cliente.
- Workflow [`audit-hardening`](../../workflows/audit-hardening.md); commands [`/audit-domain`](../../commands/audit-domain.md), [`/review-pr`](../../commands/review-pr.md), [`/map-impact`](../../commands/map-impact.md).
- Pedido explícito de review de tenant, IDOR, cross-tenant ou elevação admin.
- Mudanças WhatsApp em `apps/whatsapp-platform` ou packages (`whatsapp-core`, `billing-core`).

Não usar para inventar regra de produto, implementar feature, recovery E2E, acessar banco real, migrations/deploy ou ações externas.

## Entradas obrigatórias

- Diff completo das superfícies sensíveis **ou** domínio + mapa de impacto.
- [`AGENTS.md`](../../../AGENTS.md) e [segurança/segredos](../../rules/01-security-and-secrets.mdc).
- Papel [`security-reviewer`](../../agents/security-reviewer.md).
- Quando WhatsApp: [rule](../../rules/05-whatsapp-platform.mdc), [`ARCHITECTURE.md`](../../../docs/whatsapp-platform/ARCHITECTURE.md), [`INBOX_PORT_MULTI_TENANT.md`](../../../docs/whatsapp-platform/INBOX_PORT_MULTI_TENANT.md), [`SECURITY-MODEL.md`](../../../apps/whatsapp-platform/docs/SECURITY-MODEL.md), [`WHATSAPP-ARCHITECTURE-GUARDRAILS.md`](../../../docs/architecture/WHATSAPP-ARCHITECTURE-GUARDRAILS.md).
- Quando schema/queries: [Prisma rule](../../rules/04-prisma-database.mdc); skill [`prisma-safe-migration`](../prisma-safe-migration/SKILL.md) se houver mudança de schema.
- Domínio WhatsApp: [`whatsapp-platform-safe-change`](../whatsapp-platform-safe-change/SKILL.md). Testes: [`test-hardening`](../test-hardening/SKILL.md).

## Fluxo operacional

### 1. Mapear superfícies e boundaries

UI / Server Components → route handlers / Server Actions → services → Prisma/persistence → jobs/filas/cron → webhooks → cache/storage/logs → tests.

Registrar owner do app e boundary (portal `src/` ≠ `apps/whatsapp-platform`; apps não importam apps).

### 2. Declarar origem confiável do tenant

| Fonte | Aceitável quando |
|---|---|
| Sessão/JWT/contexto resolvido no servidor | default para rotas autenticadas |
| Webhook inbound (`phone_number_id` → tenant válido) | assinatura/challenge + resolução server-side inequívoca |
| Elevação `platform_admin` / ops | contexto de plataforma **e** aceite humano explícito |
| Input do cliente (`body`, query, header, path) | **nunca** como autoridade isolada |

Se o tenant efetivo vier de input não confiável sem vínculo server-side → `BLOCK`.

No WhatsApp Platform, isolation root canônico é `Tenant` / `tenantId` (não inventar `Organization` se o schema não a usar).

### 3. Separar autenticação de autorização

- Auth (quem é) ≠ authz (o que pode ler/escrever neste tenant/recurso).
- Role/`platform_admin` no client não autoriza; revalidar no servidor.
- Ownership (claim/transfer/release) e admin paths: compare-and-set e guards no owner do domínio.
- Recurso inexistente vs não autorizado: contrato de erro explícito (`404`/`403`/`409`); vazamento de existência cross-tenant é finding.

### 4. Inspecionar persistência Prisma

Para cada leitura/escrita de **dados pertencentes a tenant** no diff, exigir escopo de tenant do modelo do app **ou** caminho de plataforma justificado.

**Catálogos / tabelas deliberadamente globais** (documentadas, sem dados pertencentes a tenant) **não** exigem `tenantId`. A mera ausência de `tenantId` nessa superfície **não** constitui finding. Se a classificação global não estiver comprovada, registrar evidência pendente — **não** presumir vazamento.

Encontrar `findFirst`, `findUnique`, `tenantId` ou operação em lote no código **não** constitui finding isoladamente.

`BLOCK` quando houver evidência de:

- query comprovadamente sem escopo de tenant (com possibilidade ativa de vazamento);
- `findUnique` / `update` / `delete` / `upsert` por chave global que **retorna, muta, loga ou observa** dados **antes** do vínculo/autorização server-side com o tenant;
- `findFirst` (ou equivalente) usado **como** controle de autorização;
- `updateMany` / `deleteMany` / aggregates / `count` / `groupBy` / joins que misturam ou omitem filtro de tenant em dados de cliente;
- operações em lote que ampliam escopo além dos IDs já autorizados no tenant;
- transação que lê num tenant e escreve noutro, ou race que abandona o filtro.

`FIX` quando:

- o código está corretamente tenant-scoped e **sem exposição demonstrada**, mas falta constraint/índice composto coerente com a regra de unicidade **por tenant**;
- não classificar automaticamente todo gap de integridade/schema como `BLOCK`.

`APPROVE` quando:

- busca inicial por chave global legítima for seguida de vínculo e autorização server-side **comprovados antes** de qualquer retorno, mutação, log sensível ou efeito observável (incluindo `findUnique({ id })` nessa forma);
- `findUnique` / upsert usarem chave composta que inclui tenant;
- demais superfícies afetadas tiverem evidência suficiente (ver §7).

Não recomendar “filtro amplo” (`OR`, wildcards, `in: all`) como fallback de isolamento. `FIX` **nunca** absolve query comprovadamente sem escopo.

### 5. Cobrir superfícies não-HTTP

- Rotas, Server Actions, workers, filas, cron, webhooks Meta/Stripe.
- **Webhooks / integrações:** o identificador externo deve ser **globalmente único** ou combinado com outro atributo confiável que o torne inequivocamente disambiguável. Mapeamento ambíguo capaz de direcionar evento ao tenant errado → `BLOCK`. Rejeitar evento sem tenant válido.
- **Jobs / filas / cron:** se receberem apenas `resourceId` (ou equivalente), devem **restabelecer server-side** a autoridade e o vínculo com tenant **antes** de ler, alterar ou emitir dados. Ausência desse vínculo com possibilidade cross-tenant → `BLOCK`.
- **Cache / storage / arquivos:** resultado tenant-specific exige namespace/chave vinculada ao tenant ou isolamento equivalente comprovado. Cache tenant-specific compartilhado sem isolamento → `BLOCK`.
- Logs/observabilidade: sem PII desnecessária, secrets, payloads assinados ou dumps cross-tenant.

### 6. Exigir testes negativos entre ≥2 tenants

Para superfície de dados de cliente alterada:

- preferir teste (ou evidência equivalente) de que tenant A **não** lê/escreve recurso de tenant B;
- cobrir o caminho feliz **e** o caminho forbidden;
- unit/integration com fixtures sintéticas — **nunca** banco real / produção / E2E operacional nesta skill.

Ausência de teste **não** vira `BLOCK` indiscriminadamente. Distinguir:

- superfície de dados de cliente alterada com teste positivo mas **sem** prova negativa com tenant B → `BLOCK` (falta a prova de isolamento horizontal exigida);
- isolamento aparente (autoridade e queries scoped), **sem exposição comprovada**, porém evidência ou teste crítico ainda incompleto → `FIX` (completar evidência; não absolver query sem escopo);
- mudança cosmético/não crítica sem teste tenant → não elevar automaticamente; registrar `not run`/pendência;
- exposição comprovada, query sem escopo, autoridade ausente ou boundary crítico inseguro → `BLOCK` (o risco concreto, não a mera falta de teste).

`APPROVE` continua a exigir evidência suficiente, incluindo negativos adequados nas superfícies afetadas.

Use [`test-hardening`](../test-hardening/SKILL.md) só para orientar o gap; não implementar correção aqui sem fatia autorizada.

### 7. Classificar e emitir veredito

| Veredito | Critério |
|---|---|
| `APPROVE` | Evidência suficiente de isolamento em **todas** as superfícies afetadas; testes negativos adequados; sem finding `BLOCK`. |
| `FIX` | Falhas corrigíveis e confinadas **sem exposição comprovada** (ex.: evidência/teste incompleto; constraint/índice ausente com queries já scoped); caminhos claros para fatia/issue. |
| `BLOCK` | Tenant de input não confiável; query comprovadamente sem escopo; operação ampla com risco cross-tenant; IDOR; vazamento cruzado; mapeamento externo ambíguo; job/cache sem vínculo; teste em ambiente real; ou boundary crítico inseguro com risco concreto identificado. |

Severidade de findings: `BLOCK` (bloqueia merge/aceitação) | `FIX` (corrigível, não prova vazamento ativo) | note/deferred (não bloqueante, documentado).

Evidência insuficiente **sem** risco concreto identificado → não elevar automaticamente a `BLOCK`; registrar pendência / `FIX` conforme §6. Dúvida com risco concreto em superfície crítica → `BLOCK`, não `APPROVE`.

## Guardrails

- Nunca confiar em `tenantId` (nem `phoneNumberId`, role, plan limits) só do cliente.
- Não recomendar filtro amplo como fallback; não transformar `findFirst`/`findUnique` em authz só pela forma textual.
- Não corrigir código de produção nesta fatia; não acessar banco real; não rodar migrations, deploy, E2E operacional ou ações externas.
- Achados → documentar e encaminhar issue/fatia separada.
- Logs e entregas sanitizados: sem secrets, PII real, connection strings, payloads assinados.
- Cross-tenant só com contexto de plataforma documentado **e** autorização humana explícita (auditável e, para `APPROVE`, testada).
- Não misturar DB portal (ex. Lead/CRM) com DB WhatsApp como mesma autoridade.
- Não enfraquecer auth, assinatura de webhook, idempotência ou audit “para facilitar”.

## Stop conditions

Parar com `BLOCK` / escalar humano quando:

- houver risco concreto: autoridade ausente, query sem escopo, IDOR, mapeamento ambíguo, job/cache cross-tenant, ou boundary crítico inseguro;
- aceite de `platform_admin` cross-tenant estiver ambíguo;
- for pedido relaxar isolamento, auth ou webhook;
- docs canônicas contradisserem o contrato real no código;
- correção exigir redesign estrutural, produção, schema ou migration nesta skill;
- modo review-only / `/audit-domain` e a correção ainda não estiver autorizada;
- ambiente exigir produção ou dados reais de cliente.

## Validações

- Achados com path + evidência (não genéricos). Forma textual de API ≠ finding.
- Caminhos alternativos (`admin/*`, automation, claim/transfer/release, webhooks, jobs) revisados; ausência de revisão com risco concreto → `BLOCK`.
- Prisma: avaliar fluxo (autoridade → escopo → retorno/efeitos), não só a assinatura da chamada.
- Testes negativos ≥2 tenants: `pass` | `fail` | `blocked` | `not run` (com motivo). Positivo sem negativo em superfície de dados de cliente → `BLOCK`. Isolamento aparente com evidência incompleta e sem exposição → `FIX`. Cosmético/`not run` justificado → não elevar.
- Nunca reportar skipped/`not run` como sucesso.
- Edits autorizados por esta skill: `none`.

## Formato da entrega

```text
Escopo analisado:
Superfícies e boundaries:
Origem confiável do tenant: session | webhook mapping | platform elevation | global catalog | other | BLOCK
Auth vs authz:
Prisma / queries / batch / aggregates:
IDOR / horizontal leakage:
Rotas | Server Actions | jobs | filas | cron | webhooks:
Cache | storage | arquivos | logs:
Migrations / constraints / índices (se tocados):
Evidências inspecionadas:
Findings (severidade ↓):
  - [BLOCK|FIX|note] path — issue — evidence
Testes ausentes ou insuficientes (negativos ≥2 tenants):
Risco residual:
Recomendação final: APPROVE | FIX | BLOCK
Encaminhamentos (issue/fatia):
Authorized edits: none
```
