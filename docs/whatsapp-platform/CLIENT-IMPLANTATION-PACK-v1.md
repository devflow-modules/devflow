# Pacote de implantaÃ§Ã£o â€” Cliente piloto (v1)

**Status:** `current` / `runbook`
**VersÃ£o:** 1.0
**Data:** 2026-08-04
**Base de produto:** `main` @ `d9507486996d0397d01548793cb672ed9a1e2e0d`
**AudiÃªncia:** comercial, CS, ops e `platform_admin` DevFlow

**NÃ£o substitui:** [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md), [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md), [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md), [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md), skill [whatsapp-client-onboarding](../../.cursor/skills/whatsapp-client-onboarding/SKILL.md).

**Objetivo desta v1:** um processo **repetÃ­vel e assistido** para o primeiro cliente real (nÃºmero sob controlo do cliente), com limites do Admin Master tratados como **intervenÃ§Ã£o manual DevFlow**, nÃ£o como falhas do cliente.

---

## 0. Modelo de responsabilidades (RACI resumido)

| Papel | Responsabilidade |
|-------|------------------|
| **Cliente (manager/operator)** | Controlo do nÃºmero WhatsApp, BM/admin Meta, verificaÃ§Ã£o empresarial, login na app, atendimento na Inbox |
| **DevFlow `platform_admin`** | Criar/associar tenant, provisionar canal, ativar token, webhook app, smoke, suporte assistido |
| **Infra/Security DevFlow** | Secrets Vercel, keyring, migrations, domÃ­nio, rotaÃ§Ã£o de cookie metrics / provision Bearer |

**PrincÃ­pio:** o cliente opera a **prÃ³pria empresa** no portal do tenant. A DevFlow opera o **console Admin Master** (`/admin/*`). O cliente **nÃ£o** recebe tokens Meta, secrets nem acesso `/admin`.

---

## 1. Checklist comercial e prÃ©-requisitos Meta

### 1.1 Comercial (antes de qualquer Meta)

- [ ] Proposta/contrato assinado (Ã¢mbito: utilizadores, canais, SLA comercial)
- [ ] Decisor + contacto operacional Meta identificados (sem credencial partilhada)
- [ ] Ambiente acordado: `staging` primeiro quando possÃ­vel; Production sÃ³ com GO
- [ ] Alias interno do cliente (sem PII excessiva em tickets)
- [ ] Expectativa: implantaÃ§Ã£o **assistida** (nÃ£o self-serve Meta no produto)
- [ ] LGPD piloto: [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) Â§10 antes de trÃ¡fego de consumidores finais

### 1.2 Ownership Meta (gate â€” skill onboarding)

- [ ] Business Portfolio / BM do **cliente** (nÃ£o assumir BM DevFlow)
- [ ] Admin Meta autenticÃ¡vel pelo titular (2FA/passkey â€” cliente executa)
- [ ] WABA correta identificada
- [ ] **NÃºmero sob controlo do cliente** (recebe SMS/voz/OTP oficial)
- [ ] Se nÃºmero antigo inacessÃ­vel â†’ **novo nÃºmero** (sem SIM de terceiro / bypass)
- [ ] Empresa nÃ£o verificada: documentar limites Meta como **dependÃªncia externa** (HOLD possÃ­vel)

### 1.3 PrÃ©-requisitos tÃ©cnicos DevFlow (ops)

- [ ] App `whatsapp.devflowlabs.com.br` (ou URL canÃ³nica) saudÃ¡vel
- [ ] SessÃ£o `platform_admin` funcional
- [ ] `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, keyring `WHATSAPP_TOKEN_ENCRYPTION_*` presentes em Production
- [ ] Webhook URL canÃ³nica alinhada a [WEBHOOK_META_CHECKLIST.md](../whatsapp/WEBHOOK_META_CHECKLIST.md)
- [ ] Cron de reconcile **desligado** salvo decisÃ£o explÃ­cita

**Resultado Â§1:** `GO` comercial parcial | `HOLD` (docs/Meta) | `BLOCKED` (ownership/nÃºmero)

---

## 2. Playbook tÃ©cnico â€” tenant e ativaÃ§Ã£o

Ordem canÃ³nica. Detalhe de UI: [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md). Lead CRM: [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md).

### 2.1 Criar tenant + primeiro manager

**Estado do console (2026-08-04):** **ABSENT** create-tenant na UI Admin Master.

| OpÃ§Ã£o | Quando usar |
|-------|-------------|
| A â€” Signup assistido | Cliente (ou DevFlow com mandato) conclui `POST /api/auth/signup` â†’ tenant + user `manager` |
| B â€” Script ops | `ops:provision-devflow-sales` / script interno equivalente (cofre; sem tokens em chat) |
| C â€” SQL/Prisma | **Ãšltimo recurso**; registar no log de evidÃªncias |

- [ ] Anotar `tenantId` (opaco) e e-mail do manager
- [ ] Opcional: associar lead CRM (`convertedToRef`) â€” [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md)
- [ ] Utilizadores extras (`operator`): **ABSENT** invite na UI â†’ criar via signup adicional **nÃ£o** (cria outro tenant) **ou** intervenÃ§Ã£o DB/script â€” **intervenÃ§Ã£o manual DevFlow**

### 2.2 Provisionar canal (PENDING_ACTIVATION)

1. `platform_admin` â†’ **`/admin/whatsapp`** (Activation Control Center)
2. Provisionar: `tenantId`, telefone E.164, `wabaId`, `phoneNumberId`
3. Validar status `PENDING_ACTIVATION`, token ausente
4. Cliente em `/dashboard/whatsapp`: vÃª â€œaguardando ativaÃ§Ã£oâ€; composer bloqueado

### 2.3 Meta (humano â€” cliente + DevFlow)

- [ ] NÃºmero registado Cloud API (cliente controla o telefone)
- [ ] App Meta / WABA / `subscribed_apps` / field `messages`
- [ ] Callback = host canÃ³nico `/api/webhook/whatsapp`
- [ ] Verify token = env (nunca colar valor em issue)
- [ ] System User + token permanente (preferido) com permissÃµes mÃ­nimas â€” guardar sÃ³ em cofre

**NÃ£o seguir** runbooks legados `WHATSAPP_CLOUD_ATIVACAO_*` com rotas `/api/admin/whatsapp/onboarding/*` â€” **inexistentes** no runtime canÃ³nico.

### 2.4 Ativar canal

1. `/admin/whatsapp` â†’ **Ativar** â†’ colar token (UI; nÃ£o logar)
2. Backend valida Cloud API + cifra (`accessTokenEncrypted`) â†’ `ACTIVE`
3. Cliente: composer liberado; smoke Â§3

### 2.5 IntervenÃ§Ãµes manuais explÃ­citas (limites Admin Master)

| Necessidade | No produto hoje | AcÃ§Ã£o DevFlow |
|-------------|-----------------|---------------|
| Criar tenant | Sem botÃ£o admin | Signup / script |
| Convidar operator | Sem invite | Script/DB ou processo comercial |
| TransiÃ§Ã£o GTM na UI | SÃ³ leitura | API `gtm-lifecycle` ou DB assistido |
| Revogar/desativar canal | Sem soft-deactivate | Remover linha (manager) + re-provision **ou** limpar token via activate/re-work assistido |
| Suporte inbox de **outro** tenant | `/admin/conversations` = tenant-casa do PA | Login no tenant do cliente (manager) **ou** user dedicado nesse tenant |
| Troca de nÃºmero | Sem wizard | DELETE linha + provision + activate |
| Metrics secret cookie | Risco Ops se vazar | RotaÃ§Ã£o; playbook incidente; nÃ£o partilhar |

---

## 3. Roteiro do smoke real

**Fonte detalhada:** [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md)
**SÃ³ com autorizaÃ§Ã£o humana explÃ­cita para o ambiente alvo.**

### 3.1 PrÃ©-condiÃ§Ãµes

- [ ] Canal `ACTIVE` + token vÃ¡lido
- [ ] Webhook verificado (GET) + assinatura POST em produÃ§Ã£o
- [ ] Um telemÃ³vel de teste **controlado** (nÃ£o contactos externos)
- [ ] MÃ¡ximo **2â€“3** mensagens no smoke
- [ ] IA autÃ³nima **off** / supervisionada conforme piloto

### 3.2 Passos mÃ­nimos

1. Inbound do telemÃ³vel de teste â†’ aparece na Inbox do tenant
2. Assign (se aplicÃ¡vel)
3. Reply texto **dentro** da janela 24h
4. Confirmar `wamid` / entrega
5. Fechar thread (opcional)
6. Paragem: se falha â†’ nÃ£o escalar volume; ver Â§5 BLOCKED/HOLD

### 3.3 Fora do smoke

Templates broadcast, campanhas, cron reconcile, billing metered, E2E mock da Inbox.

---

## 4. Manual operacional do cliente (handout)

*Texto curto para enviar ao cliente (sem jargÃ£o interno). Adaptar URL e contactos.*

---

### A sua conta WhatsApp (DevFlow)

**O que fazemos nÃ³s**
Ligamos o vosso nÃºmero WhatsApp Business Ã  plataforma, configuramos a recepÃ§Ã£o segura de mensagens e validamos o primeiro envio/recepÃ§Ã£o consigo.

**O que precisam de garantir**
- Acesso de administrador Ã  Meta Business do **vosso** negÃ³cio
- Controlo do telemÃ³vel/nÃºmero que serÃ¡ o WhatsApp da empresa (recebem o cÃ³digo da Meta)
- Uma pessoa responsÃ¡vel pelo atendimento no dia a dia

**Como aceder**
1. Abrir o endereÃ§o de login que vos enviÃ¡mos
2. Entrar com o e-mail e palavra-passe da conta gestor
3. **Inbox** â€” conversas do dia a dia
4. **LigaÃ§Ã£o WhatsApp** (painel) â€” estado da ligaÃ§Ã£o (activo / a aguardar)

**O que nÃ£o precisam de fazer**
- NÃ£o configurar webhooks nem tokens tÃ©cnicos
- NÃ£o partilhar palavra-passe da Meta connosco por chat
- NÃ£o usar o nÃºmero antigo se jÃ¡ nÃ£o controlam o telefone â€” usamos um nÃºmero novo sob o vosso controlo

**Se algo falhar**
Contactar o vosso ponto DevFlow. Indicar: hora aproximada, se a mensagem chegou no telemÃ³vel, e se o painel mostra a conversa (sem colar cÃ³digos ou tokens).

---

## 5. CritÃ©rios GO / HOLD / BLOCKED

| Veredito | Quando |
|----------|--------|
| **GO** | Ownership Meta + nÃºmero controlado; tenant + manager; canal `ACTIVE`; webhook OK; smoke Â§3 OK; LGPD piloto assinado se Production com consumidores |
| **HOLD** | Empresa em verificaÃ§Ã£o Meta; docs pendentes; staging OK mas Production ainda nÃ£o; GTM/comercial pendente; smoke parcial com plano de retoma |
| **BLOCKED** | Sem controlo do nÃºmero; BM/admin inacessÃ­vel; credenciais partilhadas/expostas; pedido de bypass Meta; ambiente Production ambÃ­guo; falha de isolamento/seguranÃ§a aberta |

ReavaliaÃ§Ã£o de ownership: skill **whatsapp-client-onboarding** (`APPROVE` / `FIX` / `BLOCK`).

---

## 6. Registo de evidÃªncias (case do piloto)

Preencher **um** registo por cliente (ticket interno ou CRM). **Sem** tokens, OTP, passwords, PII desnecessÃ¡ria.

| Campo | Exemplo / notas |
|-------|-----------------|
| Alias cliente | `client-pilot-01` |
| Ambiente | staging / production |
| `tenantId` (opaco) | primeiros 8 chars ok |
| `phoneNumberId` (opaco) | |
| Data kickoff / GO | |
| ResponsÃ¡vel DevFlow | |
| ResponsÃ¡vel cliente (papel) | |
| Caminho tenant | signup / script |
| Canal | PENDING â†’ ACTIVE (datas) |
| Smoke | data, inbound OK, outbound OK, trace_ids |
| Incidentes | sanitisados |
| LimitaÃ§Ãµes aceites | ex.: 1 nÃºmero; IA off |
| DecisÃ£o final | GO / HOLD / BLOCKED |
| Link docs | este pack + smoke sheet |

**Case comercial (apÃ³s GO estÃ¡vel):** narrativa sem dados tÃ©cnicos internos â€” problema, tempo atÃ© primeira mensagem Ãºtil, volume acordado, depoimento se autorizado.

---

## 7. Ordem do dia (checklist executÃ¡vel)

```text
[ ] Â§1 Comercial + Meta ownership
[ ] Â§2.1 Tenant + manager
[ ] Â§2.2 Provision PENDING
[ ] Â§2.3 Meta (nÃºmero, webhook, token cofre)
[ ] Â§2.4 Activate ACTIVE
[ ] Â§4 Handout enviado ao cliente
[ ] Â§3 Smoke autorizado e executado
[ ] Â§5 Veredito GO/HOLD/BLOCKED
[ ] Â§6 EvidÃªncias arquivadas
```

---

## 8. ReferÃªncias rÃ¡pidas

| Tema | Documento |
|------|-----------|
| Provision/activate UI | [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md) |
| Webhook Meta | [WEBHOOK_META_CHECKLIST.md](../whatsapp/WEBHOOK_META_CHECKLIST.md) |
| Pilot env | [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |
| Smoke | [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md) |
| Demo comercial | [DEMO_AND_CLIENT_READINESS_PLAYBOOK.md](../whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md) |
| Roles / admin | [PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md](../whatsapp/PLATFORM-ADMIN-AND-CHANNEL-OPERATIONS.md) |
| Escopo produto | [CURRENT-SCOPE.md](./CURRENT-SCOPE.md) |

---

## 9. Fora de Ã¢mbito desta v1

- BUILD de create-tenant, invite users, deactivate canal, GTM UI, P1 `/queues`
- Redesign Admin Master
- Self-serve Embedded Signup como caminho padrÃ£o do piloto
- AtivaÃ§Ã£o Meta / smoke **sem** autorizaÃ§Ã£o humana adicional por ambiente

---

*Fim do pacote v1. PrÃ³xima revisÃ£o: apÃ³s primeiro GO real ou apÃ³s BUILD que elimine uma intervenÃ§Ã£o manual listada em Â§2.5.*
