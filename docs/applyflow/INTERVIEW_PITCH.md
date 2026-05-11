# ApplyFlow — pitch para entrevistas

Material para **entrevistas** e **networking técnico**. Ajustar números de testes se o repositório evoluir.

---

## Frase central (elevator)

**EN:** *Local-first is a product and architecture decision, not a technical limitation.*

**PT:** *Local-first é uma decisão de produto e de arquitetura, não uma limitação técnica.*

---

## Argumento de arquitetura (≈40 s) — PT-BR

> Optei por **local-first** porque o domínio envolve **dados sensíveis de carreira**, respostas de candidatura, **histórico profissional** e **possíveis chaves de API**. No MVP isso reduziu **custo**, **complexidade**, **superfície de segurança** e **risco de compliance**. Ao mesmo tempo documentei uma evolução **serverless opcional** — sync, billing, IA centralizada, versão Pro — para quando fizer sentido de produto e legal, sem obrigar backend no case actual.

---

## Argumento de arquitetura — EN

> I chose **local-first** because the domain involves **sensitive career data**, application content, **professional history**, and **possible API credentials**. For the MVP that reduced **cost**, **complexity**, **security surface**, and **compliance risk**. I also documented an **optional serverless path** — sync, billing, centralized AI, a potential Pro tier — as a future layer, not a requirement for the shipped product.

---

## 30 segundos — PT-BR

> Fiz o **ApplyFlow**, um copiloto **local-first** para **LinkedIn Easy Apply**: extensão Chrome que parseia o formulário, sugere respostas de um perfil **Zod-validado** e faz **autofill assistido** — **sem** enviar a candidatura por mim. Histórico em **`chrome.storage.local`**. Para métricas, exporto **JSON** para um **dashboard Next.js** só no browser, com **demo fictícia**. **IA opt-in** para textos longos. *Local-first foi decisão de produto, não limitação técnica* — há ADR e roadmap para uma camada cloud opcional. Stack: TypeScript, monorepo, Vitest, MV3 + App Router.

---

## 30 segundos — EN

> I built **ApplyFlow**, a **local-first** copilot for **LinkedIn Easy Apply**—a Chrome extension that parses the form, suggests answers from a **Zod-validated profile**, and does **assisted autofill** **without auto-submit**. History lives in **`chrome.storage.local`**; analytics run in a **Next.js** dashboard via **JSON import** plus a **fictional demo**. **Opt-in AI** handles long answers. **Local-first was a product and architecture decision**, not a technical shortcut—there’s an ADR and a documented optional serverless path. Stack: TypeScript monorepo, Vitest, MV3 + App Router.

---

## ~2 minutos — explicação técnica (PT-BR)

> O ApplyFlow divide-se em quatro blocos no monorepo: a **extensão MV3**, o **site Next.js 16**, o pacote **`@devflow/applyflow-core`** com tipos, métricas, parse de import e filtros, e o **`applyflow-linkedin`** com o classificador de campos e fixtures.  
> Na extensão, um **content script IIFE** lê o DOM do Easy Apply, aplica heurísticas de **job intelligence** e expõe um painel para copiar ou preencher campo a campo com **safety gate**. Nada disso envia dados a um backend ApplyFlow.  
> O utilizador exporta um JSON; o dashboard valida com a **mesma função de parse** do core e grava em **localStorage** — alinhamento de schema é crítico para não haver drift.  
> Testes **Vitest** cobrem core, parser, extensão e o ficheiro **demo** público.  
> **IA** é opcional, no cliente, e o texto gerado não entra persistido no histórico como artefacto de modelo.  
> Documentação formal: **ADR** local-first vs serverless e **`SERVERLESS_FUTURE.md`** para uma hipotética camada Pro — **sem implementação** no MVP.

---

## ~2 minutos — explicação técnica (EN)

> ApplyFlow splits across four moving parts: the **MV3 extension**, a **Next.js 16** site, **`@devflow/applyflow-core`** (types, metrics, import parsing, filters), and **`applyflow-linkedin`** (field classification + fixtures).  
> The **IIFE content script** inspects the Easy Apply DOM, runs **job intelligence**, and surfaces a panel for copy/paste or **assisted** fills behind a **safety gate**. There is **no** ApplyFlow backend receiving that traffic.  
> Users export JSON; the dashboard reuses the **same parser** from core and stores results in **localStorage**—shared schema prevents silent drift.  
> **Vitest** covers core, parser, extension flows, and the public **demo** file.  
> **AI** is optional on the client; generated content isn’t persisted into application history as stored model output.  
> Formal docs: an **ADR** on local-first vs serverless and **`SERVERLESS_FUTURE.md`** for a hypothetical Pro layer — **not implemented** in the current MVP.

---

## Perguntas prováveis

### Por que local-first?

> O domínio envolve **dados sensíveis de carreira**, respostas de candidatura, histórico e **possível API key**. Local-first reduz **custo**, **complexidade**, **superfície de segurança** e **compliance** no MVP; os dados ficam no **browser** e **`chrome.storage.local`** até o utilizador **exportar**. **Local-first is a product and architecture decision, not a technical limitation** — está escrito no ADR.

### Por que não backend?

> O MVP foca **utilidade e privacidade** sem impor conta nem servidor ApplyFlow. Backend implicaria auth, políticas, custos recorrentes e expectativa de sync antes de validar o produto. A **evolução serverless** está **documentada** como opcional ([`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md)), não como débito técnico escondido.

### Como evita automação indevida?

> **Sem auto-submit** e sem pipeline de mass apply; autofill só após **ação explícita**; gates para baixa confiança; sem bypass de login/CAPTCHA. O roadmap lista **fora de escopo** explícito (mass apply, scraping agressivo).

### Como funciona o autofill?

> A extensão classifica o campo (tipo + contexto), sugere valor a partir do **perfil validado** e das heurísticas do anúncio, e só escreve no DOM quando o utilizador **confirma** o passo — com auditoria local para rastreio.

### Como funciona a IA opt-in?

> Nas opções, o utilizador activa e configura a **própria** API. Chamadas são **no cliente** para texto longo; **default off**; conteúdo gerado **não** substitui o histórico persistido de candidaturas como “output do modelo”.

### Trade-offs técnicos?

> **JSON manual** entre extensão e dashboard é simples e seguro, mas **não** é sync em tempo real. **`dist/`** do core é mais um passo de build, mas estabiliza o Next. **IIFE** no content script favorece isolamento frente a bundling mais complexo.

### O que melhoraria numa versão SaaS?

> Sincronização **opt-in** com **cifrado** e chave do utilizador, separação legal clara de dados, logging mínimo, e decisão consciente sobre **termos do LinkedIn** antes de qualquer recurso de equipa/conta. Manteria **sem auto-submit** como princípio até reavaliação explícita.
