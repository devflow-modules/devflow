# Cursor Platform Maintenance — DevFlow

## Objetivo

Definir como a plataforma operacional versionada em `.cursor/` (e `AGENTS.md`) evolui com o monorepo: por uso real, incidentes, mudanças arquiteturais e retrospectivas — **não** por expansão automática de camadas.

## Escopo mantido

- `AGENTS.md`
- `.cursor/README.md`
- Rules, skills, agents, workflows, commands
- Política e config MCP (`MCP.md`, `mcp.json`, examples, inventários)
- Docs de automação ligadas (`docs/operations/CURSOR_AUTOMATIONS.md`)
- Política de engenharia assistida por IA (`docs/operations/AI_ENGINEERING_POLICY.md`)
- Links para documentação canônica de domínio

## Princípios de manutenção

- Não adicionar camada sem problema real observado
- Evitar duplicação; preferir atualizar a fonte canônica
- Rules devem representar comportamento real do código
- Commands devem existir porque são usados
- Workflows devem refletir a prática observada
- Agents não devem duplicar outro papel
- Skills ensinam técnica específica (não processos genéricos)
- MCP deve justificar acesso externo (ver [`MCP.md`](./MCP.md))
- Arquivos obsoletos devem ser removidos (Git preserva histórico)
- Mudanças de governança também passam por PR e revisão humana

## Gatilhos de revisão

Rever a plataforma `.cursor` quando ocorrer:

- Novo app ou package estrutural
- Nova fonte de persistência
- Mudança de auth, tenancy, provider ou routing/deploy
- Novo MCP ou upgrade de pin MCP
- Incidente de segurança
- Nova pipeline / gate de CI
- Três prompts manuais semelhantes (candidato a command/skill)
- Regra repetidamente ignorada ou CI a detetar o mesmo gap
- Workflow que não corresponde à prática
- Documento canônico movido ou renomeado
- Nova feature do Cursor com impacto no repo

## Cadência

| Tipo | Quando |
|------|--------|
| Revisão leve | A cada release relevante |
| Revisão completa | Trimestral ou após mudança arquitetural |
| Imediata | Após incidente |
| MCP | Em cada upgrade de pin / tools |
| Links | Após reorganização de `docs/` |

Esta PR **não** cria agenda automática no produto Cursor.

## Responsáveis lógicos

| Papel | Foco na manutenção |
|-------|-------------------|
| Platform Architect | Boundaries, owners, conflitos de camada |
| Security Reviewer | Secrets, MCPs, prompt injection |
| QA Engineer | Gates e honestidade de testes |
| Documentation Engineer | Links e fontes canônicas |
| Release Manager | Readiness e depreciação |
| Product Owner | Workflows de produto e valor |

Papéis: [`.cursor/agents/`](./agents/).

## Checklist por camada

### AGENTS.md

- Continua curto e constitucional?
- Aponta para fontes corretas?
- Contém regra operacional que deveria estar em rule?

### Rules

- Glob / `alwaysApply` ainda justificados?
- Regra corresponde ao código e é verificável?
- Conflitos ou duplicação entre rules?

### Skills

- Técnica ainda usada? Passos refletem ferramentas atuais?
- Duplica workflow? Tem pré-condições e saída definida?

### Agents

- Responsabilidade distinta? Decisões e handoffs claros?
- Papel sem uso real?

### Workflows

- Corresponde ao processo praticado?
- Critério de saída e gates canônicos?
- Etapas sem valor ou caminhos de falha em falta?

### Commands

- Usado recentemente? Saída objetiva?
- Aponta para workflow correto?
- Nome sugere slash command de produto indevidamente?
- Promover a workflow ou remover?

### MCPs

- Servidor oficial e versão suportada?
- Pin necessário? Permissões mínimas?
- Tools expostas mudaram? Alternativa nativa?
- Produção bloqueada? Segredos fora do Git?

### Docs e links

- Links resolvem? Owners corretos?
- Históricos marcados? Fonte canônica clara?

## Processo de mudança

```text
observar gap
→ classificar camada correta
→ localizar fonte canônica
→ evitar duplicação
→ propor diff mínimo
→ validar links/config
→ revisão humana
→ merge
→ observar uso
```

Mudanças relevantes devem usar, conforme o caso:

- [`/audit-domain`](./commands/audit-domain.md)
- [`/review-pr`](./commands/review-pr.md)
- [`/retro`](./commands/retro.md)
- [`/audit-mcp`](./commands/audit-mcp.md) quando MCP estiver envolvido

## Sinais de desatualização

- Agent contradiz rule
- Command aponta para ficheiro inexistente
- Workflow cita gate removido
- Rule protege arquitetura que não existe
- MCP não inicia ou toolset mudou
- Prompts manuais contornam a plataforma
- PRs repetem instruções não versionadas
- CI encontra gaps recorrentes
- Documentos ignorados por excesso de tamanho
- Inventário diverge do filesystem

## Depreciação e remoção

- Marcar como deprecated antes de remover quando houver dependência
- Registrar substituto e atualizar links
- Remover conteúdo sem uso; não manter só por histórico
- Documentos históricos relevantes podem ir para secção/`docs/_archive/` apropriada
- Git já preserva o histórico

## MCP lifecycle

```text
proposta
→ /audit-mcp
→ aprovação read-only
→ pin
→ validação local
→ revisão de tools
→ uso observado
→ upgrade auditado
→ depreciação
```

Upgrade exige: changelog, tools expostas, mudanças de auth/permissões, supply chain, smoke local e workspace limpo (sem artefatos sensíveis no Git). Detalhe: [`MCP.md`](./MCP.md).

## Métricas mínimas

Não criar scorecard formal aqui. Retrospectivas ([`/retro`](./commands/retro.md)) podem registar:

```text
PR:
Workflow usado:
Commands usados:
Gaps encontrados antes da edição:
Gaps encontrados pelo CI:
Retrabalho após review:
Testes incorretamente declarados:
Docs duplicadas:
Incidente evitado:
Ação permanente:
```

## Template de revisão

```text
Review date:
Trigger:
Scope:
Files reviewed:
Rules stale:
Skills stale:
Agents stale:
Workflows stale:
Commands stale:
MCP status:
Broken links:
Canonical docs changed:
Removals proposed:
Updates proposed:
Security findings:
Decision:
Owner:
Follow-up:
```
