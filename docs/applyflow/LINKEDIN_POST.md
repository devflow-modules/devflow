# Posts ApplyFlow — LinkedIn

Textos para portefólio. **Não** afirmar publicação na Chrome Web Store salvo ser factual no teu caso; distribuição pode ser “código aberto / build local” conforme o repositório.

---

## Frase de posicionamento (usar no texto ou como epígrafe)

```txt
Local-first is a product and architecture decision, not a technical limitation.
```

**PT (equivalente):** *Local-first é uma decisão de produto e de arquitetura, não uma limitação técnica.*

Use quando quiseres comunicar **maturidade**: o MVP não “falhou” em ter backend — **optou** por dados no dispositivo, menor superfície de ataque e roadmap cloud **documentado** como opcional ([`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md), [`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md)).

---

## Português — curto

**ApplyFlow** (DevFlow Labs) — copiloto **local-first** para **LinkedIn Easy Apply**. **Decisão deliberada:** dados sensíveis de carreira, histórico e eventual API key ficam no **dispositivo**; extensão MV3 + dashboard **sem backend** ApplyFlow, **IA opt-in**, métricas por JSON importado. TypeScript, Zod, Vitest. *Local-first é decisão de produto e arquitetura, não limitação técnica* — evolução serverless futura está documentada como camada Pro opcional, não como obrigação do MVP.

---

## Português — longo

Publiquei **ApplyFlow**, um case autoral na **DevFlow Labs** para quem vive do **Easy Apply** e precisa de organização **sem** entregar o histórico a mais um SaaS.

**Por que local-first de propósito:** o domínio mistura **dados de carreira**, respostas de candidatura, histórico profissional e **possível chave de API** para IA. Para o MVP, isso reduziu **custo operacional**, **complexidade**, **superfície de segurança** e **risco de compliance** — sem sacrificar utilidade: parser no formulário oficial, autofill **assistido** (só após o teu clique), **sem auto-submit**. **Local-first is a product and architecture decision, not a technical limitation** — não é “falta de backend”; é escolha explícita.

**Implementação:** extensão **Chrome MV3** com perfil **Zod-validado**, **job intelligence** e histórico em **`chrome.storage.local`**. Para funil e gráficos, **exporto JSON** e abro um **dashboard Next.js** que corre só no browser — **`localStorage`**, **demo fictícia** para portefólio.

**IA:** **opt-in** no cliente; texto gerado **não** persiste no histórico como artefacto de modelo.

**E o futuro?** Documentei uma **camada serverless opcional** (sync, billing, IA centralizada, versão Pro) como evolução — **não** como requisito do produto actual. O ADR está no repositório.

**Stack:** TypeScript, monorepo (`@devflow/applyflow-core`, `applyflow-linkedin`), Vitest, Recharts.

Copiloto responsável, não bot de mass apply — **privacidade** e **limites de plataforma** como parte do design.

---

## English — short

**ApplyFlow** (DevFlow Labs) — a deliberate **local-first** copilot for **LinkedIn Easy Apply**. Career data, application history, and optional API credentials stay **on-device**; Chrome MV3 extension + **no ApplyFlow backend**, **opt-in AI**, analytics via JSON import. TypeScript, Zod, Vitest. *Local-first is a product and architecture decision, not a technical limitation* — an optional serverless / Pro layer is documented for the future, not a MVP dependency.

---

## English — longo

I shipped **ApplyFlow** at **DevFlow Labs** — a technical product case for people who live in **LinkedIn Easy Apply** and want speed **without** defaulting to another cloud dashboard for recruiting history.

**Why local-first on purpose:** the domain touches **sensitive career data**, application answers, professional history, and **possible API keys** for optional AI. For the MVP, that cut **operational cost**, **complexity**, **attack surface**, and **compliance risk** — while still delivering value: on-form parsing, **assisted autofill** (only after your click), **no auto-submit**. **Local-first is a product and architecture decision, not a technical limitation** — it’s not “we skipped backend”; it’s an explicit trade.

**Build:** **Chrome MV3** extension with a **Zod-validated profile**, **job intelligence**, and history in **`chrome.storage.local`**. For funnel analytics, I **export JSON** and open a **Next.js** dashboard that runs **only in the browser** — **localStorage**, plus a **public demo** for safe portfolio tours.

**AI** is **client-side opt-in**; generated text is **not** stored as persistent model output in application history.

**What about scale?** I documented an **optional serverless layer** (sync, billing, centralized AI, Pro tier) as a future evolution — **not** a requirement for the current product. The ADR lives in the repo.

**Stack:** TypeScript monorepo (`@devflow/applyflow-core`, `applyflow-linkedin`), Vitest, Recharts.

Copilot first — **privacy** and **platform boundaries** baked into the architecture.

*(Distribution: per your repo/build workflow — not claiming Chrome Web Store listing unless yours is live.)*
