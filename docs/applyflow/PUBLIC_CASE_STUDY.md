# ApplyFlow — case study (portfólio público)

> **Release status (authoritative):** invite-only **10–50 user closed beta**. Public signup **not** approved.
> Prefer [`apps/applyflow/README.md`](../../apps/applyflow/README.md) and [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) for current claims.

**ApplyFlow** is a **local-first** career workflow (discovery → match → applications) with a **Chrome MV3** extension companion for LinkedIn Easy Apply assist. Default product data for resume/profile stays on the user’s device; the workflow is human-gated (**no auto-submit**, **no mass-apply**).

This document is a **public product narrative** (may lag). For concurrency, migration, trust boundaries, and validation evidence, see [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md) and [`TESTING.md`](./TESTING.md).

---

## O problema

1. **Repetição** — as mesmas perguntas voltam em quase todas as vagas.
2. **Histórico disperso** — estado espalhado por abas e notas.
3. **Pressão por automação agressiva** — mass apply / auto-submit aumentam risco de plataforma e privacidade.

O desafio não era “enviar mais candidaturas”, e sim **consistência com controlo**.

---

## A solução

| Camada | Função |
|--------|--------|
| **Extensão Chrome MV3** | Painel Easy Apply, sugestões, autofill **só com acção humana**, histórico em `chrome.storage.local`, export JSON |
| **Dashboard Next.js** | Import JSON ou **demo fictícia**, funil e métricas no browser |
| **Pacotes TypeScript** | Contratos partilhados (`applyflow-core`, Career Suite) |

**Princípios do produto default:**

- **Local-first** — sem cloud obrigatória no ciclo Easy Apply → export → dashboard
- **Sem auto-submit** / **sem mass-apply**
- **IA opt-in** — chave do utilizador; não é requisito do fluxo base

---

## Fluxo do utilizador

1. Configurar perfil (e opcionalmente IA) nas opções da extensão.
2. Abrir Easy Apply; copiar / preencher campo a campo com safety gate.
3. Guardar histórico local; exportar JSON.
4. Importar no dashboard ou carregar demo pública.
5. Opcional: handoff **CareerBundle** → Interview Lab.

Extensão ↔ dashboard: **ficheiro JSON**, não sync em tempo real.

---

## Duas camadas (importante)

| Camada | O que é |
|--------|---------|
| **Produto default** | Local-first extensão + dashboard (acima) |
| **Persistence V2 pilot** | Conta autenticada, Jobs/Applications em PostgreSQL, migração **partial-resumable**, OCC, boundaries de AI/provider |

O pilot **não** redefine o default local-first. Evoluções SaaS “full production” **não** são reivindicadas neste case.

Detalhe técnico: [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md) · [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md).

---

## Arquitectura (visão de produto)

```text
┌─────────────────────┐     export JSON      ┌─────────────────────┐
│  Chrome Extension   │ ──────────────────►  │  Dashboard Next.js  │
│  content + SW + opts│                      │  import + metrics   │
└─────────┬───────────┘                      └─────────┬───────────┘
          │                                              │
          └──────────────────┬───────────────────────────┘
                             ▼
                   packages/applyflow-core (+ Career Suite)
```

Pilotcionalmente (pilot): dashboard autenticado → Persistence V2 API → PostgreSQL; provider runtime → Nango (browser-scoped).

---

## Privacidade e responsabilidade

- Histórico default no **dispositivo** / browser.
- Export com dados reais = informação sensível do utilizador.
- Safety gate reduz preenchimento cego.
- Materiais públicos usam **demo fictícia** e capturas sem PII.

---

## Validação

Capacidade técnica demonstrável via builds, Vitest e documentação de engenharia — **sem** inventar utilizadores, receita ou latência.

---

## Fora do escopo (explícito)

- Auto-submit / mass-apply
- Chrome Web Store como promessa
- Production readiness / multi-replica “provado”
- Gmail “da conta ApplyFlow” ou continuidade multi-dispositivo
- Exactly-once / all-or-nothing migration

---

## Aprendizados

1. Local-first é decisão de produto, não desculpa técnica.
2. Copiloto ≠ bot — ética de plataforma vende melhor que automação total.
3. Quando existe cloud pilot, a honestidade sobre **autoridade** (V1 vs V2) e **identidade de provider** importa tanto quanto o happy path.

---

## Estratégia de publicação

- Case + screenshots oficiais `01`–`06` em [`assets/`](./assets/)
- README produto: [`apps/applyflow/README.md`](../../apps/applyflow/README.md)
- Engenharia: [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md)

---

*ApplyFlow — DevFlow Labs · case de portfólio · 2026*
