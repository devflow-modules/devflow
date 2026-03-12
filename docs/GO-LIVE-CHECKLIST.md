# Go-Live — Checklist Operacional

## Contexto

Este documento define o checklist operacional de lançamento do site **DevFlow Labs**.

Ele cobre:

- validação técnica
- verificação de conversão
- SEO técnico
- integração com WhatsApp

Este checklist pode ser reutilizado como runbook para futuros produtos SaaS da DevFlow.

---

## 🚫 Obrigatório antes de lançar

Sem isso, não considere o site oficialmente pronto:

| # | Item | Como validar |
|---|------|--------------|
| 1 | **`NEXT_PUBLIC_WHATSAPP_NUMBER`** configurado na Vercel | Settings → Environment Variables → Production. Formato: `5513999999999` (sem +, sem espaços) |
| 2 | **URL pública correta** do site | `https://devflowlabs.com.br` resolve para o projeto certo |
| 3 | **Schema.org** com dados corretos | Revisar `name`, `url`, `logo`, `sameAs` em `layout.tsx` |
| 4 | **Deploy novo** após ajustar envs | `vercel --prod` ou push em `main` |
| 5 | **Build limpo** | Sem erros no log do deploy |

---

## ✅ Validar após o deploy

Rode estes testes **em produção** (mobile + desktop):

| # | Item | Onde testar |
|---|------|-------------|
| 1 | **Botão WhatsApp** abre conversa real | Qualquer CTA "Falar no WhatsApp" |
| 2 | **Home** carrega sem erro | `https://devflowlabs.com.br` |
| 3 | **`/robots.txt`** carregando | [devflowlabs.com.br/robots.txt](https://devflowlabs.com.br/robots.txt) |
| 4 | **`/sitemap.xml`** carregando | [devflowlabs.com.br/sitemap.xml](https://devflowlabs.com.br/sitemap.xml) |
| 5 | **Páginas principais** sem 404 | `/`, `/automacao-whatsapp`, `/demo`, etc. |
| 6 | **OG image** ao compartilhar link | WhatsApp, LinkedIn ou [Facebook Debugger](https://developers.facebook.com/tools/debug/) |
| 7 | **Domínio + SSL** | HTTPS ativo, sem mixed content |
| 8 | **Redirect www → root** | `www.devflowlabs.com.br` redireciona para `devflowlabs.com.br` (ou o inverso, conforme configurado) |
| 9 | **Canonical correto** | `<link rel="canonical">` presente no HTML das páginas principais |
| 10 | **Favicon carregando** | Ícone visível na aba do navegador |
| 11 | **Lighthouse Performance ≥ 80** | Chrome DevTools → Lighthouse |
| 12 | **Search Console** | Propriedade verificada, sitemap enviado, indexação solicitada |

---

## 🎯 Critério objetivo de lançamento

O site está **lançado** quando estes checks forem verdadeiros:

- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` configurado (formato: `5513999999999`, sem +, sem espaços)
- [ ] Deploy novo feito (após envs)
- [ ] Home funcionando em produção
- [ ] Botões de contato (WhatsApp) funcionando
- [ ] `/robots.txt` e `/sitemap.xml` funcionando
- [ ] Metadados e OG funcionando
- [ ] Domínio principal redirecionando corretamente (www / non-www)
- [ ] Search Console configurado (verificação + sitemap)
- [ ] Analytics capturando acesso (Vercel Analytics)

---

## 📋 Melhorias pós-lançamento

Melhora o projeto, mas **não trava** o lançamento:

| Categoria | Itens |
|-----------|-------|
| **Tráfego** | Backlinks (LinkedIn, GitHub, Medium) |
| **Conteúdo** | Blog, artigos SEO extras |
| **Landing** | Páginas SEO adicionais |
| **Tracking** | Pixel avançado, eventos customizados |
| **Copy** | Refinamento de headlines e CTAs |
| **Performance** | Lighthouse nota mais alta |
| **Rich results** | Expansão de Schema.org |

---

## 🔁 Ordem ideal de execução

1. Configurar envs na Vercel
2. Deploy em produção
3. Validar botão WhatsApp
4. Validar sitemap / robots
5. Registrar Search Console
6. Solicitar indexação da home
7. Marcar site como **lançado** ✅

---

## 🔬 Validação pré go-live

Antes de considerar lançado, rodar estes testes **manualmente**:

| Teste | O que validar | Como |
|-------|---------------|------|
| **Conversão (10s)** | Em 10 segundos a pessoa entende o que você vende? | Abrir home em mobile e desktop, observar clareza e velocidade |
| **Tracking** | Eventos disparam? | DevTools → Network ou console: `cta_whatsapp_click`, `cta_demo_click`, `cta_scroll_50` |
| **Meta Pixel** | Evento Contact dispara ao clicar no WhatsApp | [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/) |
| **Sitemap indexado** | Status "Success" no Search Console | Indexing → Sitemaps |
| **Core Web Vitals** | LCP < 2.5s | [PageSpeed Insights](https://pagespeed.web.dev/) |
| **SEO técnico** | Rich results e metadados | [Google Rich Results Test](https://search.google.com/test/rich-results), [Meta Debugger](https://developers.facebook.com/tools/debug/) |

---

## 📱 Etapa crítica (pós-chip)

Quando o número oficial estiver ativo:

1. **Meta Cloud API** — Conectar o número na Meta Business
2. **Registrar número** — Associar ao app aprovado
3. **Webhook** — Validar em `devflow-whatsapp-platform`
4. **Teste de resposta automática** — site → clique → WhatsApp → resposta → menu

> Depois disso o site deixa de ser landing e passa a ser **máquina de geração de lead real**.

---

## ⚠️ Ponto crítico

> **`NEXT_PUBLIC_WHATSAPP_NUMBER`**  
> Sem isso, o principal canal de conversão quebra. O site pode estar bonito e publicado, mas **sem gerar lead**.
>
> **Formato correto:** `5513999999999` (DDI + DDD + número)  
> **Evitar:** `+55 13 99999-9999`, espaços, traços ou parênteses.
