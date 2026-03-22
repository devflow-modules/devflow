# Runbook — Ativação real do número (WhatsApp Cloud API)

Execução operacional no DevFlow Labs usando apenas as rotas admin internas. **Não** colar token, OTP ou PIN em tickets; usar gestor de segredos.

**Base URL local:** `http://localhost:3000` · **produção:** `https://devflowlabs.com.br` (ajuste conforme deploy).

**Header obrigatório (produção):** `x-admin-whatsapp-secret: <ADMIN_WHATSAPP_ONBOARDING_SECRET ou ADMIN_METRICS_SECRET>`  
**Dev:** se nenhum secret estiver definido, rotas podem responder sem header.

---

## 1) Checklist operacional (ordem exata)

| # | Etapa | Comando / ação |
|---|--------|----------------|
| 1 | Validar envs obrigatórias | Ver pré-flight abaixo |
| 2 | Migration aplicada | `pnpm db:migrate` ou `pnpm db:migrate:deploy` |
| 3 | `pnpm prisma generate` | Se schema mudou |
| 4 | Subir aplicação | `pnpm dev` |
| 5 | Pré-flight API | `GET .../prerequisites` → sem blockers críticos |
| 6 | Listar números | `GET .../phone-numbers` → anotar `id` correto |
| 7 | Definir alvo | Exportar `META_PHONE_NUMBER_ID` **ou** passar `phoneNumberId` em cada POST / health |
| 8 | Health antes | `GET .../health?phoneNumberId=...` → `canRequestCode: true` |
| 9 | Solicitar código | `POST .../request-code` (SMS/voz) |
|10 | Operador recebe SMS | Anotar código **fora** do repositório |
|11 | Verificar código | `POST .../verify-code` |
|12 | Registrar PIN 6 dígitos | `POST .../register` (PIN de duas etapas Cloud API, **não** é o SMS) |
|13 | Health final | `GET .../health?phoneNumberId=...` → `readyToSendMessages: true` |
|14 | Documentar evidência | Modelo §9 |
|15 | Troubleshooting | § runbook + rollback §8 |

---

## 2) Pré-flight check

Preencha mentalmente. Resultado único: **READY** | **NOT READY** | **BLOCKED**.

### Checklist técnico

| # | Verificação | READY se |
|---|-------------|----------|
| P1 | Tabela `WhatsappOnboardingState` existe | Migration aplicada sem erro |
| P2 | `DATABASE_URL` / `DIRECT_URL` | App conecta ao Postgres |
| P3 | `META_SYSTEM_USER_TOKEN` **ou** `WHATSAPP_ACCESS_TOKEN` | Valor não vazio |
| P4 | `META_WABA_ID` | ID numérico do WABA correto |
| P5 | `META_PHONE_NUMBER_ID` ou uso explícito na URL/body | Número alvo definido antes do fluxo |
| P6 | `ADMIN_WHATSAPP_ONBOARDING_SECRET` ou `ADMIN_METRICS_SECRET` | Definido em produção |
| P7 | `WHATSAPP_VERIFY_TOKEN` | Definido para health `readyForWebhook` (próximo sprint) |
| P8 | Token com `whatsapp_business_management` | `prerequisites` → `wabaAccessible: true` |
| P9 | Número na WABA | `phone-numbers` contém o `phoneNumberId` alvo |
| P10 | Rota admin responde | `GET .../prerequisites` → `200`, `success: true` |

### Resultado

- **READY:** P1–P10 OK (P7 pode falhar ainda — health não exige para *enviar* mensagem, só webhook).
- **NOT READY:** falta env, secret em prod, ou migration não aplicada — corrigir antes de `request-code`.
- **BLOCKED:** `prerequisites` com falha de token/WABA, ou número não aparece na lista — **parar**; ver tabela §6.

---

## 3) Plano por fases

### Fase A — Preparação
- Aplicar migration; conferir `.env.local` / Vercel.
- Subir app; testar `GET /api/admin/whatsapp/onboarding/prerequisites`.
- Se `403` → configurar header + secret.

### Fase B — Descoberta
- `GET .../phone-numbers` → JSON `data.data[]` com `id`, `display_phone_number`, `code_verification_status`, `platform_type`.
- Escolher o `id` do número em **Pending** / não Cloud API.
- Opcional: `GET .../status?phoneNumberId=<id>` para snapshot detalhado.

### Fase C — Verificação SMS/voz
- `POST .../request-code` com `codeMethod: "SMS"` ou `"VOICE"`, `language: "pt_BR"`.
- Operador insere código em `POST .../verify-code` (corpo só `{ "code": "..." }` — **não** commitar).

### Fase D — Registro
- `POST .../register` com `pin` de **6 dígitos** (senha de duas etapas que você **define** agora; guardar em cofre).
- Se resposta `alreadyRegistered: true` / `idempotent: true` → número já estava na Cloud API; seguir para validação final.

### Fase E — Validação final
- `GET .../health?phoneNumberId=<id>`
- Esperado: `readyToSendMessages: true`, `metaSummary.platformType: "CLOUD_API"`, `blockedReason: "NONE"`, `registeredAt` preenchido (persistência) ou estágio READY.

---

## 4) Requests prontos (curl)

Substitua:
- `$BASE` — URL do app  
- `$SECRET` — valor do header admin  
- `$PID` — `phoneNumberId`  

```bash
export BASE="http://localhost:3000"
export SECRET="seu_admin_secret"
export PID="SEU_PHONE_NUMBER_ID"
export H="x-admin-whatsapp-secret: $SECRET"
```

### GET prerequisites

```bash
curl -sS "$BASE/api/admin/whatsapp/onboarding/prerequisites" -H "$H"
```

**Esperado:** `success: true`, `data.env.hasToken: true`, `data.wabaAccessible: true`, `blockers: []`.

### GET phone-numbers

```bash
curl -sS "$BASE/api/admin/whatsapp/onboarding/phone-numbers" -H "$H"
```

**Esperado:** `data.data[].id`, `display_phone_number`, `code_verification_status`, `platform_type`.

### GET status

```bash
curl -sS "$BASE/api/admin/whatsapp/onboarding/status?phoneNumberId=$PID" -H "$H"
```

**Esperado:** `data.phone` com campos Meta; persistência atualizada em background.

### GET health (com número explícito)

```bash
curl -sS "$BASE/api/admin/whatsapp/onboarding/health?phoneNumberId=$PID" -H "$H"
```

**Esperado (pós-ativação):** `readyToSendMessages: true`, `currentStage: "READY"` ou `"REGISTERED"`, `blockedReason: "NONE"`, `metaSummary.platformType: "CLOUD_API"`.

### POST request-code

```bash
curl -sS -X POST "$BASE/api/admin/whatsapp/onboarding/request-code" \
  -H "$H" -H "Content-Type: application/json" \
  -d "{\"codeMethod\":\"SMS\",\"language\":\"pt_BR\",\"phoneNumberId\":\"$PID\"}"
```

**Esperado:** `success: true`, `data.success: true`. Estado: `codeRequestedAt` gravado.

### POST verify-code

```bash
curl -sS -X POST "$BASE/api/admin/whatsapp/onboarding/verify-code" \
  -H "$H" -H "Content-Type: application/json" \
  -d "{\"code\":\"CODIGO_SMS\",\"phoneNumberId\":\"$PID\"}"
```

**Esperado:** `success: true`. **Erro comum:** código errado/expirado → `VERIFY_CODE_FAILED`.

### POST register

```bash
curl -sS -X POST "$BASE/api/admin/whatsapp/onboarding/register" \
  -H "$H" -H "Content-Type: application/json" \
  -d "{\"pin\":\"123456\",\"phoneNumberId\":\"$PID\"}"
```

**Esperado:** `data.success: true`, `alreadyRegistered: false` **ou** idempotente `alreadyRegistered: true` se já registrado.

---

## 5) Interpretação operacional (campos health)

| Campo | Significado operacional |
|-------|-------------------------|
| `phoneNumberFound` | ID existe na lista WABA |
| `canRequestCode` | Pode pedir novo SMS (não Cloud, não VERIFIED) |
| `canVerifyCode` | Fluxo SMS iniciado (`codeRequestedAt`) e ainda não verificado |
| `canRegister` | Meta marcou VERIFIED, falta register Cloud |
| `readyToSendMessages` | **Critério forte:** Cloud API ativa (`platform_type`) |
| `currentStage` | `CODE_REQUESTED` → `CODE_VERIFIED` → `READY` |
| `blockedReason` | `NONE` = sem bloqueio lógico |
| `persistence.degraded` | DB falhou; fluxo Meta ok mas estado local incompleto |
| `legacy.onboardingStage` | Rótulo compatível com versão anterior |

---

## 6) Runbook — decisão (erro → ação)

| Situação | Ação recomendada |
|----------|------------------|
| `blockedReason: META_TOKEN_INVALID` | Gerar novo System User Token; conferir app WhatsApp no BM |
| `META_PERMISSION_DENIED` | Adicionar `whatsapp_business_management`; reassinar ativos |
| `WABA_NOT_ACCESSIBLE` | Conferir `META_WABA_ID`; token pertence ao BM certo |
| `PHONE_NUMBER_NOT_FOUND` | Relistar `phone-numbers`; corrigir `phoneNumberId` |
| `DISPLAY_NAME_REJECTED` | Ajustar nome no BM; aguardar aprovação antes de escalar volume |
| `DISPLAY_NAME_REVIEW_PENDING` | Aguardar; não insistir em register até resolvido (se bloquear) |
| `MISSING_ENV` | Preencher envs; redeploy |
| `canVerifyCode: false` e sem `request-code` | Executar `request-code` primeiro |
| `VERIFY_CODE_FAILED` (136025) | Novo `request-code`; código expira rápido |
| `REQUEST_CODE_FAILED` (136024) | Cooldown; tentar `VOICE`; aguardar |
| `register` idempotente | Tratar como sucesso; validar health `CLOUD_API` |
| `readyToSendMessages: false` após register | Aguardar propagação; `GET status`; conferir BM; quality RED ainda permite API com limites |
| `persistence.degraded: true` | Corrigir DB/migration; health Meta ainda válido |
| 3+ erros Meta iguais seguidos | **Stop** — abrir ticket com `fbtrace_id`; não loop |

---

## 7) Critério de sucesso do sprint

### Concluído somente se:

- [ ] `phoneNumberFound === true` (health com `phoneNumberId` correto)
- [ ] `codeRequestedAt` preenchido **ou** número já estava adiante do fluxo (documentar)
- [ ] `codeVerifiedAt` preenchido **ou** Meta já `VERIFIED` antes do sprint (sync)
- [ ] `registeredAt` preenchido **ou** `register` idempotente com mensagem de já registrado
- [ ] `blockedReason === "NONE"` (ou só `DISPLAY_NAME_REVIEW_PENDING` com `readyToSendMessages` true)
- [ ] `readyToSendMessages === true`
- [ ] `metaSummary.platformType === "CLOUD_API"`

### Parcialmente concluído se:

- Número VERIFIED e register ok, mas `readyToSendMessages` ainda false após 15–30 min → aguardar replicação Meta; evidenciar timestamps de retentativa.

### Bloqueado se:

- Token/WABA inválidos; número não listado; display name rejeitado e Meta bloqueia; business verification obrigatória (inferida no BM, não só API).

---

## 8) Rollback / quando parar

| Condição | Ação |
|----------|------|
| Token 401/190 após 1 tentativa | Stop — renovar token |
| `phoneNumberId` errado confirmado | Stop — não repetir verify/register no ID errado |
| 2 falhas `verify-code` | Novo `request-code`; se 3ª falha → Stop, revisar número/SIM |
| Permissão negada repetida | Stop — BM / app review |
| Health inconsistente (Cloud API num GET, não no outro) | Stop 10 min; reconsultar `status` |
| Erro Meta genérico sem `fbtrace_id` tratável | Stop — suporte Meta |

**Não** reutilizar OTP antigo após novo `request-code`.

---

## 9) Modelo de evidência (auditoria interna)

Copie para ticket / Confluence (sem segredos):

```json
{
  "runbook": "WHATSAPP_CLOUD_ATIVACAO_REAL",
  "executedAt": "2026-03-18T15:00:00Z",
  "operator": "nome@empresa.com",
  "environment": "production",
  "wabaId": "<META_WABA_ID>",
  "phoneNumberId": "<id>",
  "steps": {
    "prerequisitesOk": true,
    "phoneNumbersListed": true,
    "requestCodeAt": "2026-03-18T15:05:00Z",
    "verifyCodeAt": "2026-03-18T15:08:00Z",
    "registerAt": "2026-03-18T15:10:00Z",
    "registerIdempotent": false
  },
  "healthFinal": {
    "readyToSendMessages": true,
    "blockedReason": "NONE",
    "currentStage": "READY",
    "platformType": "CLOUD_API"
  },
  "issues": []
}
```

---

## 10) Pós-ativação imediata (próximo sprint)

1. **Webhook verification** — configurar callback Meta → `GET/POST /api/webhook/whatsapp` com `WHATSAPP_VERIFY_TOKEN`.
2. **Inbound** — processar payload `messages` no webhook.
3. **Send text** — `POST .../messages` Graph com `phone_number_id` + token.
4. **Templates** — aprovar modelo; envio template-only fora da janela 24h.
5. **Persistência de conversas** — DB + idempotência de `wamid`.
6. **Observabilidade** — logs estruturados, alertas em falha de entrega / quality rating.

---

*Última revisão: alinhado às rotas em `src/app/api/admin/whatsapp/onboarding/`.*
