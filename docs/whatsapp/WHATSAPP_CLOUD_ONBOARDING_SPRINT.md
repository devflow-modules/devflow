# Sprint — Registro do número WhatsApp Cloud API (Meta oficial)

## Objetivo

Operacionalizar o onboarding técnico via **Graph API** (sem BSP): solicitar código SMS/voz, confirmar número, registrar na Cloud API com PIN de duas etapas, inspecionar status e health para troubleshooting.

## Arquitetura (DevFlow Labs)

| Caminho | Função |
|---------|--------|
| `src/modules/whatsapp-onboarding/` | Client Graph, service, env Zod, erros, logs |
| `src/app/api/admin/whatsapp/onboarding/` | Rotas HTTP protegidas |

### Fluxo oficial (ordem)

1. **Pré-requisitos** — WABA criado, app com produto WhatsApp, token com `whatsapp_business_management`.
2. **Listar números** — `GET /{WABA_ID}/phone_numbers` (campos oficiais).
3. **Verificação por SMS/voz** — `POST /{PHONE_NUMBER_ID}/request_code?code_method=SMS|VOICE|IVR&language=pt_BR`.
4. **Confirmar código** — `POST /{PHONE_NUMBER_ID}/verify_code?code=XXXXX`.
5. **Registrar na Cloud API** — `POST /{PHONE_NUMBER_ID}/register` body `{ "messaging_product": "whatsapp", "pin": "123456" }` (PIN de **duas etapas** que você define; não é o SMS).

Referências Meta:

- [request_code](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account-to-number-current-status/request_code)
- [verify_code](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account-to-number-current-status/verify_code)
- [register](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account-to-number-current-status/register/)
- [phone_numbers](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/phone_numbers/)

### IDs e permissões

| Item | Uso |
|------|-----|
| **System User Token** (ou User com permissões) | Bearer na Graph API |
| **whatsapp_business_management** | Obrigatório para request/verify/register |
| **META_WABA_ID** | Listar e contextualizar números |
| **PHONE_NUMBER_ID** | Edges `request_code`, `verify_code`, `register` |

**Display name em revisão:** não há um único campo estável documentado para “review status” no nó usado aqui; use `verified_name` + [Display names](https://developers.facebook.com/docs/whatsapp/display-names/) + webhook `phone_number_name_update`.

## Variáveis de ambiente

Ver `.env.example` (secção Meta onboarding). Resumo:

- `META_SYSTEM_USER_TOKEN` — preferencial  
- `META_WABA_ID` — obrigatório para listagem  
- `META_PHONE_NUMBER_ID` ou `WHATSAPP_PHONE_NUMBER_ID` — padrão se não enviar no request  
- `META_API_VERSION` — ex. `v21.0`  
- `WHATSAPP_VERIFY_TOKEN` — health “pronto para webhook”  
- `ADMIN_WHATSAPP_ONBOARDING_SECRET` — header `x-admin-whatsapp-secret` (produção)

## Rotas admin

Base: `/api/admin/whatsapp/onboarding`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/prerequisites` | Env + teste de leitura do WABA |
| GET | `/phone-numbers` | Lista números do WABA |
| GET | `/status?phoneNumberId=` | Status de um número (+ nota display name) |
| POST | `/request-code` | Body: `codeMethod`, `language`, opcional `phoneNumberId` |
| POST | `/verify-code` | Body: `code`, opcional `phoneNumberId` |
| POST | `/register` | Body: `pin` (6 dígitos), opcional `phoneNumberId` |
| GET | `/health` | Snapshot operacional (opcional `?phoneNumberId=` para validar ID explícito) |

### Exemplos (local)

```bash
export H="x-admin-whatsapp-secret: SEU_SECRET"

curl -sS "http://localhost:3000/api/admin/whatsapp/onboarding/prerequisites" -H "$H"
curl -sS "http://localhost:3000/api/admin/whatsapp/onboarding/phone-numbers" -H "$H"
curl -sS "http://localhost:3000/api/admin/whatsapp/onboarding/health" -H "$H"

curl -sS -X POST "http://localhost:3000/api/admin/whatsapp/onboarding/request-code" \
  -H "$H" -H "Content-Type: application/json" \
  -d '{"codeMethod":"SMS","language":"pt_BR"}'

curl -sS -X POST "http://localhost:3000/api/admin/whatsapp/onboarding/verify-code" \
  -H "$H" -H "Content-Type: application/json" \
  -d '{"code":"123456"}'

curl -sS -X POST "http://localhost:3000/api/admin/whatsapp/onboarding/register" \
  -H "$H" -H "Content-Type: application/json" \
  -d '{"pin":"654321"}'
```

## Erros mapeados (resumo)

| Código interno | Quando |
|----------------|--------|
| TOKEN_INVALID_OR_EXPIRED | 190 / 401 |
| PERMISSION_DENIED | 200 / permission |
| REQUEST_CODE_FAILED | 136024 |
| VERIFY_CODE_FAILED | 136025 |
| INVALID_PARAMETER | 100 |
| RATE_LIMITED | 429 |
| META_UNAVAILABLE | 5xx |
| ALREADY_REGISTERED | mensagem Meta |

## Troubleshooting

- **Pending** — executar `request-code` → `verify-code` → `register`.  
- **Cooldown SMS** — aguardar ou tentar `VOICE`.  
- **register falha** — PIN deve ser 6 dígitos numéricos novos (duas etapas Cloud API).  
- **403 nas rotas admin** — definir `ADMIN_WHATSAPP_ONBOARDING_SECRET` ou `ADMIN_METRICS_SECRET` e enviar header.

## Próximos passos (próximo sprint)

- Webhook verification (`WHATSAPP_VERIFY_TOKEN`)  
- Inbound messages  
- Envio texto / templates  
- Persistência de conversas  

## Checklist de validação

- [ ] Token com `whatsapp_business_management` e acesso ao WABA  
- [ ] `GET .../prerequisites` sem blockers críticos  
- [ ] `GET .../phone-numbers` retorna o número em Pending  
- [ ] `request-code` + SMS recebido  
- [ ] `verify-code` success  
- [ ] `register` success  
- [ ] `GET .../health` indica `readyToSendMessages` e número Cloud API  
- [ ] Webhook configurado no app Meta apontando para `/api/webhook/whatsapp`  

## Persistência local (`WhatsappOnboardingState`)

Tabela Postgres (Prisma): `WhatsappOnboardingState`, chave única `(wabaId, phoneNumberId)`.

| Campo | Uso |
|-------|-----|
| `codeRequestedAt` | Após `request-code` com sucesso |
| `codeVerifiedAt` | Após `verify-code` com sucesso **ou** sync quando Meta já está `VERIFIED` |
| `registeredAt` | Após `register` com sucesso, idempotente, **ou** sync quando `platform_type=CLOUD_API` |
| `lastMetaErrorCode` / `lastMetaErrorMessage` | Última falha Graph (truncado ~2k chars) |
| `lastOperation` | `REQUEST_CODE` \| `VERIFY_CODE` \| `REGISTER` \| `STATUS_SYNC` |
| `lastOperationStatus` | `SUCCESS` \| `FAILURE` \| `SKIPPED_IDEMPOTENT` |
| `lastSuccessAt` | Última operação bem-sucedida |

**Nunca persistido:** token, OTP/SMS, PIN (apenas flags de sucesso/estágio).

Se o Prisma falhar, o serviço continua (health com `persistence.degraded: true`).

## Health operacional (`GET .../health`)

Inferência **enum fechada** `blockedReason` + `currentStage` + capacidades:

| Campo | Regra resumida |
|-------|----------------|
| `canRequestCode` | Token/WABA OK, número encontrado, **não** Cloud API, **não** `VERIFIED` no SMS |
| `canVerifyCode` | Idem + `codeRequestedAt` persistido (fluxo SMS iniciado) |
| `canRegister` | Meta `VERIFIED` e **não** Cloud API |
| `readyToSendMessages` | `platform_type === CLOUD_API` |
| `blockedReason` | `NONE`, `META_TOKEN_INVALID`, `PHONE_NUMBER_NOT_FOUND`, `DISPLAY_NAME_*`, etc. |

`legacy.onboardingStage` mantém rótulos próximos ao health anterior.

### Exemplo de payload (trecho)

```json
{
  "success": true,
  "data": {
    "envOk": true,
    "tokenOk": true,
    "wabaOk": true,
    "phoneNumberFound": true,
    "currentStage": "CODE_REQUESTED",
    "codeRequestedAt": "2026-03-18T12:00:00.000Z",
    "codeVerifiedAt": null,
    "registeredAt": null,
    "canRequestCode": true,
    "canVerifyCode": true,
    "canRegister": false,
    "readyToSendMessages": false,
    "readyForWebhook": true,
    "blockedReason": "NONE",
    "lastMetaError": null,
    "metaSummary": {
      "codeVerificationStatus": "NOT_VERIFIED",
      "platformType": "NOT_APPLICABLE",
      "phoneNumberId": "123456789"
    },
    "persistence": { "enabled": true, "recordId": "clx...", "degraded": false },
    "legacy": { "onboardingStage": "awaiting_sms_verification", "phoneNumbersCount": 1 },
    "meta": { "apiVersion": "v21.0", "wabaIdConfigured": true }
  }
}
```

## Register idempotente

1. **Antes do POST:** se `GET` do número retorna `platform_type=CLOUD_API` → **não** chama register; resposta `{ success, alreadyRegistered: true, idempotent: true }`; persiste `registered_at`.
2. **Após POST com erro:** novo `GET`; se Cloud API → mesmo tratamento.
3. **Mensagem Meta** (“already registered”, etc.) → sucesso idempotente **somente** com padrões seguros em `isRegisterAlreadySatisfiedError`; ainda assim persiste `registered_at`.

Heurística principal de “já na Cloud API”: **`platform_type === CLOUD_API`** (documentação Graph).

### Resposta idempotente

```json
{
  "success": true,
  "data": {
    "success": true,
    "alreadyRegistered": true,
    "idempotent": true,
    "message": "Phone number already on Cloud API (platform_type=CLOUD_API).",
    "hint": "Guarde o PIN..."
  }
}
```

## Migration

```bash
pnpm db:migrate
```

## Testes

```bash
pnpm exec vitest run src/modules/whatsapp-onboarding
```

---

## Ativação real do número (execução em produção)

Runbook operacional completo (checklist, pré-flight, fases A–E, curls, runbook de erros, critérios de sucesso, rollback, evidências, pós-ativação):

**[WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md](./WHATSAPP_CLOUD_ATIVACAO_REAL_RUNBOOK.md)**

Resumo do critério de sucesso:

- `GET /health?phoneNumberId=<id>` com `readyToSendMessages: true`, `blockedReason: NONE`, `metaSummary.platformType: CLOUD_API`.
- Estado persistido coerente (`codeRequestedAt` / `codeVerifiedAt` / `registeredAt` conforme fluxo ou sync Meta).

Troubleshooting e parada segura estão no runbook (não insistir após token inválido, OTP expirado, ou erros Meta repetidos).
