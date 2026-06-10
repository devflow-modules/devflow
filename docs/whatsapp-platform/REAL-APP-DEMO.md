# WhatsApp Platform — Real App Demo

**Versão:** 1.0 · **Data:** 2026-06-10  
**App canónico:** `apps/whatsapp-platform`  
**Relacionado:** [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) · [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md) · [LGPD-PILOT-CHECKLIST.md](./LGPD-PILOT-CHECKLIST.md) · [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md)

---

## 1. Objetivo

Este documento orienta a equipa comercial e de produto a **apresentar a WhatsApp Platform no app real** (`apps/whatsapp-platform`), com **tenant demo dedicado** e **dados fictícios controlados**.

O objetivo é demonstrar inbox, filas, handoff, IA em safe mode e operação humana **sem**:

- depender apenas da página pública `/demo` (mock estático no portal);
- expor conversas, números ou nomes de **clientes piloto reais**;
- activar bypass inseguro de autenticação em produção.

---

## 2. Diferença entre demo pública, tenant demo e piloto real

| Ambiente | Finalidade | Dados | Público | Onde vive |
|----------|------------|-------|---------|-----------|
| `/demo` pública (portal) | Explicar conceito visual | Mock estático (sem API) | Visitante do site | `src/app/demo/` na raiz do monorepo |
| Vitrine `NEXT_PUBLIC_DEMO_MODE` | Screenshots / portfólio rápido | Fixtures em memória (`src/demo/fixtures.ts`) | Recrutador, marketing | App WhatsApp com mocks — **sem PostgreSQL** |
| **Tenant demo no app real** | Demonstração comercial assistida | Fictícios controlados na BD | Prospect em call | Deploy **staging** + tenant `isInternal` |
| Tenant piloto | Operação real com cliente | Dados reais do cliente | Cliente piloto | Produção / staging dedicado — [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) |

**Regra de ouro:** em call comercial com prospect, usar **tenant demo no app real** (JWT + BD reais, dados fictícios). Reservar `/demo` do portal e `NEXT_PUBLIC_DEMO_MODE` para vitrine rápida — não substituem o app real na venda assistida.

---

## 3. Regras de segurança

- **Nunca** usar conversas reais de cliente piloto na demo comercial.
- **Nunca** misturar tenant demo e tenant piloto no mesmo login ou ecrã.
- **Ocultar números** em partilha de ecrã quando possível; usar apenas contactos fictícios preparados.
- **Não** partilhar prints em canais abertos sem anonimizar (blur em nomes/telefones).
- **Não** documentar nem mostrar tokens Meta, `META_APP_SECRET`, JWT, env vars ou API keys.
- **Não** activar `WHATSAPP_SKIP_WEBHOOK_SIGNATURE` nem `NEXT_PUBLIC_DEMO_MODE` no deploy usado para demo comercial “app real”.
- **Não** criar bypass de auth em produção — login normal com utilizador demo.
- Ambiente recomendado: **staging** isolado, sem tenants de piloto real visíveis para o utilizador demo.
- Safe mode IA **activo** (`WHATSAPP_AI_SAFE_MODE=true` por defeito).

---

## 4. Dados fictícios recomendados

Dataset mínimo para preparar **manualmente** no tenant demo (nomes podem variar; manter claramente fictícios):

| Elemento | Valor sugerido |
|----------|----------------|
| Nome do tenant | **Clínica Aurora (demo)** |
| Flag interna | `isInternal: true` (não confundir com cliente) |
| Gestor demo | **Ana Gestora** — `demo.manager@showcase.devflow.local` |
| Operador demo | **Operador Demo** — `demo.operator@showcase.devflow.local` |
| Linha WhatsApp (UI) | Número fictício ex. `+55 11 90000-0000` — **sem** token real em demo puramente UI |
| Fila 1 | **Vendas** — slug `vendas` |
| Fila 2 | **Suporte** — slug `suporte` |
| Tag | **Orçamento**, **Urgente** |

### Conversas de exemplo (fictícias)

| Thread | Contacto fictício | Telefone fictício | Estado | Caso a mostrar |
|--------|-------------------|-------------------|--------|----------------|
| A | Mariana Silva | `5511988001122` | OPEN, assign ao operador | Aguardando resposta humana |
| B | João Pereira | `5511977002233` | OPEN, sem assign | Fila / prioridade alta |
| C | Empresa Bem-Estar (demo) | `5511966003344` | CLOSED | Conversa encerrada / ganho |
| D | (opcional) | — | PENDING + HIGH | **Handoff** já aplicado |

### Mensagens (sem PII real)

- Inbound: *«Quero confirmar o horário da avaliação amanhã.»*
- Inbound: *«Vocês atendem plano empresarial?»*
- Outbound (humano): *«Olá! Temos horários na terça às 14h. Posso reservar?»*
- IA (se mostrar): apenas respostas genéricas de FAQ — safe mode activo.

**Referência narrativa (só vitrine mock):** `apps/whatsapp-platform/src/demo/fixtures.ts` usa tenant `demo-tenant-showcase` e nomes semelhantes — **não** são dados de BD; servem de roteiro para criar threads reais no staging.

---

## 5. Roteiro comercial da demo (10–15 min)

| Min | Passo | O que mostrar | O que dizer |
|-----|-------|---------------|-------------|
| 0–2 | Contexto | Slide ou verbal | «WhatsApp bagunçado perde leads — aqui tudo fica num inbox com equipa e histórico.» |
| 2–4 | Inbox + filas | `/inbox`, filtros, filas | «Gestor vê o que está pendente, por fila e prioridade.» |
| 4–5 | Conversa nova | Thread B (sem assign) | «Lead entrou; ainda não tem dono — entra na fila.» |
| 5–7 | IA no repetitivo | Thread com FAQ / safe mode | «Perguntas simples podem ser automáticas; temos limites de segurança.» |
| 7–9 | Handoff humano | Thread D ou escalar na hora | «Quando precisa de humano, a conversa fica pendente e priorizada.» |
| 9–10 | Prioridade / SLA | Badge SLA na lista | «Equipa vê o que está mais urgente.» |
| 10–11 | Tags / notas | Tab notas na thread | «Contexto interno sem sair do WhatsApp.» |
| 11–13 | Resposta manual | Enviar mensagem na thread A | «Operador responde pelo mesmo sítio — histórico unificado.» |
| 13–14 | Fechar conversa | Thread C ou fechar A | «Ciclo completo: abrir → atender → fechar.» |
| 14–15 | Técnico (opcional) | Logs com `trace_id` | Só se prospect técnico — [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md), sem PII. |
| 15 | Encerramento | Link `/contato` | «Próximo passo: diagnóstico gratuito e piloto assistido.» |

**Evitar na call:** «tenant», «JWT», «Prisma», «Stripe webhook», valores internos de billing.

---

## 6. Checklist antes da call

- [ ] **Ambiente:** staging dedicado (URL acordada internamente)
- [ ] **`NEXT_PUBLIC_DEMO_MODE` desligado** neste deploy
- [ ] **Tenant demo** seleccionado (ex. «Clínica Aurora (demo)») — anotar `tenantId` internamente, não partilhar em slide
- [ ] **Dados fictícios** conferidos na inbox (secção 4)
- [ ] **Nenhuma conversa real** de piloto visível para o utilizador demo
- [ ] **Operador demo** logado (sessão testada há &lt; 24 h)
- [ ] **Safe mode IA** activo (`WHATSAPP_AI_SAFE_MODE` não desactivado)
- [ ] **Handoff** ensaiado (thread PENDING ou keyword de teste)
- [ ] **Outbound:** decidido se demo é só UI (sem Meta) ou sandbox controlado — ver secção 7
- [ ] **Plano B:** vitrine `NEXT_PUBLIC_DEMO_MODE` local **ou** `/demo` do portal se staging falhar
- [ ] **Link de diagnóstico** pronto: `/contato` no portal

---

## 7. Preparação técnica (estado actual do repositório)

### O que já existe

| Recurso | Caminho | Uso na demo comercial |
|---------|---------|------------------------|
| Modo vitrine (mock) | `NEXT_PUBLIC_DEMO_MODE` → `src/lib/demoMode.ts` | **Não** usar para «app real» — ver secção 2 |
| Fixtures vitrine | `src/demo/fixtures.ts`, `constants.ts` | Roteiro de dados; só activas com vitrine |
| Walkthrough vitrine | `apps/whatsapp-platform/docs/DEMO-WALKTHROUGH.md` | Portfólio / screenshots |
| Provisionamento tenant interno | `pnpm ops:provision-devflow-sales` → `scripts/provision-devflow-sales-tenant.ts` | Cria tenant **DevFlow Sales** + utilizadores; **não** cria conversas |
| Playbook comercial genérico | `docs/whatsapp/DEMO_AND_CLIENT_READINESS_PLAYBOOK.md` | Complementar; foco menos em tenant demo |

### Caminho recomendado hoje (sem seed automatizado)

1. **Staging** com `WHATSAPP_DATABASE_URL` e **sem** `NEXT_PUBLIC_DEMO_MODE`.
2. Criar tenant demo (signup UI ou adaptar script de provisionamento):
   - Nome: **Clínica Aurora (demo)**
   - Marcar `isInternal: true` na BD se aplicável (mesmo padrão do script DevFlow Sales).
3. Criar utilizadores manager + operator com e-mails `@showcase.devflow.local`.
4. Configurar filas, tags e regras de automação (signup já chama `seedDefaultAutomationRules`).
5. **Popular inbox manualmente:**
   - Opção A — inserir threads/mensagens fictícias via UI após mensagens de teste em **número sandbox** dedicado à demo;
   - Opção B — preparar estado na véspera com 2–3 conversas já abertas (recomendado).
6. **Canal WhatsApp na demo:**
   - **Demo só UI:** linha em estado preparado sem outbound real para números de clientes;
   - **Demo com envio real:** usar **apenas** sandbox Meta + telefones fictícios de teste — nunca número de piloto real.

### Reset da demo

| Acção | Como |
|-------|------|
| Fechar threads abertas | Inbox → status `CLOSED` em cada thread demo |
| Limpar conversas antigas | Apagar/arquivar manualmente ou SQL controlado em staging (só equipa técnica) |
| Restaurar handoff | Recriar thread PENDING ou reexecutar cenário de keyword |
| Restaurar filas/tags | Verificar em `/queues` e settings |
| Automatizado | **Não existe** — ver dívida P1 abaixo |

**Registar** data do último reset no canal interno da equipa comercial.

### Dívida P1 (código futuro)

- Script `pnpm ops:seed-commercial-demo` — seed idempotente de threads/mensagens fictícias **apenas** para tenant demo em staging, com confirmação explícita (`--confirm-staging`) e bloqueio em produção.
- Script `pnpm ops:reset-commercial-demo` — reset do mesmo tenant.

**Decisão P0-10:** não implementar seed agora — sem padrão existente que garanta isolamento total de tenants reais; documentar fluxo operacional manual.

---

## 8. O que mostrar e o que não mostrar

### Mostrar

- Inbox, filas, lista de conversas
- Handoff (PENDING / prioridade)
- Resposta humana e histórico
- Tags e notas internas
- Status da conversa (aberta / fechada)
- Visão operacional do gestor (`/dashboard`, `/queues`, `/agents` conforme tempo)

### Não mostrar

- Tokens Meta, env vars, `.env`
- `/admin` sensível ou provisionamento com credenciais
- Logs com telefone completo ou corpo de mensagem real
- Tenant ou threads de **piloto real**
- Consola do browser, Prisma Studio, SQL
- Billing interno / Stripe / identificadores de subscrição reais

---

## 9. Próximo passo após a demo

Fluxo comercial → piloto (documentado em P0-05 a P0-08):

```
Prospect interessado
  → preencher / confirmar diagnóstico em /contato
  → Lead criado no CRM (origin: inbound_site)
  → qualificar em /admin/leads
  → converter lead em tenant piloto (LEAD-TO-TENANT-PILOT.md)
  → seguir PILOT-RUNBOOK.md (tenant NOVO — não reutilizar tenant demo)
  → executar SMOKE-TEST-INBOUND-OUTBOUND.md
  → assinar LGPD-PILOT-CHECKLIST.md §10
```

O **tenant demo** permanece em staging; o **tenant piloto** é sempre separado.

---

## 10. Definition of Done P0-10

| Critério | Estado |
|----------|--------|
| Documento `REAL-APP-DEMO.md` criado | ✅ |
| README `docs/whatsapp-platform/` linka o documento | ✅ |
| Backlog P0-10 actualizado | ✅ |
| Audit actualizada (demo mock vs app real) | ✅ |
| Definição clara tenant demo vs piloto vs `/demo` mock | ✅ |
| Roteiro comercial 10–15 min | ✅ |
| Checklist antes da call | ✅ |
| Nenhum dado real ou segredo no documento | ✅ |
| Seed/reset automatizado | **P1** — documentado como dívida |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-10 | Versão inicial — P0-10 (documentação + auditoria; sem código novo) |
