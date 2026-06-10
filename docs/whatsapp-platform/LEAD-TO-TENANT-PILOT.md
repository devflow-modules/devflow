# Lead → Tenant Pilot Flow

Fluxo interno DevFlow para transformar um **lead qualificado** do CRM portal (`/admin/leads`) em **tenant piloto** da WhatsApp Platform, com rastreabilidade lead → tenant.

Relacionado: [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) · [WHATSAPP-PLATFORM-P0-BACKLOG.md](./WHATSAPP-PLATFORM-P0-BACKLOG.md) · [LEADS-CRM.md](../crm/LEADS-CRM.md)

---

## Objetivo

Fechar a ponte comercial **Home → Diagnóstico → CRM → Piloto real**, sem self-service nem billing automático.

Após P0-05 (lead em `/contato`) e P0-06 (conversão assistida), a DevFlow consegue:

1. Ver o lead no CRM com briefing e origem `inbound_site`.
2. Qualificar comercialmente.
3. Criar ou selecionar tenant na WhatsApp Platform.
4. **Associar** lead ↔ tenant de forma auditável (`convertedToRef` + `notes`).
5. Seguir o runbook de go-live (Meta, webhook, smoke test).

---

## Quando usar

- Lead veio do formulário `/contato` (diagnóstico WhatsApp Platform) ou prospecção interna equivalente.
- Cliente aceitou **piloto assistido** (1 tenant, 1 número, operação com suporte DevFlow).
- Tenant já existe **ou** será criado manualmente antes da conversão no CRM.

**Não usar** para:

- Checkout self-serve / Stripe automático (fora do P0).
- Provisionamento Meta completo sem revisão humana.
- Leads de outros produtos sem intenção WhatsApp Platform.

---

## Pré-requisitos

| Item | Onde verificar |
|------|----------------|
| Lead no CRM | `/admin/leads` — origem `inbound_site`, status avançado (ex.: `qualificado`) |
| Acesso admin CRM | Sessão `platform_admin` ou segredo métricas admin (prod) |
| Base WhatsApp Platform | `WHATSAPP_DATABASE_URL` / `WHATSAPP_DIRECT_URL` no portal (lista tenants na conversão) |
| Deploy WhatsApp Platform | `NEXT_PUBLIC_WHATSAPP_APP_URL` — links para `/admin/tenants` e `/admin/whatsapp` |
| Tenant piloto | Criado via signup assistido, script `ops:provision-devflow-sales` ou admin tenants |
| Runbook técnico | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |

---

## Dados necessários

Antes de converter no CRM, reúna:

| Dado | Onde fica |
|------|-----------|
| Nome / empresa do cliente | `Lead.name`, `Lead.company` |
| WhatsApp do lead | `Lead.phone` |
| Briefing diagnóstico | `Lead.notes` (bloco P0-05) |
| **Tenant ID** (cuid) | WhatsApp Platform — `/admin/tenants` |
| Responsável interno DevFlow | Campo opcional na UI de conversão → `notes` |
| Status piloto (GTM) | `Tenant.gtmLifecycle` (`AVALIACAO` / `IMPLANTADO`) |
| WABA ID | `WhatsappPhoneNumber.wabaId` (app) — **não** no `Lead` |
| Phone Number ID | `WhatsappPhoneNumber.phoneNumberId` (app) |
| Número conectado | `displayPhoneNumber` / provisionamento em `/admin/whatsapp` |

**Nunca** copiar access tokens Meta para o CRM (`Lead`).

---

## Passo a passo manual/assistido

### 1. Qualificar o lead

1. Abra `/admin/leads`.
2. Localize o lead (filtro `origin: inbound_site` ou busca por telefone).
3. Revise `notes` (briefing do diagnóstico).
4. Atualize status para `qualificado` (ou estágio equivalente) via PATCH/UI.
5. Registe contatos em `lastContactAt` / follow-up se aplicável.

### 2. Criar tenant (se ainda não existir)

Escolha **uma** opção:

**A — Signup assistido (app WhatsApp Platform)**

1. Aceda ao app canónico (`NEXT_PUBLIC_WHATSAPP_APP_URL`).
2. Crie conta gestor para o cliente (ou use convite interno).
3. Anote o **tenant ID** em `/admin/tenants`.

**B — Script interno (tenant comercial DevFlow)**

```bash
cd apps/whatsapp-platform
pnpm ops:provision-devflow-sales
# ou com emails de manager/operator documentados no script
```

**C — Admin existente**

- Use tenant já criado para o cliente piloto.

### 3. Provisionar canal WhatsApp (quando aplicável)

1. No app: `/admin/whatsapp`.
2. Selecione o tenant.
3. Registe Phone Number ID, WABA ID e número display (sem expor token no CRM).
4. Siga [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) § Meta / webhook.

### 4. Associar lead → tenant no CRM

1. Em `/admin/leads`, na linha do lead, clique **«Converter em piloto WhatsApp»**.
2. Selecione o tenant na lista **ou** cole o tenant ID manualmente.
3. (Opcional) Informe responsável interno.
4. Marque a caixa de confirmação.
5. Confirme **«Confirmar conversão»**.

**API equivalente** (automação interna):

```http
POST /api/admin/leads/{leadId}/convert
Content-Type: application/json

{
  "tenantId": "cuid-do-tenant",
  "confirm": true,
  "internalOwner": "Nome Ops"
}
```

Auth: mesma política de `/api/admin/leads` (`platform_admin` ou segredo admin em prod).

### 5. Validar associação

- Lead continua visível em `/admin/leads` com badge **Convertido**.
- Link **Tenant piloto** abre `/admin/tenants/{tenantId}` no app WhatsApp.
- `convertedToType`: `whatsapp_platform`
- `convertedToRef`: tenant ID
- `notes`: bloco `[Piloto WhatsApp Platform — conversão CRM]` com IDs de canal (sem tokens)

### 6. Seguir para go-live

1. [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) — env, Meta, deploy.
2. [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) — prova E2E (execução real pendente por ambiente).

---

## Campos que devem ser preenchidos

### No Lead (portal / Prisma root)

| Campo | Valor esperado |
|-------|----------------|
| `status` | `fechado` (após conversão) |
| `convertedAt` | timestamp da conversão |
| `convertedToType` | `whatsapp_platform` |
| `convertedToRef` | **tenant ID** (cuid) |
| `notes` | briefing original + bloco piloto estruturado |
| `lastContactAt` | atualizado na conversão |

### No Tenant (WhatsApp Platform)

| Campo / entidade | Uso |
|------------------|-----|
| `Tenant.name` | Nome cliente/empresa |
| `Tenant.gtmLifecycle` | `AVALIACAO` (piloto) → `IMPLANTADO` pós go-live |
| `WhatsappPhoneNumber.*` | WABA, Phone Number ID, display — **modelo correto** |
| Utilizadores `manager` | Operador cliente |

---

## Como registrar no Lead

A conversão **não apaga** o lead. O sistema:

1. Define `convertedAt`, `convertedToType`, `convertedToRef`.
2. **Append** em `notes` um bloco auditável com tenant, GTM, canais (IDs públicos) e responsável interno.
3. Impede segunda conversão (HTTP 409 se já convertido).

Deduplicação lead↔tenant ou telefone: **não implementada** (P1).

---

## Como validar que o tenant foi criado

| Verificação | Como |
|-------------|------|
| Tenant existe | App → `/admin/tenants` → detalhe do ID |
| Lead associado | CRM → badge Convertido + link Tenant piloto |
| API CRM | `GET /api/admin/leads` → `convertedToRef` preenchido |
| Canal Meta | App → `/admin/whatsapp` → canal ACTIVE ou pendente documentado |
| Sem token no CRM | Inspecionar `Lead.notes` — não deve conter `access_token` / `EAA…` |

---

## Como seguir para o Pilot Runbook

Ordem recomendada após conversão CRM:

1. Confirmar tenant + utilizador gestor no app.
2. Provisionar / validar número (Embedded Signup ou manual admin).
3. Configurar webhook e `META_APP_SECRET` (P0-01).
4. Executar smoke test documentado (P0-03).
5. Handoff e IA conforme P0-04 / P0-07.

---

## Riscos e cuidados

| Risco | Mitigação |
|-------|-----------|
| Converter sem tenant real | API valida tenant na BD WhatsApp (prod); confirmação explícita na UI |
| Duplicar tenant | Criação manual/script — **não** automática no convert; confirmar ID antes |
| Token Meta no CRM | Apenas IDs públicos em `notes`; tokens ficam em `WhatsappPhoneNumber` |
| Lead “some” do funil | Lead permanece; status `fechado` + badge Convertido |
| BD WhatsApp indisponível no portal | Prod: erro 503; dev: permite tenant ID manual sem validação |
| Expectativa self-serve | Documentar fluxo **assistido**; billing/checkout fora do escopo P0 |

---

## Definition of Done

- [ ] Lead qualificado identificado em `/admin/leads`
- [ ] Tenant piloto criado ou selecionado no app WhatsApp Platform
- [ ] Conversão CRM executada com `convertedToRef` = tenant ID
- [ ] `notes` contém trilha piloto (sem tokens)
- [ ] Link Tenant piloto abre detalhe correto no app
- [ ] Canal WhatsApp provisionado ou plano documentado para provisionamento
- [ ] [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) iniciado para go-live
- [ ] Smoke test agendado ([SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md))

---

## Referências de código

| Peça | Caminho |
|------|---------|
| UI conversão | `src/app/admin/leads/AdminLeadsClient.tsx` |
| API convert | `src/app/api/admin/leads/[id]/convert/route.ts` |
| Serviço | `src/lib/lead-pilot-conversion.ts` |
| Lista tenants (select) | `GET /api/admin/leads/whatsapp-tenants` |
| Admin tenants (app) | `apps/whatsapp-platform/src/app/admin/(shell)/tenants/` |
| Provisionamento | `apps/whatsapp-platform/src/app/admin/(shell)/whatsapp/` |
