# Pacote de implantação — Cliente piloto (v1)

**Status:** `current` / `runbook`
**Versão:** 1.1
**Data:** 2026-08-04
**Base de produto:** `main` @ `d9507486996d0397d01548793cb672ed9a1e2e0d`
**Audiência:** comercial, CS, ops e `platform_admin` DevFlow

**Não substitui:** [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md), [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md), [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md), [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md), skill [whatsapp-client-onboarding](../../.cursor/skills/whatsapp-client-onboarding/SKILL.md).

**Objetivo desta v1:** um processo **repetível e assistido** para o primeiro cliente real (número sob controlo do cliente), com limites do Admin Master tratados como **intervenção manual DevFlow**, não como falhas do cliente.

**Caminho mínimo do piloto:** **1 manager + 1 número + Activation Control Center (`/admin/whatsapp`)**. Convite de `operator` fica fora desta fatia (não resolver por banco aqui).

---

## 0. Modelo de responsabilidades (RACI resumido)

| Papel | Responsabilidade |
|-------|------------------|
| **Cliente (manager/operator)** | Controlo do número WhatsApp, BM/admin Meta, verificação empresarial, login na app, atendimento na Inbox |
| **DevFlow `platform_admin`** | Criar/associar tenant, provisionar canal, ativar token, webhook app, smoke, suporte assistido |
| **Infra/Security DevFlow** | Secrets Vercel, keyring, migrations, domínio, rotação de cookie metrics / provision Bearer |

**Princípio:** o cliente opera a **própria empresa** no portal do tenant. A DevFlow opera o **console Admin Master** (`/admin/*`). O cliente **não** recebe tokens Meta, secrets nem acesso `/admin`.

---

## 1. Checklist comercial e pré-requisitos Meta

### 1.1 Comercial (antes de qualquer Meta)

- [ ] Proposta/contrato assinado (âmbito: utilizadores, canais, SLA comercial)
- [ ] Decisor + contacto operacional Meta identificados (sem credencial partilhada)
- [ ] Ambiente acordado: `staging` primeiro quando possível; Production só com GO
- [ ] Alias interno do cliente (sem PII excessiva em tickets)
- [ ] Expectativa: implantação **assistida** (não self-serve Meta no produto)
- [ ] LGPD piloto: [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) §10 antes de tráfego de consumidores finais

### 1.2 Ownership Meta (gate — skill onboarding)

- [ ] Business Portfolio / BM do **cliente** (não assumir BM DevFlow)
- [ ] Admin Meta autenticável pelo titular (2FA/passkey — cliente executa)
- [ ] WABA correta identificada
- [ ] **Número sob controlo do cliente** (recebe SMS/voz/OTP oficial)
- [ ] Se número antigo inacessível → **novo número** (sem SIM de terceiro / bypass)
- [ ] Empresa não verificada: documentar limites Meta como **dependência externa** (HOLD possível)

### 1.3 Pré-requisitos técnicos DevFlow (ops)

- [ ] App `whatsapp.devflowlabs.com.br` (ou URL canónica) saudável
- [ ] Sessão `platform_admin` funcional
- [ ] `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, keyring `WHATSAPP_TOKEN_ENCRYPTION_*` presentes em Production
- [ ] Webhook URL canónica alinhada a [WEBHOOK_META_CHECKLIST.md](../whatsapp/WEBHOOK_META_CHECKLIST.md)
- [ ] Cron de reconcile **desligado** salvo decisão explícita

**Resultado §1:** `GO` comercial parcial | `HOLD` (docs/Meta) | `BLOCKED` (ownership/número) — aplicar acções da §5.

---

## 2. Playbook técnico — tenant e ativação

Ordem canónica. Detalhe de UI: [OPERATIONAL_PLAYBOOK.md](../whatsapp/OPERATIONAL_PLAYBOOK.md). Lead CRM: [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md).

### 2.1 Criar tenant + primeiro manager

**Estado do console (2026-08-04):** **ABSENT** create-tenant na UI Admin Master.

| Opção | Uso |
|-------|-----|
| **A — Signup (padrão)** | Caminho do dia 1. Cliente (ou DevFlow com mandato) conclui o registo em `{SIGNUP_URL}` → tenant + user `manager` |
| B — Script ops | Contingência DevFlow apenas (`ops:provision-devflow-sales` / equivalente; cofre; sem tokens em chat) |
| C — SQL/Prisma | Contingência DevFlow de último recurso; registar no log de evidências |

- [ ] Usar **A** salvo bloqueio técnico justificado (então B, depois C)
- [ ] Preencher `{SIGNUP_URL}` no registo §6 / handoff interno
- [ ] Anotar `tenantId` (opaco) e e-mail do manager
- [ ] Opcional: associar lead CRM (`convertedToRef`) — [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md)
- [ ] **Não** criar `operator` adicional nesta fatia (piloto = 1 manager)

### 2.2 Provisionar canal (PENDING_ACTIVATION)

1. `platform_admin` → **`/admin/whatsapp`** (Activation Control Center)
2. Provisionar: `tenantId`, telefone E.164, `wabaId`, `phoneNumberId`
3. Validar status `PENDING_ACTIVATION`, token ausente
4. Cliente em `/dashboard/whatsapp`: vê “aguardando ativação”; composer bloqueado

### 2.3 Meta (humano — cliente + DevFlow)

- [ ] Número registado Cloud API (cliente controla o telefone)
- [ ] App Meta / WABA / `subscribed_apps` / field `messages`
- [ ] Callback = host canónico `/api/webhook/whatsapp`
- [ ] Verify token = env (nunca colar valor em issue)
- [ ] System User + token permanente (preferido) com permissões mínimas — guardar só em cofre

**Não seguir** runbooks legados `WHATSAPP_CLOUD_ATIVACAO_*` com rotas `/api/admin/whatsapp/onboarding/*` — **inexistentes** no runtime canónico.

### 2.4 Ativar canal

1. `/admin/whatsapp` → **Ativar** → colar token (UI; não logar)
2. Backend valida Cloud API + cifra (`accessTokenEncrypted`) → `ACTIVE`
3. Cliente: composer liberado; seguir smoke §3

**Evidência obrigatória de ativação (arquivar em §6):**

- [ ] Screenshot do estado do canal na UI (ACC e/ou `/dashboard/whatsapp`) — **sem** token visível
- [ ] Confirmação de status **`ACTIVE`**
- [ ] Data/hora, ambiente (`staging` / `production`) e responsável DevFlow

### 2.5 Intervenções manuais explícitas (limites Admin Master)

| Necessidade | No produto hoje | Acção DevFlow |
|-------------|-----------------|---------------|
| Criar tenant | Sem botão admin | **Signup (A)** em `{SIGNUP_URL}`; B/C só contingência |
| Convidar operator | Sem invite | **Fora do caminho mínimo do piloto** — não resolver por banco nesta fatia |
| Transição GTM na UI | Só leitura | API `gtm-lifecycle` ou processo comercial pós-GO |
| Revogar/desativar canal | Sem soft-deactivate | DELETE linha (manager) + re-provision **ou** re-work assistido no ACC |
| Suporte inbox de **outro** tenant | `/admin/conversations` = tenant-casa do PA | Login no tenant do cliente (manager) |
| Troca de número | Sem wizard | DELETE linha + provision + activate |
| Metrics secret cookie | Risco Ops se vazar | Rotação; playbook incidente; não partilhar |

---

## 3. Roteiro do smoke real

**Fonte detalhada:** [SMOKE-TEST-INBOUND-OUTBOUND.md](./SMOKE-TEST-INBOUND-OUTBOUND.md)
**Só com autorização humana explícita para o ambiente alvo.**

### 3.1 Pré-condições

- [ ] Canal `ACTIVE` + token válido (evidência §2.4)
- [ ] Webhook verificado (GET) + assinatura POST em produção
- [ ] Um telemóvel de teste **controlado** (não contactos externos)
- [ ] Máximo **2–3** mensagens no smoke
- [ ] IA autónima **off** / supervisionada conforme piloto
- [ ] Autorizador do ambiente e executor do smoke identificados (§6)

### 3.2 Passos mínimos

1. Inbound do telemóvel de teste → aparece na Inbox do tenant
2. Assign (se aplicável)
3. Reply texto **dentro** da janela 24h
4. Confirmar `wamid` / entrega
5. Fechar thread (opcional)
6. Paragem: se falha → não escalar volume; ver §5 HOLD/BLOCKED

### 3.3 Fora do smoke

Templates broadcast, campanhas, cron reconcile, billing metered, E2E mock da Inbox.

---

## 4. Manual operacional do cliente (handout)

*Texto curto para enviar ao cliente (sem jargão interno). Substituir placeholders antes do envio.*

**Placeholders:** `{LOGIN_URL}` · `{CONTACTO_DEVFLOW}` · (interno) `{SIGNUP_URL}`

---

### A sua conta WhatsApp (DevFlow)

**O que fazemos nós**
Ligamos o vosso número WhatsApp Business à plataforma, configuramos a recepção segura de mensagens e validamos o primeiro envio/recepção consigo.

**O que precisam de garantir**
- Acesso de administrador à Meta Business do **vosso** negócio
- Controlo do telemóvel/número que será o WhatsApp da empresa (recebem o código da Meta)
- Uma pessoa responsável pelo atendimento no dia a dia

**Como aceder**
1. Abrir `{LOGIN_URL}`
2. Entrar com o e-mail e palavra-passe da conta gestor
3. **Inbox** — conversas do dia a dia
4. **Ligação WhatsApp** (painel) — estado da ligação (activo / a aguardar)

**O que não precisam de fazer**
- Não configurar webhooks nem tokens técnicos
- Não partilhar palavra-passe da Meta connosco por chat
- Não usar o número antigo se já não controlam o telefone — usamos um número novo sob o vosso controlo

**Se algo falhar**
Contactar `{CONTACTO_DEVFLOW}`. Indicar: hora aproximada, se a mensagem chegou no telemóvel, e se o painel mostra a conversa (sem colar códigos ou tokens).

---

## 5. Critérios GO / HOLD / BLOCKED — e o que fazer a seguir

| Veredito | Quando | Acção objetiva |
|----------|--------|----------------|
| **GO** | Ownership Meta + número controlado; tenant + manager; canal `ACTIVE` (evidência §2.4); webhook OK; smoke §3 OK; LGPD piloto assinado se Production com consumidores | **Comunicar** aprovação ao cliente; **entregar** handout final (§4 com placeholders preenchidos); **arquivar** evidências §6 |
| **HOLD** | Empresa em verificação Meta; docs pendentes; staging OK mas Production ainda não; GTM/comercial pendente; smoke parcial com plano de retoma | **Não avançar** (não declarar GO nem escalar volume); indicar **owner** + **motivo**; definir correção; **reagendar** smoke; actualizar §6 |
| **BLOCKED** | Sem controlo do número; BM/admin inacessível; credenciais partilhadas/expostas; pedido de bypass Meta; ambiente Production ambíguo; falha de isolamento/segurança aberta | **Não ativar** ou **interromper** ativação; preservar estado seguro (ex.: deixar `PENDING` / não colar token / não abrir tráfego); **escalar ownership**; registar em §6 a **condição de desbloqueio** |

Reavaliação de ownership: skill **whatsapp-client-onboarding** (`APPROVE` / `FIX` / `BLOCK`).

---

## 6. Registo de evidências (case do piloto)

Preencher **um** registo por cliente. **Sem** tokens, OTP, passwords, PII desnecessária.

**Arquivo provisório (canónico ainda não definido):** issue ou registo de implantação **vinculado ao tenant** (título ex.: `implantação — {alias} — {ambiente}`), com link neste pack. Quando existir CRM/sistema canónico, migrar o mesmo conteúdo.

| Campo | Notas |
|-------|--------|
| Alias cliente | ex. `client-pilot-01` |
| Ambiente | `staging` / `production` |
| Ligação staging → produção | datas / “só staging” / “promovido em …” |
| `tenantId` (opaco) | primeiros 8 chars ok |
| WABA ID (opaco) | |
| `phoneNumberId` (opaco) | |
| Data kickoff | |
| Responsável DevFlow (implantação) | |
| Responsável cliente (papel) | |
| Caminho tenant | **A signup** / B script / C (justificar) |
| `{SIGNUP_URL}` / `{LOGIN_URL}` usados | sem credenciais |
| Canal | PENDING → ACTIVE (datas) + link/anexo screenshot §2.4 |
| Executor do smoke | nome/papel |
| Autorizador do ambiente (smoke/GO) | quem autorizou staging/prod |
| Smoke | data, inbound OK, outbound OK, `trace_id` / waMessageId opacos |
| Incidentes | sanitisados |
| Limitações aceites | ex.: 1 manager; 1 número; IA off |
| Veredito | GO / HOLD / BLOCKED |
| Data do veredito | |
| Responsável pelo veredito | |
| Condição de desbloqueio (se BLOCKED/HOLD) | |
| Link do arquivo | URL da issue/registo de implantação |
| Link docs | este pack + folha do smoke |

**Case comercial (após GO estável):** narrativa sem dados técnicos internos — problema, tempo até primeira mensagem útil, volume acordado, depoimento se autorizado.

---

## 7. Ordem do dia (checklist executável)

```text
[ ] §1 Comercial + Meta ownership
[ ] §2.1 Tenant + manager via Signup A ({SIGNUP_URL})
[ ] §2.2 Provision PENDING
[ ] §2.3 Meta (número, webhook, token cofre)
[ ] §2.4 Activate ACTIVE + evidência (screenshot, ACTIVE, data/ambiente/responsável)
[ ] §4 Handout enviado ({LOGIN_URL}, {CONTACTO_DEVFLOW})
[ ] §3 Smoke autorizado e executado
[ ] Treino ao vivo Inbox 15–20 min: abrir conversa, atribuir, responder, pedir ajuda
[ ] §5 Veredito GO/HOLD/BLOCKED + acção correspondente
[ ] §6 Evidências arquivadas na issue/registo de implantação do tenant
```

---

## 8. Referências rápidas

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

## 9. Fora de âmbito desta v1

- BUILD de create-tenant, invite users, deactivate canal, GTM UI, P1 `/queues`
- Redesign Admin Master
- Self-serve Embedded Signup como caminho padrão do piloto
- Resolução de `operator` via banco
- Ativação Meta / smoke **sem** autorização humana adicional por ambiente

---

*Fim do pacote v1.1 (ITERATE executabilidade). Próxima revisão: após primeiro GO real ou após BUILD que elimine uma intervenção manual listada em §2.5.*
