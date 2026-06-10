# DevFlow Product Inventory

Inventário vivo de iniciativas DevFlow Labs. **Atualizar** ao lançar, arquivar ou repriorizar produtos.

Governança: [PRODUCT-GOVERNANCE.md](./PRODUCT-GOVERNANCE.md)

---

## Inventário

| Nome | Tipo | Status | Prioridade | Rota pública | Área funcional | Docs | Papel atual | Próxima decisão |
|------|------|--------|------------|--------------|----------------|------|-------------|-----------------|
| **WhatsApp Platform** | product | active | P0 | `/produtos/whatsapp-platform`, `/demo` | `apps/whatsapp-platform` | [docs/whatsapp/](../whatsapp/), [docs/whatsapp-platform/](../whatsapp-platform/) | Produto principal de go-to-market — inbox, IA, handoff, SLA, dashboard | Auditar MVP operacional para piloto real |
| **Financeiro** | product | public-beta | P1 | `/ferramentas/financeiro` | `apps/financeiro`, `src/modules/financeiro` | [docs/financeiro/](../financeiro/) | Produto secundário ativo — controle financeiro PF/PJ | Revisar onboarding, monetização e escopo self-service |
| **ApplyFlow** | case-study | case-study | P2 | — (portfólio / `apps/applyflow` dev) | `apps/applyflow`, `apps/applyflow-extension` | [docs/applyflow/](../applyflow/) | Case de produto local-first / candidaturas | Manter como autoridade técnica, não como GTM principal |
| **Career Suite** | case-study | case-study | P2 | — | `apps/applyflow`, Interview Lab, `@devflow/career-core` | [docs/career-suite/](../career-suite/) | Extensão narrativa do ApplyFlow (CareerBundle) | Manter como case/portfólio |
| **Investiga+** | case-study | case-study | P2 | — | app separado (referência) | [docs/investigamais/](../investigamais/) | Prova full-stack SaaS | Decidir se fica produto separado ou apenas case |
| **FunkLab** | experiment | experimental | P3 | externo / laboratório | projeto experimental | — | Laboratório criativo / música | Não destacar no GTM atual |
| **Consulta CNPJ** | tool | active | P2 | `/ferramentas/consulta-cnpj` | portal (`src/app/ferramentas/…`) | — | Aquisição / SEO / utilidade gratuita | Manter como ferramenta grátis |
| **Divisão de Contas** | tool | active | P2 | `/ferramentas/divisao-de-contas` | portal (`src/app/ferramentas/…`) | — | Aquisição / utilidade gratuita | Manter como ferramenta grátis |
| **CRM interno** | internal | internal | P0 (interno) | `/admin/leads`, `/admin/lead-finder` | portal (`src/app/admin/…`) | [docs/crm/](../crm/) | Operação comercial da DevFlow | Conectar ao funil WhatsApp Platform |

---

## Legenda rápida

### Prioridade

- **P0** — WhatsApp Platform (GTM público)
- **P1** — Financeiro (secundário ativo)
- **P2** — cases e ferramentas de ecossistema
- **P3** — experimentos
- **P4** — arquivados (nenhum item no inventário inicial)

### Funil principal (referência)

```
Home → Demo → Diagnóstico (/contato)
```

Apenas **WhatsApp Platform** deve ocupar CTA primário da home. Demais itens: ecossistema, footer ou rotas dedicadas.

---

## Como adicionar uma linha

1. Definir **tipo** e **status** ([PRODUCT-GOVERNANCE.md](./PRODUCT-GOVERNANCE.md)).
2. Atribuir **prioridade** (P0–P4).
3. Preencher rotas, área funcional e docs existentes (ou TODO explícito).
4. Escrever **papel atual** em uma frase.
5. Definir **próxima decisão** acionável (revisão, arquivar, promover, etc.).

---

## Histórico de revisões

| Data | Alteração |
|------|-----------|
| 2026-06 | Inventário inicial — WhatsApp P0, Financeiro P1, ecossistema P2/P3 |
