# Playbook — CRM de prospecção (WhatsApp Platform / DevFlow)

## Uso interno DevFlow (não exposto ao tenant cliente por padrão)

O CRM de **prospecção comercial DevFlow** (barra de métricas, filtro `prospectLens`, painel **Prospecção DevFlow** com formulário e templates, chips **FU hoje** / etapa na lista, `PATCH` e métricas dedicadas) existe para **DevFlow Labs** e equipa **platform_admin** fazerem prospecção própria. **Não é feature white-label para o cliente final**: utilizadores `manager` / `operator` continuam com o Inbox operacional normal (prioridade, SLA, `leadScore`, contexto de lead, estados de conversa).

- **Quem vê / usa**: apenas sessões com role `platform_admin` e com o kill-switch de build ativo (ver abaixo).
- **APIs**: `GET /api/inbox/prospect-metrics` e `PATCH /api/inbox/conversations/:id/prospect` respondem **403** para quem não está habilitado; `GET /api/inbox/conversations` ignora o parâmetro `prospectLens` para os mesmos utilizadores.
- **Kill-switch**: `NEXT_PUBLIC_DEVFLOW_PROSPECTING_ENABLED=false` (ou `0` / `no` / `off`) desliga a UI e o acesso mesmo para `platform_admin`. Sem variável definida, **platform_admin** mantém acesso (comportamento útil em desenvolvimento).

### Evoluir para feature comercial (futuro)

1. Modelar **capability por tenant/plano** (ex.: flag em billing ou `tenant_features`) em vez de só role global.
2. Expor `isDevFlowProspectingEnabled` (ou equivalente server-side) com **tenant + role** (ex.: permitir `manager` no tenant “DevFlow” ou em tenants pagantes).
3. Manter **403** nas rotas até a capability estar ligada; opcionalmente devolver `prospect` em `leadData` só quando a feature estiver ativa para reduzir ruído na API pública.
4. Documentar no contrato comercial e no onboarding o que o cliente passa a ver (métricas, templates, etc.).

---

Operação solo (~3–5 fechamentos/mês), **quando a prospecção interna estiver ativa**: usar o **Inbox** com `leadData.prospect` (etapas, follow-up, contexto). O `leadScore` automático da conversa continua independente e visível para toda a equipa de inbox.

## Modelo `leadData.prospect` (JSON)

- `companyName`, `niche`, `city` (strings opcionais)
- `source`: `instagram` \| `maps` \| `linkedin` \| `referral` \| `website`
- `salesStage`: ver tabela abaixo
- `nextFollowUpAt`, `nextStep` (strings ISO / texto)
- `pain`, `attendantsCount` (string), `estimatedVolume` (string)
- `proposalValue` (número, ex.: valor em reais)

Leitura tolera `salesStage` legado `NEW_PROSPECT` e normaliza para `NEW`.

## Etapas (códigos → labels)

| Código | Label |
|--------|--------|
| `NEW` | Novo lead |
| `CONTACTED` | Contato feito |
| `REPLIED` | Respondeu |
| `DIAGNOSIS_SCHEDULED` | Diagnóstico agendado |
| `DIAGNOSIS_DONE` | Diagnóstico feito |
| `PROPOSAL_SENT` | Proposta enviada |
| `WON` | Fechado |
| `LOST` | Perdido |
| `NURTURE` | Nutrição |

## Mensagem inicial (WhatsApp)

> Oi, [nome] — aqui é [teu nome] da DevFlow Labs. Vi que vocês [dor/contexto em uma linha]. Montamos operação de WhatsApp com IA + humano sem virar “robô genérico”. Posso te mandar 2 perguntas rápidas pra ver se faz sentido?

## Follow-up 1 (48–72 h)

> [nome], te mandei um resumo outro dia — às vezes some no fluxo. Faz sentido um diagnóstico de 15 min essa semana? Se não for prioridade, me diz que eu paro por aqui.

## Follow-up 2 (7–10 d)

> Última mensagem: se não for timing, sem stress. Se quiser retomar depois, é só responder “retomar” que eu reorganizo a conversa aqui.

## Qualificação rápida (4 perguntas)

1. Quantos atendimentos/dia no WhatsApp (ordem de grandeza)?
2. Hoje o gargalo é volume, velocidade ou qualidade de resposta?
3. Já usam outra ferramenta / disparo / chatbot?
4. Se fechássemos algo, o que precisaria estar pronto na primeira semana?

## Call script (15 min) — resumo

1. Contexto do negócio (2 min).
2. Dor atual + exemplo concreto de conversa perdida ou atrasada (4 min).
3. Stack atual (planilha, outro CRM, só WhatsApp Business) (3 min).
4. Critério de sucesso em 30 dias (3 min).
5. Próximo passo único: diagnóstico técnico, proposta ou “não é fit” (3 min).

## Lead bom vs ruim (regra prática)

**Bom:** volume recorrente, mais de um atendente ou fila clara, WhatsApp como canal principal, dor em SLA/perda de cliente, orçamento explícito ou urgência real.

**Ruim:** “só testar ferramenta”, autônomo sem volume, expectativa de preço irreal sem conversa de valor, ghosting após 2 follow-ups educados.

## Rotina diária (solo)

1. **Inbox** em “Precisa de resposta”: zerar inbound humano primeiro.
2. Abrir painel **Prospecção DevFlow**: conversas com chip **FU hoje** (vermelho) ou badge **Follow-up hoje** quando `nextFollowUpAt` está em atraso ou até ao fim do dia civil atual.
3. Atualizar etapa com **ações rápidas** após cada touchpoint real.
4. Gravar **próximo passo** (via PATCH com `nextStep` quando integrar formulário; até lá, nota interna ou campos JSON manuais se precisar).
5. Fim do dia: threads em `PROPOSAL_SENT` sem resposta → follow-up ou `NURTURE`.

## API mínima

`PATCH /api/inbox/conversations/:id/prospect` — corpo JSON com campos opcionais de `prospect` (validado no servidor; `tenantId` + sessão). Ver código em `apps/whatsapp-platform/src/app/api/inbox/conversations/[id]/prospect/route.ts`.

## Pendências (próxima sprint)

- Filtros server-side na lista (ex.: follow-up hoje, proposta aberta) — hoje há só chip **FU hoje** na linha + badges no painel.
- Formulário leve para empresa/nicho/origem/dor sem JSON manual.
- Sincronizar `nextStep` com notas internas (opcional).
