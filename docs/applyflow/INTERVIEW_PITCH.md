# ApplyFlow — pitch para entrevistas

Material para **entrevistas** e **networking técnico**. O MVP é **demonstrável no código e nos testes** — não há métricas de adopção ou receita a invocar; o valor do case está em **arquitectura**, **ética de plataforma** e **execução técnica**.

---

## Frase central (elevator)

**EN:** *Local-first is a product and architecture decision, not a technical limitation.*

**PT:** *Local-first é uma decisão de produto e de arquitetura, não uma limitação técnica.*

---

## Pitch único — 60–90 segundos (PT-BR)

> O **ApplyFlow** é um case **DevFlow Labs** para **LinkedIn Easy Apply**: repetir campos cansa e o histórico disperso quebra o funil — e há pressão por ferramentas com **mass apply** ou **auto-submit**, o que eu **não** quis replicar.  
> A solução é **local-first** e **privacy-first**: uma **extensão Chrome MV3** que lê o modal, classifica campos com heurísticas em **`applyflow-linkedin`**, sugere valores a partir de um perfil validado em **`@devflow/applyflow-core`**, e só escreve no DOM com **autofill assistido** — **sempre** após acção humana, com **safety gate**; **sem auto-submit**. Histórico em **`chrome.storage.local`**; **export JSON**.  
> Para métricas e funil, um **dashboard Next.js** importa esse JSON e usa a **mesma função de parse** do core, gravando em **`localStorage`** — **sem backend ApplyFlow obrigatório** no MVP. **IA** existe só como **opt-in** no cliente.  
> Trade-off consciente: **não há sync em tempo real** entre extensão e site — só ficheiro. Separação clara de pacotes evita drift de schema. Documentei uma evolução cloud **hipotética** (ADR), **não implementada**. Isto mostra que consigo entregar **produto real**, **responsabilidade de plataforma** e **TypeScript** de ponta a ponta sem inflar o escopo.

---

## Pitch único — 60–90 seconds (EN)

> **ApplyFlow** is a **DevFlow Labs** case for **LinkedIn Easy Apply**: repetitive forms and scattered history hurt your pipeline—and the market pushes **mass apply** and **auto-submit**, which I **didn’t** want to ship.  
> The approach is **local-first** / **privacy-first**: a **Chrome MV3** extension reads the modal, classifies fields via **`applyflow-linkedin`**, suggests values from a profile validated in **`@devflow/applyflow-core`**, and only writes the DOM with **assisted autofill**—always after explicit human intent, behind a **safety gate**; **no auto-submit**. History lives in **`chrome.storage.local`**; **JSON export**.  
> For funnel analytics, a **Next.js** dashboard imports that JSON using the **same parser** from core and stores results in **`localStorage`**—**no mandatory ApplyFlow backend** in the MVP. **AI** is **client-side opt-in** only.  
> Deliberate trade-off: **no real-time cloud sync**—just a file handoff. Package boundaries keep schema honest. A hypothetical cloud path is **documented** (ADR), **not built**. That’s the story: shippable product, **platform responsibility**, and **TypeScript** end-to-end—without overstating scope.

---

## Argumento de arquitetura (≈40 s) — PT-BR

> Optei por **local-first** porque o domínio envolve **dados sensíveis de carreira**, respostas de candidatura, **histórico profissional** e **possíveis chaves de API**. No MVP isso reduziu **custo**, **complexidade**, **superfície de segurança** e **risco de compliance**. Documentei uma evolução **serverless hipotética** (sync, billing, IA gerida, Pro) para o futuro — **sem** obrigar backend no produto entregue.

---

## Argumento de arquitetura — EN

> I chose **local-first** because the domain involves **sensitive career data**, application content, **professional history**, and **possible API credentials**. For the MVP that reduced **cost**, **complexity**, **security surface**, and **compliance risk**. I documented an **optional serverless path** as a **hypothesis**, not a shipped dependency.

---

## ~2 minutos — explicação técnica (PT-BR)

> O ApplyFlow divide-se em quatro blocos no monorepo: a **extensão MV3**, o **site Next.js 16** (App Router), o pacote **`@devflow/applyflow-core`** (tipos, métricas, parse de import, filtros) e o **`applyflow-linkedin`** (classificador de campos + fixtures).  
> Na extensão, um **content script IIFE** lê o DOM do Easy Apply, aplica **job intelligence** e expõe um painel para copiar ou preencher campo a campo com **safety gate**. Nada disso envia dados a um backend ApplyFlow.  
> O utilizador exporta um JSON; o dashboard valida com a **mesma função de parse** do core e grava em **localStorage** — alinhamento de schema evita drift silencioso.  
> **Vitest** cobre core, parser, extensão e o ficheiro **demo** público.  
> **IA** é opcional no cliente; o texto gerado não entra persistido no histórico como artefacto de modelo.  
> Documentação formal: **ADR** local-first vs serverless e **`SERVERLESS_FUTURE.md`** — **sem implementação** dessa camada no MVP.

---

## ~2 minutos — explicação técnica (EN)

> ApplyFlow splits into four parts: the **MV3 extension**, a **Next.js 16** App Router site, **`@devflow/applyflow-core`** (types, metrics, import parsing, filters), and **`applyflow-linkedin`** (field classification + fixtures).  
> The **IIFE content script** inspects the Easy Apply DOM, runs **job intelligence**, and surfaces a panel for copy/paste or **assisted** fills behind a **safety gate**. There is **no** ApplyFlow backend on the critical path.  
> Users export JSON; the dashboard reuses the **same parser** from core and stores results in **localStorage**.  
> **Vitest** covers core, parser, extension flows, and the public **demo** file.  
> **AI** is optional on the client; generated content isn’t persisted into application history as stored model output.  
> Formal docs: **ADR** and **`SERVERLESS_FUTURE.md`** for a **hypothetical** layer — **not implemented** in the current MVP.

---

## Perguntas prováveis

### Por que local-first?

> O domínio envolve **dados sensíveis de carreira**, respostas de candidatura, histórico e **possível API key**. Local-first reduz **custo**, **complexidade**, **superfície de segurança** e **compliance** no MVP; os dados ficam no **browser** e **`chrome.storage.local`** até o utilizador **exportar**. **Local-first is a product and architecture decision, not a technical limitation** — está escrito no ADR.

### Por que não backend?

> O MVP foca **utilidade e privacidade** sem impor conta nem servidor ApplyFlow. Backend implicaria auth, políticas, custos recorrentes e expectativa de sync antes de validar o produto. A **evolução serverless** está **documentada** como opcional ([`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md)), não como produto entregue.

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
