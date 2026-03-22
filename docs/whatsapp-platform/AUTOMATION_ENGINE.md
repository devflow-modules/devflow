# Automation Engine + Playbooks

## Visão

Sistema de automação inteligente que permite ao produto tomar decisões automaticamente:

- Executar ações com base em eventos
- Aplicar regras configuráveis por tenant
- Orquestrar fluxos (playbooks)
- Usar IA como parte da decisão

## Arquitetura

```
src/modules/automation/
├── automation.types.ts   # Tipos e interfaces
├── rule.engine.ts        # Avaliação de regras e condições
├── playbook.engine.ts    # Execução de playbooks
├── trigger.dispatcher.ts # Recebe eventos e dispara rule engine
├── action.executor.ts    # Executa ações (assign, tag, send, IA, etc.)
├── aiDecision.service.ts # IA: classificar intent, detectar urgência
├── automation.engine.ts  # Helpers para disparar por tipo de evento
└── index.ts
```

## Fluxo

1. **Evento ocorre** (mensagem inbound, outbound, status mudou, tag adicionada, etc.)
2. **Persistência** — o sistema persiste no banco primeiro
3. **Dispatcher** — após persistir, chama `dispatchEvent(event)`
4. **Rule Engine** — carrega regras ativas do tenant com o mesmo `triggerType`
5. **Condições** — avalia cada regra; só passa quem cumpre todas as condições
6. **Actions** — executa as ações em ordem; respeita loop protection

## Modelos Prisma

### WaAutomationRule

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | CUID |
| tenantId | string | Tenant dono da regra |
| name | string | Nome da regra |
| isActive | boolean | Se está ativa |
| triggerType | string | Tipo do gatilho |
| conditions | JSON | Array de condições |
| actions | JSON | Array de ações |

### WaAutomationPlaybook

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | CUID |
| tenantId | string | Tenant dono |
| name | string | Nome |
| isActive | boolean | Se está ativo |
| steps | JSON | Array de passos |

## Triggers

| Tipo | Quando dispara |
|------|----------------|
| MESSAGE_INBOUND | Mensagem recebida |
| MESSAGE_OUTBOUND | Mensagem enviada |
| CONVERSATION_CREATED | Nova conversa criada |
| STATUS_CHANGED | Status da conversa alterado |
| TAG_ADDED | Tag adicionada à conversa |
| TAG_REMOVED | Tag removida |
| TIME_ELAPSED | Tempo decorrido (para futuras extensões) |

## Condições

| Operador | Exemplo | Descrição |
|----------|---------|-----------|
| contains | messageText contains "cancelar" | Texto contém substring |
| equals | status equals "OPEN" | Igualdade |
| notEquals | assignedToUserId notEquals "x" | Diferente |
| exists | tags exists "churn" | Campo existe / tag existe |
| isNull | assignedToUserId isNull | Campo é nulo |
| timeSinceLastMessage_gt | tempo > 300 (segundos) | Última msg há mais de X segundos |

## Actions

| Action | Params | Descrição |
|--------|--------|-----------|
| assignConversation | userId ou "auto" | Atribui conversa a usuário ou primeiro disponível |
| updateStatus | status: OPEN \| PENDING \| CLOSED | Atualiza status |
| addTag | tagId ou tagName | Adiciona tag |
| removeTag | tagId ou tagName | Remove tag |
| setPriority | priority: LOW \| MEDIUM \| HIGH | Define prioridade |
| sendMessage | text | Envia mensagem no WhatsApp |
| triggerAIResponse | — | Dispara resposta da IA |
| logAction | message | Registra no audit log |

## Exemplos de regras

### Ex 1: Priorizar cancelamento

- **Trigger:** MESSAGE_INBOUND  
- **Condição:** messageText contains "cancelar"  
- **Ações:**
  - setPriority HIGH
  - addTag "churn"
  - assignConversation auto

### Ex 2: Boas-vindas automáticas

- **Trigger:** CONVERSATION_CREATED  
- **Condição:** (nenhuma, sempre true)  
- **Ações:**
  - sendMessage "Olá! Como posso ajudar?"

### Ex 3: Não atribuído → atribuir

- **Trigger:** MESSAGE_INBOUND  
- **Condição:** assignedToUserId isNull  
- **Ações:**
  - assignConversation auto

## Loop protection

Para evitar loops infinitos:

1. **Max depth:** Execução limitada a `MAX_DEPTH` (5) ações encadeadas
2. **ruleIdsExecuted:** Regra não dispara ela mesma novamente na mesma execução
3. **Ordem:** Dispatcher executa regras em ordem; ao atingir limite, para

## Multi-tenant

- Regras e playbooks são **isolados por tenant**
- API e engine sempre filtram por `tenantId` do auth/contexto
- Actions usam `context.tenantId` para todas as operações

## Integração com o sistema atual

O dispatcher é chamado em:

- **waInboxMessageService** — inbound (MESSAGE_INBOUND + CONVERSATION_CREATED quando nova) e outbound (MESSAGE_OUTBOUND)
- **threadStatusService** — STATUS_CHANGED
- **tagService** — TAG_ADDED e TAG_REMOVED

Sempre **após** a persistência no banco.

## UI

- **Rota:** `/automation`
- **Funcionalidades:** Listar regras, criar regra, ativar/desativar, testar regra manualmente
- **Teste:** Modal com seleção de conversa e texto simulado; retorna se condições batem e se a regra seria executada

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/automation/rules` | Lista regras do tenant |
| POST | `/api/automation/rules` | Cria regra |
| PATCH | `/api/automation/rules/[id]` | Atualiza (name, isActive) |
| DELETE | `/api/automation/rules/[id]` | Remove regra |
| POST | `/api/automation/rules/[id]/test` | Testa regra com threadId e messageText |

## Boas práticas

1. **Não executar antes da persistência** — disparar automação sempre depois de salvar no banco
2. **Evitar regras que gerem loop** — ex.: regra que envia msg em MESSAGE_INBOUND e outra que responde MESSAGE_OUTBOUND pode criar ciclo; use condições restritivas
3. **Ordem das regras** — regras são avaliadas por `createdAt` ascendente; regras mais antigas rodam primeiro
4. **Testar antes de ativar** — use o botão "Testar" na UI para validar condições
5. **Tenant isolation** — nunca passar tenantId de um tenant em contexto de outro

## Checklist sprint

- [x] Models Prisma + migration
- [x] Rule engine
- [x] Playbook engine
- [x] Trigger dispatcher
- [x] Action executor
- [x] AI Decision service
- [x] Loop protection
- [x] Integração nos eventos
- [x] UI básica
- [ ] Testes unitários
- [x] Documentação
