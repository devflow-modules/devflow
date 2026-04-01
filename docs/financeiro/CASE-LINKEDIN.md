# Case público — rascunho LinkedIn (Financeiro)

Use como base; ajuste tom e métricas antes de publicar.

---

## Post curto

Lançamos o **Financeiro** na DevFlow como um dashboard que responde em segundos: **score do mês**, **insights** objetivos e **checklist** de fechamento — tudo **sem depender de IA** no núcleo (regras testáveis, comportamento previsível).

No repositório: testes de domínio, consistência entre motores e CI com lint + test no escopo do produto.

**Link:** [devflowlabs.com.br/ferramentas/financeiro](https://devflowlabs.com.br/ferramentas/financeiro)

Screenshots (3 estados mobile) em `docs/financeiro/screenshots/`.

---

## Post com gancho técnico

O problema dos apps financeiros não é falta de gráfico — é falta de **interpretação + próximo passo**.

No Financeiro consolidamos três camadas determinísticas:

1. **Score 0–100** — leitura instantânea do mês  
2. **Insights** — o que está fora do padrão ou esquecido  
3. **Checklist** — execução até sentir o mês organizado  

Stack: Next.js, Supabase, Prisma, Vitest. CI com gate realista (`lint:ci` + test).

Quem quiser ver a narrativa de produto e o changelog: README em `apps/financeiro` e `docs/financeiro/CHANGELOG.md`.

---

## Hashtags (sugestão)

`#FinançasPessoais` `#SaaS` `#Nextjs` `#TypeScript` `#ProductEngineering` `#UX` `#DevFlow`
