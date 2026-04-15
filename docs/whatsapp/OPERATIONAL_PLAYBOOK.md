# Playbook operacional — Onboarding assistido WhatsApp

**Versão:** 2.0 · **Produto:** DevFlow WhatsApp Platform · **Audiência:** equipa interna (ops / dev)

---

## 1. Visão geral

O onboarding é **assistido**: a equipa prepara conta e canal; o **cliente não configura** a Meta nem OAuth no produto. O sistema mostra o número e o estado no dashboard; o envio real depende da **verificação da Business Manager** na Meta e da **ativação com token** depois disso.

O **fluxo padrão** de provisionamento e ativação é feito pelo **painel interno**, sem terminal:

**`/admin/whatsapp`**

Este painel permite:

- criar canais WhatsApp manualmente
- visualizar o estado de todos os canais
- ativar canais após aprovação da Meta
- diagnosticar problemas **sem uso de terminal**

O uso de **curl** ou **script** é apenas **fallback operacional** (debug ou falha no painel). Este documento descreve o fluxo real alinhado ao produto e às APIs atuais.

---

## 2. Checklist rápido (TL;DR)

### Checklist de onboarding (Admin)

- [ ] Acessar `/admin/whatsapp`
- [ ] Criar canal (**Provisionar**)
- [ ] Validar status `PENDING_ACTIVATION`
- [ ] Validar dashboard do cliente
- [ ] Entregar acesso ao cliente

Após aprovação Meta: ativar o canal no mesmo painel (botão **Ativar** + token). Ver secções 4 e 5.

**Autenticação:** o painel exige sessão com papel **`platform_admin`**. Os endpoints HTTP de fallback usam `Authorization: Bearer <WHATSAPP_MANUAL_PROVISION_SECRET>` (definir no ambiente; ver `.env.example` do app `whatsapp-platform`).

---

## 3. Passo a passo detalhado

### 3.1 Criar utilizador

Não existe no repositório um endpoint único documentado como `POST /api/admin/registrar-manual`. O processo típico é um dos seguintes (ajustar ao que a vossa equipa já usa):

- **Signup / convite** via fluxo existente da aplicação, ou
- **Script / painel interno** que cria `Tenant` + `User` na base WhatsApp Platform.

**Dados úteis a recolher:** email, nome, papel (`operator` / `manager` / `platform_admin` conforme política), e o **`tenantId`** resultante — necessário para provisionar o canal.

---

### 3.2 Provisionar canal via painel

1. Acessar: **`/admin/whatsapp`**
2. Preencher o formulário:
   - **Tenant**
   - **Telefone** (E.164, ex.: `+5511999999999`)
   - **WABA ID**
   - **Phone Number ID**
3. Clicar: **Provisionar canal**
4. Validar:
   - o canal aparece na tabela
   - **status** = `PENDING_ACTIVATION`

**Esperado na base:** registo em `whatsapp_phone_numbers` com `status = PENDING_ACTIVATION` e `access_token` nulo.

**No produto (cliente):** canal visível em `/dashboard/whatsapp`, com card e estado “aguardando ativação” (copy da UI).

Se o Embedded Signup estiver oculto (`NEXT_PUBLIC_WHATSAPP_SHOW_EMBEDDED_SIGNUP=0`), o cliente não vê fluxo OAuth — só o estado do canal manual.

---

### 3.3 Validação no painel admin

No painel `/admin/whatsapp`:

- **Status** visível na tabela (badges: pendente / ativo / erro)
- Coluna **Token**: presente / ausente (indica se há token persistido; o valor nunca é mostrado)
- Coluna **Pronto para envio**: alinhada a `ACTIVE` + token
- Botão **Painel** abre `/dashboard/whatsapp` na **sessão atual** (útil para validação rápida; não troca de tenant sozinho)

Use **Atualizar** na linha ou recarregar a página para refrescar a lista.

---

### 3.4 Validar UI do cliente antes da entrega

Com um utilizador do **mesmo tenant**, autenticar e confirmar:

- [ ] Aparece o card **«Seu número já está configurado»** (ou equivalente)
- [ ] Badge / estado **«Aguardando ativação»** (ou equivalente na língua da UI)
- [ ] **Inbox** abre sem erro
- [ ] **Composer** desativado (sem envio até `ACTIVE` + token)
- [ ] Tooltips nos controlos bloqueados (envio, IA, automações conforme implementado)

---

### 3.5 Entrega para o cliente

Modelo de mensagem (ajustar tom à marca):

```text
Sua conta já está pronta.

Assim que a Meta aprovar sua empresa, o WhatsApp será ativado automaticamente após configurarmos o token do lado da operação.

Você já pode acessar o sistema e acompanhar o painel e a inbox; o envio de mensagens fica liberado quando o canal estiver ativo.
```

Incluir: URL de login, esclarecimento de que **não** é necessário configurar Meta pelo cliente neste modelo.

---

## 4. Ativação pós-verificação

### 4.1 Gerar token

Na Meta: **WhatsApp → API Setup** (ou ferramenta equivalente do vosso processo), gerar um **access token** válido para o número / WABA em questão.

---

### 4.2 Ativar canal via painel

1. Acessar: **`/admin/whatsapp`**
2. Localizar o canal na tabela
3. Clicar: **Ativar**
4. Inserir o **access token** (textarea)
5. Confirmar (**Ativar** no modal)
6. Validar:
   - **status** = `ACTIVE`
   - **Pronto para envio** = sim (✅)

O backend valida o token contra a Cloud API e persiste `status = ACTIVE` com token guardado.

---

### 4.3 Validação pós-ativação

- [ ] No painel: `ACTIVE` e colunas coerentes (token presente, pronto para envio)
- [ ] No dashboard do cliente: desaparece o estado “aguardando”; pode aparecer toast ao detetar ativação
- [ ] **Envio** liberado na inbox (composer ativo)
- [ ] Teste rápido: enviar mensagem para um número conhecido

---

## 5. Teste final (produção)

### Teste final (via painel)

- [ ] **Status** `ACTIVE` visível em `/admin/whatsapp`
- [ ] Envio **liberado** no sistema (composer / guards conforme código)
- [ ] Mensagem **enviada com sucesso** (inbox → WhatsApp)
- [ ] **Inbound** recebido na inbox (resposta ou mensagem nova)

Checklist ampliado:

- [ ] Cliente recebe no WhatsApp no aparelho
- [ ] Estados de entrega / conversa coerentes com o esperado

---

## 6. Troubleshooting

| Sintoma | Causa provável | O que fazer |
|--------|----------------|-------------|
| **Canal não aparece no painel** | `tenantId` errado no provisionamento ou canal nunca criado | Confirmar tenant na lista; repetir provisionamento; ver fallback `ops:check-channel` |
| **Não ativa pelo painel** | Token inválido, expirado ou erro devolvido pela API | Ler mensagem de erro no toast / resposta; gerar token novo na Meta; repetir **Ativar** |
| **Não fica “Pronto para envio”** | Token ausente ou **status** ≠ `ACTIVE` | Concluir ativação com token válido; confirmar colunas no painel |
| Resposta / erro `CHANNEL_NOT_ACTIVE` | Canal ainda `PENDING_ACTIVATION` ou sem token válido | Ativar no painel; em último caso `POST .../activate` (fallback) |
| Webhook não recebe eventos | URL de callback / app não subscrito / `verify_token` | Ver documentação de webhook (`WHATSAPP_VERIFY_TOKEN`, URL pública) |
| Mensagem não envia (502 / erro Cloud API) | Token expirado, revogado ou sem permissão | Gerar novo token; repetir ativação |
| Número “não funciona” / API rejeita | BM ou número ainda não elegível na Meta | Confirmar verificação de negócio e estado do número no Business Manager |
| Erro de base ao correr scripts | `WHATSAPP_DATABASE_URL` / pooler | Confirmar `?pgbouncer=true` em URLs de pooler (Supabase), conforme docs do app |

**Permissão:** só utilizadores com **`platform_admin`** acedem a `/admin/whatsapp`. Sem esse papel, o painel não está disponível.

---

## 7. Boas práticas

- **Não** pedir ao cliente para “ir na Meta” neste modelo de onboarding — a operação trata token e ativação.
- **Sempre** provisionar canal **antes** de comunicar “conta pronta”, para o dashboard refletir a realidade.
- **Sempre** fazer uma passagem rápida na UI do cliente (secção 3.4) e no painel admin (3.3) antes de entregar credenciais.
- **Meta:** após aprovação, a ativação no sistema deve ser **minutos**, não horas — token + **Ativar** no painel.

---

## 8. Uso avançado (fallback)

⚠️ Usar apenas em **debug**, automação ou quando o painel não estiver disponível.

**Endpoints** (mesma lógica que o painel; autenticação por segredo Bearer **ou** pode ser chamada por ferramentas com o mesmo contrato que a UI interna, conforme implementação atual):

- `POST /api/admin/whatsapp/channel/manual`
- `POST /api/admin/whatsapp/channel/activate`
- `GET /api/admin/whatsapp/channels` — listagem (útil para inspeção programática)

**Header (fallback típico):**

```http
Authorization: Bearer <WHATSAPP_MANUAL_PROVISION_SECRET>
Content-Type: application/json
```

**Exemplo manual (provisionar):**

```http
POST /api/admin/whatsapp/channel/manual
Authorization: Bearer <WHATSAPP_MANUAL_PROVISION_SECRET>
Content-Type: application/json
```

```json
{
  "tenantId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "phone": "+5511999999999",
  "wabaId": "xxxxxxxxxxxx",
  "phoneNumberId": "xxxxxxxxxxxx"
}
```

**Exemplo ativação:**

```json
{
  "channelId": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  "accessToken": "EAAG..."
}
```

**Script de sanity check (CLI):**

```bash
cd apps/whatsapp-platform
pnpm run ops:check-channel -- --tenant-id=<TENANT_ID>
```

Detalhes das flags: secção 9.

---

## 9. Script de sanity check (`ops:check-channel`)

Local: `scripts/ops/check-whatsapp-channel.ts`

**Uso (recomendado a partir do app, com env carregado):**

```bash
cd apps/whatsapp-platform
pnpm run ops:check-channel -- --tenant-id=<TENANT_ID>
# ou
pnpm run ops:check-channel -- --phone-number-id=<META_PHONE_NUMBER_ID>
# ou
pnpm run ops:check-channel -- --channel-id=<WPN_ROW_CUID>
```

| Flag | Descrição |
|------|-----------|
| `--tenant-id` | Lista todas as linhas WhatsApp desse tenant |
| `--phone-number-id` | Uma linha pelo ID da Meta (`phone_number_id`) |
| `--channel-id` | Uma linha pelo ID interno (CUID) |
| `--fail-if-not-active` | Exit code 1 se existir linha esperada mas nenhuma estiver `ACTIVE` com token |

Variáveis: `WHATSAPP_DATABASE_URL` e `WHATSAPP_DIRECT_URL` (como nos outros scripts do monorepo).

---

## 10. Referências no repositório

| Tema | Onde |
|------|------|
| Painel admin (UI) | `apps/whatsapp-platform/src/app/admin/whatsapp/` |
| APIs admin de canais | `apps/whatsapp-platform/src/app/api/admin/whatsapp/` |
| Código de provisionamento / ativação | `apps/whatsapp-platform/src/modules/whatsapp/whatsappChannelLifecycle.ts` |
| Estados e guards | `whatsappChannelGuards.ts`, Prisma `WhatsappPhoneNumberStatus` |
| Variáveis de ambiente | `apps/whatsapp-platform/.env.example` |

---

*Última atualização: fluxo **admin-first** (`/admin/whatsapp`); curl/script como fallback; estados `PENDING_ACTIVATION` / `ACTIVE` / `ERROR`.*
