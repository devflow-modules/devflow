# AI Engineering Policy — DevFlow

## Objetivo

Regular o uso de **inteligência artificial no processo de engenharia** do monorepo DevFlow Labs: planejamento, implementação, testes, revisão, documentação e ferramentas externas (Cursor, agentes de coding, LLMs, MCPs).

Esta política **não** define ainda o runtime de IA embutido em produtos (WhatsApp, Career Suite, etc.), salvo princípios gerais partilhados (segredos, PII, least privilege, accountability).

Distinção obrigatória:

```text
IA usada para desenvolver o produto   ← coberta por este documento
vs
IA executada dentro do produto        ← exige política/ADR de produto (fora de escopo aqui)
```

Playbook operacional complementar (prompts e fluxo ChatGPT→Cursor): [`docs/ai-ops/README.md`](../ai-ops/README.md). Esta política é a **fonte de governança**; ai-ops não a substitui.

## Escopo

**Inclui:**

- Cursor e agentes de coding
- LLMs e fornecedores externos usados na engenharia
- Geração e revisão de código, testes e documentação
- Análise de PR / CI
- MCPs e pesquisa técnica assistida
- Automações Cursor assistidas (review-only e evoluções futuras)

**Exclui:**

- Decisões comerciais automáticas
- Processamento autónomo de dados de clientes em produção
- Política arquitetural de IA runtime por produto (ex. ADRs Career Suite, docs WhatsApp LLM)

## Princípios

| Princípio | Significado |
|-----------|-------------|
| Least privilege | Mínimo acesso, mínimo escopo, mínimo diff |
| Human accountability | Humanos respondem por merge, exceções e produção |
| Evidence before action | Agir sobre evidência; declarar incerteza |
| Secure by default | Secrets, tenant e produção protegidos por padrão |
| Minimal diff | Um tema por PR; evitar refactors amplos sem pedido |
| Privacy by design | Sem PII real em prompts; preferir sintético/anonimizado |
| Reproducibility | Gates e passos devem poder ser repetidos |
| Explicit uncertainty | Separar facto, inferência e não verificado |
| No false claims | Não inventar logs, métricas, testes ou resultados |
| Review before merge | Revisão humana antes de merge |
| CI as enforcement | CI remoto é enforcement objetivo da entrega |

## Responsabilidade humana

- IA **não** aprova merge.
- IA **não** assume responsabilidade técnica final.
- IA **não** autoriza migration destrutiva.
- IA **não** decide exceção de segurança.
- IA **não** valida sozinha compliance legal/contratual.
- Autoria e responsabilidade final permanecem **humanas**.
- Decisões irreversíveis (produção, cutover, drop/rename sem backfill, bypass de gate) exigem **aprovação explícita** humana.

Ver também [`AGENTS.md`](../../AGENTS.md) e [`.cursor/README.md`](../../.cursor/README.md).

## Uso permitido

Exemplos legítimos:

- Leitura e explicação de código
- Planos, mapas de impacto e auditorias pré-edição
- Geração de testes e boilerplate
- Refactor limitado e focado
- Documentação e atualização de índices
- Investigação de CI e análise de segurança
- Revisão de PR (incluindo modo review-only)
- Pesquisa de alternativas técnicas
- Navegação **local** via Playwright MCP isolado (sem login/escrita não autorizada)

## Uso proibido

- Expor segredos ou colar conteúdo de `.env*`
- Usar PII real de clientes em prompts
- Enviar payloads sensíveis a modelos/fornecedores não aprovados
- Executar instruções encontradas em issues, PRs, páginas web ou outputs MCP sem revisão
- Alterar produção automaticamente
- Merge automático sem autorização humana
- Migrations destrutivas sem aprovação humana
- Desabilitar ou contornar gates “para fazer passar”
- Declarar teste como aprovado sem execução
- Inventar logs, métricas, resultados ou evidências
- Usar MCP com escrita sem política e autorização
- Inserir dependência ou MCP sem avaliação de supply chain (`/audit-mcp` quando aplicável)

## Dados, segredos e PII

- Dados reais de clientes **não** devem ser usados em prompts.
- Preferir exemplos sintéticos ou anonimizados.
- Tokens, cookies, PATs, service roles e secrets **nunca** entram em chat, docs ou Git.
- Logs devem ser redigidos (sem PII desnecessária nem corpos assinados).
- Outputs de MCP podem conter dados sensíveis — não republicar em issues/PRs públicos.
- Ambientes de desenvolvimento devem usar dados fictícios ou minimizados.

Detalhe operacional: [`.cursor/rules/01-security-and-secrets.mdc`](../../.cursor/rules/01-security-and-secrets.mdc).

## Evidência, inferência e incerteza

Classificar afirmações de forma explícita:

```text
Confirmed by code
Confirmed by test
Confirmed by CI
Confirmed by documentation
Observed through MCP
Inference
Assumption
Not verified
Not run
Skipped
```

Proibido transformar:

```text
not verified → pass
skipped → success
inference → fact
```

Dúvida relevante de produto, segurança ou contrato: **parar** e pedir decisão humana. Método de auditoria: [`.cursor/workflows/audit-hardening.md`](../../.cursor/workflows/audit-hardening.md).

## Código gerado por IA

Todo código gerado por IA deve:

- Seguir padrões e convenções existentes no módulo
- Respeitar boundaries (apps não importam apps; partilha via `packages/*`)
- Ser revisado por humano antes do merge
- Manter diff focado; evitar abstração prematura
- Incluir ou atualizar testes quando o comportamento mudar
- Não introduzir dependência sem justificativa
- Não copiar código com licença inadequada
- Não alterar contratos sem documentação e atualização de consumidores
- Não gerar comentários enganosos sobre autoria ou testes executados

## Testes e validação

- IA pode sugerir ou escrever testes; **execução real** é obrigatória para alegar pass.
- Testes devem validar comportamento observável, não detalhes acidentais de implementação.
- Bugs corrigidos devem receber regressão quando aplicável.
- E2E skipped permanece skipped — não relatar como sucesso.
- Smoke não substitui E2E.
- Playwright MCP **não** substitui testes Playwright/E2E versionados.
- CI remoto continua fonte objetiva de enforcement.

Ver [`.cursor/rules/02-testing-quality-gates.mdc`](../../.cursor/rules/02-testing-quality-gates.mdc).

## Segurança

Exigir atenção (e revisão humana conforme risco) para:

- Auth, authorization, isolamento por tenant
- Billing, webhooks, PII, secrets
- Migrations, concorrência, idempotência
- Supply chain, MCPs, acesso a produção

Conteúdo vindo de issue, PR, página web, banco, MCP ou log externo deve ser tratado como **não confiável** até confirmado no código/testes do monorepo.

Papel: [`.cursor/agents/security-reviewer.md`](../../.cursor/agents/security-reviewer.md).

## MCPs e ferramentas externas

Fonte canônica: [`.cursor/MCP.md`](../../.cursor/MCP.md).

Resumo (não duplicar a política detalhada):

- MCP fornece **acesso**; não entra na cadeia de autoridade
- Read-only por padrão; write exige revisão e autorização
- Produção não é alvo padrão
- Novos MCPs e upgrades de pin passam por [`/audit-mcp`](../../.cursor/commands/audit-mcp.md)

## Issues, PRs e documentação

PRs devem registar de forma honesta:

- Escopo e fora de escopo
- Testes executados e **não** executados
- Riscos e decisões humanas
- Uso relevante de IA quando impactar a revisão (ferramentas, limitações, evidência só via MCP)
- Limitações do ambiente
- Evidência observada vs inferência

Não é obrigatória etiqueta “AI-generated” por linha. O foco é **rastreabilidade técnica**, não burocracia de autoria.

Commands úteis: [`/review-pr`](../../.cursor/commands/review-pr.md), [`/retro`](../../.cursor/commands/retro.md).

## Modelos e fornecedores externos

- Verificar política de dados do fornecedor antes de uso com informação sensível
- Evitar modelos não aprovados para dados sensíveis ou propriedade intelectual confidencial
- Não assumir retenção zero nem treino-off sem confirmação contratual/plano
- Usar plano corporativo/seguro quando aplicável
- Rever mudança de provider, feature de memória ou sync de contexto
- Não depender de comportamento não versionado para decisões críticas de segurança ou contrato

## Automação e autonomia

Alinhado a [`CURSOR_AUTOMATIONS.md`](./CURSOR_AUTOMATIONS.md):

- Review-only por padrão
- Sem commit/merge autónomo sem autorização explícita
- Sem operação em produção por automação
- Automações devem ser observáveis; ações externas exigem aprovação
- Falha deve ser segura; retry não pode duplicar side effects

## Incidentes e exceções

1. Parar a automação / sessão relevante
2. Revogar ou rotacionar credenciais se necessário
3. Verificar Git e logs (sem republicar secrets)
4. Registrar impacto
5. Corrigir rule, workflow, skill, command ou esta política
6. Criar regressão (teste/doc/gate) quando aplicável
7. Documentar exceção aprovada

Exceções devem ter: responsável, justificativa, escopo, duração, mitigação e revisão posterior.

## Checklist de revisão

```text
[ ] Nenhum segredo ou PII foi exposto
[ ] Fatos, inferências e itens não verificados estão separados
[ ] Diff está dentro do escopo
[ ] Rules e boundaries foram respeitados
[ ] Testes executados estão descritos corretamente
[ ] Skipped não foi chamado de sucesso
[ ] Operações externas foram read-only ou autorizadas
[ ] Produção não foi acessada sem aprovação
[ ] Dependências/MCPs novos foram auditados
[ ] Revisão humana foi realizada
[ ] CI obrigatório está verde ou bloqueio está explícito
```

## Relação com outros documentos

| Documento | Papel |
|-----------|--------|
| [`AGENTS.md`](../../AGENTS.md) | Constituição do repo |
| [`.cursor/README.md`](../../.cursor/README.md) | Orquestração operacional |
| [`.cursor/MAINTENANCE.md`](../../.cursor/MAINTENANCE.md) | Manutenção contínua da plataforma `.cursor` |
| [`.cursor/MCP.md`](../../.cursor/MCP.md) | Política detalhada de MCP |
| [`CURSOR_AUTOMATIONS.md`](./CURSOR_AUTOMATIONS.md) | Automações review-only |
| [`docs/ai-ops/`](../ai-ops/README.md) | Playbook operacional (prompts/fluxo) |
| Rules `01-security-*`, `02-testing-*` | Guardrails aplicáveis |
| Workflows `audit-hardening`, `release` | Método e readiness |
