# WhatsApp Platform — LGPD Pilot Checklist

**Versão:** 1.0 · **Data:** 2026-06-10  
**App canónico:** `apps/whatsapp-platform`  
**Relacionado:** [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) · [AI_AUTOMATION.md](./AI_AUTOMATION.md) · [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md) · [docs/crm/LEADS-CRM.md](../crm/LEADS-CRM.md)

---

## 1. Objetivo

Este documento define **cuidados mínimos de privacidade e proteção de dados** para operar um **piloto real** da WhatsApp Platform com **1 cliente**, tratando mensagens WhatsApp, dados de contacto, histórico de atendimento, logs, CRM interno DevFlow e acesso de equipa.

**Importante:**

- **Não substitui** análise jurídica, parecer de advogado ou DPA formal.
- Serve para **operação inicial assistida** (DevFlow + cliente piloto), reduzindo risco operacional evidente.
- Deve ser **revisado e assinado** antes do go-live e **reavaliado** antes de escala comercial ou novos clientes.
- Não promete conformidade total com a LGPD ou outras normas — orienta práticas mínimas alinhadas ao que o produto já faz hoje.

---

## 2. Escopo de dados tratados

### Dados do lead DevFlow (portal / CRM)

Origem típica: formulário `/contato`, prospecção interna, lead finder.

| Dado | Onde fica | Finalidade operacional |
|------|-----------|------------------------|
| Nome | `Lead.name` (Prisma portal) | Contacto comercial |
| WhatsApp / telefone | `Lead.phone` | Contacto comercial |
| Empresa | `Lead.company` | Qualificação |
| Segmento | `Lead.notes` (briefing) | Qualificação |
| Volume de mensagens | `Lead.notes` | Diagnóstico |
| Problema relatado | `Lead.notes` | Diagnóstico |
| Melhor horário | `Lead.notes` | Agendamento |
| Briefing estruturado | `Lead.notes` | Handoff comercial → piloto |

### Dados do cliente piloto (WhatsApp Platform)

| Dado | Onde fica | Finalidade operacional |
|------|-----------|------------------------|
| Nome da empresa | `Tenant.name` | Identificação do tenant |
| Tenant / account ID | `Tenant.id`, `Lead.convertedToRef` | Isolamento multi-tenant |
| Número WhatsApp conectado | `WhatsappPhoneNumber.displayPhoneNumber`, `Tenant.whatsappPhone` | Canal de atendimento |
| WABA ID | `WhatsappPhoneNumber.wabaId` | Integração Meta |
| Phone Number ID | `WhatsappPhoneNumber.phoneNumberId` | Integração Meta |
| Utilizadores autorizados | `User` (email, nome, role) | Acesso ao inbox/admin |

### Dados de conversas

| Dado | Onde fica | Finalidade operacional |
|------|-----------|------------------------|
| Número / remetente | `WaInboxThread.phoneNumber`, mensagens | Atendimento |
| Mensagens inbound/outbound | `WaInboxMessage.contentText` (+ metadados) | Histórico de atendimento |
| Timestamps | `WaInboxMessage.ts`, `WaInboxThread.updatedAt` | SLA, ordenação |
| Status da conversa | `WaInboxThread.status` | Fluxo operacional |
| Tags | `WaInboxTag`, relações thread↔tag | Organização |
| Notas internas | `WaInboxInternalNote` | Contexto para operadores |
| Assignee | `WaInboxThread.assignedToUserId` | Responsabilidade |
| Eventos de handoff | `WaInboxAuditLog`, tag `needs_human` | Escalonamento humano |
| Logs de envio/erro | `AiMessageLog`, observabilidade | Diagnóstico técnico |

### Dados técnicos

| Dado | Onde fica | Finalidade operacional |
|------|-----------|------------------------|
| Webhook event / message ID Meta | IDs em mensagens e logs | Idempotência, suporte |
| Tenant ID | Logs, registos Prisma | Isolamento |
| Thread ID | Logs, audit | Correlação |
| Logs de decisão IA | `AiMessageLog.decisionReason`, `eventKind` | Auditoria de automação |
| Motivos de fallback/handoff | `decisionReason`, audit `handoff_requested` | Supervisão |
| Métricas agregadas | Dashboard manager, contagens | Operação (sem conteúdo integral) |

---

## 3. Dados que não devem ser armazenados em locais indevidos

| Proibido / evitar | Motivo |
|-------------------|--------|
| Access tokens Meta em `Lead`, `notes` CRM ou issues públicas | Segredo + local errado (`WhatsappPhoneNumber.accessToken` no app) |
| App Secret, JWT, verify token em logs ou docs | Segurança |
| Payload completo de webhook em logs de produção | Minimização; risco PII |
| Conteúdo integral de conversa em analytics público ou ferramentas externas não acordadas | Finalidade + base contratual |
| Prints com dados reais em documentação pública, Notion aberto ou Slack público | Exposição desnecessária |
| Mensagens reais de clientes finais em demo comercial aberta | Consentimento / expectativa |
| Documentos pessoais sensíveis (RG, CPF scan, etc.) no produto sem necessidade operacional | Minimização |
| Corpo de mensagem em `console.log` ad hoc | Política de logs (ver secção 6) |

**Referência técnica:** conversão lead→tenant grava apenas IDs Meta **públicos** em `notes`; tokens ficam no modelo WhatsApp Platform.

---

## 4. Base operacional para o piloto

Descrição **neutra e operacional** (não constitui parecer jurídico):

1. O **cliente piloto** deve estar **informado** de que a DevFlow (e, quando aplicável, subprocessadores como Meta Cloud API e hosting) **processará mensagens e metadados** para operar o serviço de atendimento via WhatsApp Platform.
2. O tratamento no piloto deve estar **vinculado à prestação / execução do serviço piloto** acordado comercialmente (contrato, proposta ou termo mínimo por escrito — revisão jurídica recomendada antes de escala).
3. O cliente deve **orientar a sua equipa** (operadores, gestores) sobre uso do produto e, quando aplicável, **informar os seus utilizadores finais** (consumidores que contactam via WhatsApp) conforme orientação do cliente — a DevFlow fornece a plataforma; o cliente é responsável pela relação com os titulares dos dados que lhe escrevem, salvo acordo em contrário.
4. **Conversas reais** do piloto **não** devem ser reutilizadas para marketing, demo pública ou treino de modelos **sem autorização explícita** e, preferencialmente, **anonimização**.
5. Dados de **leads DevFlow** (formulário `/contato`) são tratados no CRM interno para funil comercial — separados do tenant do cliente piloto, salvo conversão documentada (P0-06).

---

## 5. Acesso interno

Checklist operacional DevFlow:

- [ ] Apenas pessoas **autorizadas** acedem a inbox, admin de tenant e CRM de leads.
- [ ] Acesso por **utilizador individual** (conta própria) — evitar conta partilhada.
- [ ] **Remover acesso** de quem sair do piloto ou da DevFlow (offboarding).
- [ ] Operadores do cliente piloto recebem credenciais **no tenant correcto** — sem cruzamento entre clientes.
- [ ] Role mínima necessária: `operator` / `manager`; `platform_admin` só para ops DevFlow.
- [ ] **Não exportar** conversas (CSV, screenshots em massa) sem necessidade operacional documentada.
- [ ] **Não partilhar** prints de inbox/CRM em canais abertos (Slack público, redes sociais).
- [ ] CRM `/admin/leads` — acesso restrito (segredo admin / `platform_admin`).

---

## 6. Logs e observabilidade

Regras alinhadas a P0-01, P0-07 e P0-09 — ver [OBSERVABILITY-PILOT.md](./OBSERVABILITY-PILOT.md):

| Regra | Detalhe |
|-------|---------|
| Preferir **IDs e status** | `tenant_id`, `thread_id`, `meta_message_id`, `trace_id`, `event` / `eventKind` — **não** conteúdo integral de mensagem |
| Evitar **conteúdo integral** de mensagem em produção | Especialmente webhook verbose |
| **Nunca** logar tokens, secrets, corpo assinado de webhook | Ver `.env.example`, regras de segurança |
| Mascarar telefone **quando possível** | Ex.: últimos 4 dígitos em debug; evitar E.164 completo em logs agregados |
| Erros úteis **sem PII** | Mensagem de erro genérica ao utilizador; detalhe técnico sem corpo de chat |
| Revisar logs **antes** de anexar a tickets, demos ou post-mortems | Redigir ou anonimizar |
| `WHATSAPP_WEBHOOK_VERBOSE` | Desligado ou restrito em produção |
| `AiMessageLog` | `decisionReason` com intent/conf — **não** prompt/resposta integral por defeito em novos fluxos |

---

## 7. IA e decisões automatizadas

Documentação técnica: [AI_AUTOMATION.md](./AI_AUTOMATION.md) (P0-07).

| Prática piloto | Estado |
|----------------|--------|
| **Safe mode** activo por defeito (`WHATSAPP_AI_SAFE_MODE`) | Implementado |
| IA responde só em **escopo seguro** (confiança ≥ limiar, intent permitido) | Implementado |
| Temas sensíveis / comerciais críticos → **handoff humano** | Implementado |
| Decisão auditável (`decisionReason`, `handoff_requested`) | Implementado |
| **Sem IA autónoma** sem supervisão humana no piloto | Política operacional |
| **Não treinar** modelo externo (OpenAI fine-tune, etc.) com dados do cliente **sem base/contrato específico** | Proibido no piloto |
| Titular não deve ser induzido a crer que fala sempre com humano se IA responder — **transparência** recomendada na configuração do agente (texto de apresentação) | Configurar em `/settings/ai` |

---

## 8. Retenção e exclusão

Orientação **inicial** (política técnica automática = dívida P1/P2):

1. **Definir período de retenção do piloto** por escrito com o cliente (ex.: 90 dias após encerramento do piloto, ou conversão para contrato comercial).
2. **Ao final do piloto**, decidir com o cliente:
   - manter dados para contrato seguinte;
   - **exportar** dados acordados (export formal = P1);
   - **eliminar** ou anonimizar tenant/dados de conversa conforme acordo.
3. **Solicitações de titulares** (ex.: consumidor final que escreveu no WhatsApp do cliente): canal definido — em geral **encaminhar ao cliente piloto** como controlador face ao consumidor; DevFlow actua como operadora conforme contrato (revisão jurídica).
4. **Não apagar** logs de auditoria necessários a incidentes ou disputas **sem critério** — preservar evidência, depois aplicar política de retenção.
5. Backup de BD: incluir dados de conversa — eliminação completa pode exigir processo técnico + janela de backup (documentar limitação).

**Registo sugerido no ticket do piloto:** data início, data fim prevista, decisão de retenção pós-piloto: _______________

---

## 9. Demo e evidências comerciais

| Regra | Detalhe |
|-------|---------|
| Usar **tenant demo** com dados **fictícios** em staging | [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) — app real; vitrine `NEXT_PUBLIC_DEMO_MODE` só para portfólio |
| **Não** mostrar conversas reais do piloto em call comercial sem autorização escrita | Cliente + titulares |
| **Anonimizar** prints: ocultar nomes, números, empresas | Blur ou dados sintéticos |
| Evitar métricas **identificáveis** de cliente real em apresentações | Agregar ou usar demo |
| Separar **`/demo` mock do portal**, **tenant demo** e **tenant piloto** | [REAL-APP-DEMO.md](./REAL-APP-DEMO.md) §2 |
| Smoke test e evidências internas: armazenar em repositório **privado** | Sem PII em git público |

---

## 10. Checklist antes de activar cliente piloto

Preencher e assinar **antes** de ligar número real / receber tráfego de consumidores finais.  
Complementa [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §11 e [LEAD-TO-TENANT-PILOT.md](./LEAD-TO-TENANT-PILOT.md).

- [ ] Cliente informado sobre processamento de mensagens (secção 4)
- [ ] Responsável interno DevFlow definido: _______________
- [ ] Responsável no cliente piloto definido: _______________
- [ ] Utilizadores autorizados listados (DevFlow + cliente)
- [ ] Tenant **isolado** (ID documentado)
- [ ] Número WhatsApp **correcto** (Phone Number ID conferido)
- [ ] Tokens/secrets **fora** de logs, notes CRM e documentação
- [ ] Webhook signature **activo** em produção (P0-01)
- [ ] Safe mode IA **activo** (P0-07)
- [ ] Handoff humano **activo** e testado (P0-04)
- [ ] Logs sem conteúdo sensível integral (secção 6)
- [ ] Política de prints/demo combinada (secção 9)
- [ ] Retenção pós-piloto **combinada** (secção 8)
- [ ] Canal para solicitação exclusão/exportação: _______________

**Assinatura DevFlow:** _______________ **Data:** _______________  
**Assinatura cliente (opcional piloto):** _______________ **Data:** _______________

---

## 11. Checklist de incidentes (privacidade / vazamento)

Se houver suspeita de exposição de dados pessoais ou acesso indevido:

1. **Identificar escopo** — quais tenants, threads, utilizadores, logs ou exports afectados.
2. **Pausar automação** se necessário — IA, webhooks, integrações (ver [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) §13).
3. **Restringir acesso** — revogar utilizadores, rotacionar credenciais admin.
4. **Preservar logs** — exportar evidência antes de alterações destrutivas.
5. **Rotacionar tokens** Meta / JWT / API keys se houver vazamento confirmado ou provável.
6. **Comunicar responsável interno DevFlow** imediatamente.
7. **Registar ocorrência** — ticket interno com timeline (sem colar PII integral).
8. **Avaliar comunicação ao cliente piloto** — e, se aplicável, orientação ao cliente sobre titulares (decisão jurídica).
9. **Corrigir causa raiz** — patch, config, processo; actualizar este checklist se necessário.

Referência técnica: [INCIDENT_RESPONSE.md](../../apps/whatsapp-platform/docs/ops/INCIDENT_RESPONSE.md).

---

## 12. Dívidas P1/P2 recomendadas

Itens **fora do P0-08** — implementação ou revisão futura:

| ID | Item | Prioridade |
|----|------|------------|
| P1 | Política formal de **retenção** por tenant (TTL, job cron) | Alta |
| P1 | **Exportação** de dados por tenant (portabilidade) | Alta |
| P1 | **Exclusão / anonimização** por tenant (direito ao apagamento operacionalizado) | Alta |
| P1 | **DPA** / termos de tratamento para clientes B2B | Alta |
| P1 | Política de privacidade **actualizada** (site + produto) | Alta |
| P1 | **Revisão jurídica** antes de escala comercial | Alta |
| P2 | RBAC mais granular (permisos por fila/recurso) | Média |
| P2 | Mascaramento sistemático de telefone em **todos** os logs | Média |
| P2 | Painel de **auditoria** de acessos admin | Média |
| P2 | Consentimento / aviso por **template** WhatsApp, se aplicável ao caso de uso | Média |
| P2 | Registo de operações de tratamento (ROPA) formal | Média |
| P2 | DPIA para fluxos de IA automatizada em escala | Média |

---

## 13. Definition of Done do P0-08

O item **P0-08** está **concluído (documentado)** quando:

- [x] Checklist `LGPD-PILOT-CHECKLIST.md` criado com secções 1–12
- [x] [README.md](./README.md) aponta para este documento
- [x] [PILOT-RUNBOOK.md](./PILOT-RUNBOOK.md) referencia o checklist **antes** de activar piloto
- [x] Backlog P0-08 marcado como concluído (documentação operacional)
- [x] Auditoria actualizada — risco LGPD de «gap total» para «checklist mínimo; revisão jurídica pendente»
- [x] Nenhum segredo ou dado real incluído neste documento

**Pendente para go-live de cada piloto:** assinatura do checklist §10 por responsável DevFlow (e cliente, se acordado).

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-10 | Versão inicial — P0-08 |
