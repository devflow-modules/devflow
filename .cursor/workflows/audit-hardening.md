# Workflow — Audit & hardening

## Quando usar

Endurecer um domínio já existente (lifecycle, ownership, status, authz, filas) com **evidência no código** antes de editar — método formalizado após ciclos de governança e hardening de inbox/plataforma.

## Não usar quando

- Feature greenfield sem superfície existente → [`feature`](./feature.md) (+ validação de produto)
- Bug óbvio com repro clara e causa local → [`bugfix`](./bugfix.md)
- Pedido explícito de só documentação cosmética

## Papéis envolvidos

Platform Architect + Product Owner (decisões) → Backend/Frontend (implementação autorizada) → Security → QA → Documentation → Release

Commands: [`map-impact`](../commands/map-impact.md), [`audit-domain`](../commands/audit-domain.md), [`review-pr`](../commands/review-pr.md), [`fix-ci`](../commands/fix-ci.md)

## Pré-condições

- Domínio/owner identificável
- Acesso às docs canônicas do domínio
- **Nenhuma edição** até o inventário/classificação e decisão humana nos gaps de produto

## Etapas

```text
1. Produzir mapa de impacto ANTES da edição
2. Localizar a feature real (UI → route → service → persistence)
3. Auditar: UI, API, service, persistence, audit, realtime, tests, docs
4. Classificar cada achado:
   - acceptable current behavior
   - confirmed gap
   - documentation gap
   - test coverage gap
   - product decision required
   - out of scope
5. Não implementar sem decisão (humana) nos itens "product decision required"
6. Autorizar apenas gaps confirmados (+ docs/test gaps alinhados)
7. Aplicar mudança mínima (sem redesign)
8. Executar gates do owner
9. Revisar concorrência, idempotência e caminhos alternativos
10. Abrir/atualizar draft PR com mapa, política, testes e riscos
```

### Checks específicos (obrigatórios na revisão)

| Check | Pergunta |
|-------|----------|
| Rotas paralelas | Existe outro path (`admin/*`, `queue/next`, automation) que contorna a política? |
| Side effects em no-op | Audit/realtime/métricas/AgentStatus disparam quando `changed: false`? |
| CAS / concorrência | First-writer-wins? Perdedor recebe conflito explícito? |
| Observabilidade | Falhas de claim/status são logadas sem PII/secrets? |
| Contratos HTTP | 401/403/404/409 corretos e estáveis? |
| UI errors | Erros acessíveis; DTO real vs campo inferido? |
| CI governance | `route.ts`/`page.tsx` → artefato de routing policy atualizado? |
| DTO | UI usa o contrato tipado existente (não inventar campos)? |

## Gates

- Testes focados do domínio + suites do app conforme skill/rule do owner
- Routing governance se rotas tocadas
- Typecheck/lint/design-system conforme workflow CI do app
- E2E: executar se ambiente permitir; **skipped ≠ sucesso**

## Critério de saída

- Gaps confirmados corrigidos ou explicitamente deferidos
- Decisões de produto registadas (PR/docs)
- Caminhos alternativos não quebram first-writer-wins / política
- Draft PR revisável com inventário e matriz de auth/contrato

## Fora de escopo

Round-robin “de graça”, schema inventado, redesign amplo, alterações em apps legado sem pedido, desligar gates.

## Template de entrega

```text
Impact map:
Audit findings (classified):
Product decisions:
Authorized gaps:
Out of scope / deferred:
Implementation summary:
Alternative paths reviewed:
Tests (pass/fail/skip):
Docs:
PR (draft):
```
