# Checklist — Site DevFlow Labs Lançado

Tudo o que precisa ser feito para dar o site como **concluído e em produção**.

---

## 1. Configurações essenciais

### Variáveis de ambiente (Vercel)

Configure no painel da Vercel → **Settings** → **Environment Variables**:

| Variável | Obrigatória | Onde pegar |
|----------|-------------|------------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ✅ Sim | Seu número com DDI (ex: 5513999999999) |
| `NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT` | Não | Mensagem padrão ao clicar no WhatsApp |
| `NEXT_PUBLIC_META_PIXEL_ID` | Se usar Meta Ads | [Gerenciador de Eventos do Meta](https://business.facebook.com/events_manager) |
| `NEXT_PUBLIC_GITHUB_URL` | Não | URL do repositório ou organização |
| `NEXT_PUBLIC_FUNKLAB_DEMO_URL` | Não | URL da demo FunkLab (se existir) |

⚠️ **Sem `NEXT_PUBLIC_WHATSAPP_NUMBER`**, todos os botões de WhatsApp vão para `#` (não funcionam).

### Dados institucionais

- [ ] **CNPJ real** — Substituir `00.000.000/0001-00` no footer (`src/components/layout/footer.tsx`)
- [ ] **Schema.org** — Conferir URLs do LinkedIn e GitHub em `src/app/layout.tsx` (se forem diferentes de `devflowlabs`)

---

## 2. Google Search Console

- [ ] Verificação do domínio concluída (TXT no DNS)
- [ ] Sitemap enviado: `sitemap.xml`
- [ ] Indexação solicitada para home e páginas principais
- [ ] País-alvo: Brasil

📄 Guia detalhado: [POS-VERIFICACAO-GOOGLE-SEARCH-CONSOLE.md](./POS-VERIFICACAO-GOOGLE-SEARCH-CONSOLE.md)

---

## 3. Deploy e domínio

- [ ] Deploy em produção na Vercel (`main` ou `vercel --prod`)
- [ ] Domínio `devflowlabs.com.br` apontando para a Vercel
- [ ] SSL/HTTPS ativo (Vercel configura automaticamente)
- [ ] `https://devflowlabs.com.br` abre o site corretamente

---

## 4. Testes em produção

Teste manualmente:

- [ ] **Home** — Carrega, hero, CTAs, links
- [ ] **WhatsApp** — Clique abre conversa com número correto
- [ ] **Todas as páginas** — Sem 404, layout ok
- [ ] **Mobile** — Navegação, botões, formulários funcionando
- [ ] **Sitemap** — [devflowlabs.com.br/sitemap.xml](https://devflowlabs.com.br/sitemap.xml)
- [ ] **Robots** — [devflowlabs.com.br/robots.txt](https://devflowlabs.com.br/robots.txt)
- [ ] **OG Image** — Compartilhar link no WhatsApp e conferir preview

### Páginas para testar

| Rota | O que verificar |
|------|-----------------|
| `/` | Hero, CTAs, scroll |
| `/automacao-whatsapp` | Conteúdo, links para nichos |
| `/chatbot-whatsapp` | Conteúdo, CTA |
| `/software-atendimento-whatsapp` | Conteúdo, CTA |
| `/automacao-whatsapp-restaurante` | Conteúdo, demo |
| `/automacao-whatsapp-tabacaria` | Conteúdo, demo |
| `/automacao-whatsapp-loja` | Conteúdo, CTA |
| `/automacao-whatsapp-clinica` | Conteúdo, CTA |
| `/demo` | Simulação funciona |
| `/blog` | Lista de artigos |
| `/blog/[slug]` | Artigos abrem |
| `/contato` | Página carrega |
| `/privacidade`, `/termos`, `/cookies` | Textos legais |
| `/sobre` | Página institucional |

---

## 5. Analytics e tracking

- [ ] **Vercel Analytics** — Já integrado, conferir no painel da Vercel
- [ ] **Meta Pixel** — Se configurado, testar com [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
- [ ] **Evento Contact** — Disparar ao clicar em WhatsApp (já implementado)

---

## 6. SEO técnico

- [ ] Open Graph — Preview ok ao compartilhar (WhatsApp, LinkedIn, etc.)
- [ ] `og:image` — Imagem 1200x630 carregando
- [ ] Canonicals — Configurados nas páginas principais
- [ ] Schema.org — JSON-LD Organization presente (validar com [Rich Results Test](https://search.google.com/test/rich-results))

---

## 7. Performance

- [ ] **Lighthouse** — Rodar em [PageSpeed Insights](https://pagespeed.web.dev/) (meta: 90+ em Performance)
- [ ] Imagens otimizadas (Next.js Image quando aplicável)
- [ ] Build sem erros (`pnpm build`)

---

## 8. Conteúdo e legal

- [ ] **Termos de Uso** — Revisar e ajustar se necessário
- [ ] **Política de Privacidade** — Incluir serviços usados (Vercel, Meta Pixel, etc.)
- [ ] **Cookies** — Texto alinhado com LGPD

---

## 9. Backlinks (opcional, pós-lançamento)

- [ ] LinkedIn — Post de lançamento com link
- [ ] GitHub — README ou perfil com link
- [ ] Medium/Dev.to — Artigo mencionando o produto (se fizer sentido)

---

## Resumo — Ordem sugerida

1. **Configurar** → Env vars, CNPJ, Schema URLs
2. **Deploy** → Garantir que está em produção
3. **Testar** → Todas as páginas, WhatsApp, mobile
4. **Google** → Verificação + sitemap + indexação
5. **Validar** → OG, Lighthouse, Pixel (se usar)
6. **Documentar** → Atualizar README se necessário

---

## Status final

Quando todos os itens críticos estiverem ✅, o site está **lançado e pronto para capturar leads**.

| Categoria | Status |
|-----------|--------|
| Infraestrutura (Vercel, domínio, SSL) | |
| Configurações (env, CNPJ) | |
| Google Search Console | |
| Testes em produção | |
| Analytics e tracking | |
| SEO técnico | |
| Conteúdo e legal | |
