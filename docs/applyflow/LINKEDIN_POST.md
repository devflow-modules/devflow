# Posts ApplyFlow — LinkedIn e GitHub

Materiais de **lançamento público** (portefólio técnico / produto). **Não** afirmar Chrome Web Store publicada, SaaS cloud activo, utilizadores/receita/adopção medidos, sync cloud, billing ou **Pro** como **já disponíveis** — apenas como **exploração documentada** quando fizer sentido (ADR / `SERVERLESS_FUTURE.md`). Distribuição: **código e build local** no monorepo, salvo factualmente diferente no teu caso.

---

## Frase de posicionamento (epígrafe opcional)

```txt
Local-first is a product and architecture decision, not a technical limitation.
```

**PT:** *Local-first é uma decisão de produto e de arquitetura, não uma limitação técnica.*

---

## Versão final — LinkedIn (curta)

**ApplyFlow** · DevFlow Labs — case autoral: copiloto **local-first** e **privacy-first** para **LinkedIn Easy Apply**.

O Easy Apply repete campos e o histórico espalha-se; ferramentas agressivas empurram **mass apply** e **auto-submit**. Fiz o oposto no desenho: **extensão Chrome MV3** com parser e classificação de campos, **autofill assistido** (só após o teu clique), **sem auto-submit** e **sem mass apply**; histórico em **`chrome.storage.local`**; **export/import JSON**. Para funil, métricas e tabela, um **dashboard Next.js** corre **só no browser** (`localStorage` após import) — **sem backend ApplyFlow obrigatório**. **IA opt-in** no cliente (tua chave), desligada por defeito.

Stack: TypeScript, Zod, Vitest, `@devflow/applyflow-core`, `applyflow-linkedin`, Recharts.

*Isto é produto demonstrável e portefólio — não é loja Chrome nem SaaS cloud no MVP; evolução serverless está **documentada** como hipótese futura, não como entrega actual.*

---

## Versão pronta para publicar (copiar/colar)

Post final em **PT** para LinkedIn — case autoral **DevFlow Labs**, tom técnico e responsável. **Copia o bloco abaixo** (sem as linhas de cercas) quando fores publicar.

```
ApplyFlow · DevFlow Labs

Case autoral: copiloto local-first e privacy-first para LinkedIn Easy Apply.

O Easy Apply repete campos e o histórico espalha-se; há pressão por ferramentas com mass apply e auto-submit — não foi essa a aposta.

O que entreguei:
• Extensão Chrome MV3 — parser no modal, classificação de campos, autofill assistido (só após o teu clique), sem auto-submit e sem mass apply; histórico em chrome.storage.local; export/import JSON.
• Dashboard Next.js — import do JSON (ou demo fictícia), funil, métricas e tabela; tudo só no browser (localStorage após import); sem backend ApplyFlow obrigatório no MVP.
• IA opt-in no cliente (tua chave), desligada por defeito.

Stack: TypeScript, Zod, Vitest, @devflow/applyflow-core, applyflow-linkedin, Recharts.

Isto é produto demonstrável e portefólio técnico — não é Chrome Web Store nem SaaS cloud no MVP; qualquer camada cloud futura está documentada como hipótese, não como promessa de produto.

Código e documentação no repositório DevFlow Labs.
```

---

## Versão técnica — GitHub / comentário de release / README estendido

**Título sugerido:** `ApplyFlow — copiloto local-first para LinkedIn Easy Apply (DevFlow Labs)`

**Resumo**

- **Problema:** Easy Apply repetitivo; pipeline disperso; risco de automação irresponsável face aos termos da plataforma e à privacidade.
- **Abordagem:** **Local-first / privacy-first** por desenho — dados de carreira, histórico e eventual chave de API ficam no **dispositivo**; **nenhum** servidor ApplyFlow no caminho crítico do MVP.
- **Extensão (MV3):** content script + opções; sugestões a partir de perfil **Zod-validado**; heurísticas em `applyflow-linkedin`; **safety gate**; histórico local; **export JSON**.
- **Dashboard (Next.js App Router):** import / drag-and-drop do JSON; **Carregar demo** (fictício); funil, gráficos e tabela; estado em **`localStorage`** após import — análise **no browser**.
- **Partilha extensão ↔ dashboard:** ficheiro **JSON** exportado pelo utilizador (não há sync cloud automático).
- **IA:** **opt-in**; chamadas no cliente; texto gerado **não** tratado como artefacto persistente de modelo no histórico de candidaturas conforme desenho actual.
- **Qualidade:** testes Vitest (core, linkedin, extensão, dashboard); ESLint nos caminhos ApplyFlow; build reprodutível.

**Fora do escopo do MVP (explícito no roadmap):** auto-submit; mass apply; backend/billing/sync **como produto entregue**; Chrome Web Store **como promessa** (só se for factual no teu processo).

**Links úteis no repo:** `apps/applyflow/README.md` · `docs/applyflow/CASE_STUDY.md` · `docs/applyflow/ARCHITECTURE.md` · `docs/applyflow/ROADMAP.md`

---

## Rascunhos adicionais (referência)

### Português — curto (alternativa)

**ApplyFlow** (DevFlow Labs) — copiloto **local-first** para **LinkedIn Easy Apply**. Dados sensíveis de carreira, histórico e eventual API key no **dispositivo**; extensão MV3 + dashboard **sem backend** ApplyFlow; **IA opt-in**; métricas via **JSON** importado no Next.js. TypeScript, Zod, Vitest. *Local-first é decisão de produto e arquitectura* — camada cloud futura está **só documentada**, não vendida como MVP.

### Português — longo (alternativa)

Partilho o **ApplyFlow**, case autoral na **DevFlow Labs** para quem vive do **Easy Apply** e quer organização **sem** entregar o histórico a um SaaS obrigatório.

**Porque local-first:** o domínio mistura dados de carreira, respostas de candidatura e possível chave de API para IA. No MVP, dados em **`chrome.storage.local`** e **`localStorage`** (dashboard); **autofill assistido**; **sem auto-submit**; **sem mass apply**.

**Implementação:** extensão **Chrome MV3** com perfil validado, **job intelligence** e export **JSON**. Dashboard **Next.js** com **demo fictícia** para portefólio seguro.

**IA:** **opt-in** no cliente.

**Futuro:** camada serverless **hipotética** (sync, billing, IA gerida, Pro) — **não implementada**; ver ADR e `SERVERLESS_FUTURE.md`.

**Stack:** TypeScript, monorepo (`@devflow/applyflow-core`, `applyflow-linkedin`), Vitest, Recharts.

---

### English — short (alternativa)

**ApplyFlow** (DevFlow Labs) — a deliberate **local-first** copilot for **LinkedIn Easy Apply**. Career data, application history, and optional API credentials stay **on-device**; Chrome MV3 extension + **no mandatory ApplyFlow backend**; **opt-in AI**; analytics via **JSON import** into a **Next.js** dashboard. TypeScript, Zod, Vitest. *Local-first is a product and architecture decision* — any serverless / Pro path is **documentation-only**, not a shipped MVP feature.

### English — longo (alternativa)

I’m sharing **ApplyFlow** at **DevFlow Labs** — a technical product case for **LinkedIn Easy Apply** with speed **without** a mandatory cloud recruiting dashboard.

**Why local-first:** sensitive career data and optional API keys; MVP keeps history in **`chrome.storage.local`**, analytics in **browser `localStorage`** after import, **assisted autofill**, **no auto-submit**, **no mass apply**.

**Build:** **Chrome MV3** + **Zod-validated profile** + **job intelligence** + **JSON export**. **Next.js** dashboard + **public fictional demo**.

**AI:** **client-side opt-in**.

**Future:** **hypothetical** optional serverless layer — **not shipped**; see ADR / `SERVERLESS_FUTURE.md`.

**Stack:** TypeScript monorepo (`@devflow/applyflow-core`, `applyflow-linkedin`), Vitest, Recharts.

*(Distribution: code/build workflow — **not** claiming Chrome Web Store unless that is independently true for you.)*
