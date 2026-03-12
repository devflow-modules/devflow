# Pós-verificação — Google Search Console

Guia do que fazer **após a propagação do DNS** e verificação bem-sucedida do domínio no Google Search Console.

---

## 1️⃣ Enviar o Sitemap

1. Acesse o [Google Search Console](https://search.google.com/search-console)
2. Selecione a propriedade `devflowlabs.com.br`
3. No menu lateral, clique em **Sitemaps** (ou **Mapas do site**)
4. No campo "Adicionar um novo sitemap", digite:
   ```
   sitemap.xml
   ```
5. Clique em **Enviar**

✅ O Google vai rastrear automaticamente todas as URLs do site.

---

## 2️⃣ Solicitar indexação das páginas principais

1. No menu lateral, clique em **Inspeção de URL**
2. Cole cada URL abaixo e clique em **Solicitar indexação**:

| URL | Prioridade |
|-----|------------|
| `https://devflowlabs.com.br` | Alta |
| `https://devflowlabs.com.br/automacao-whatsapp` | Alta |
| `https://devflowlabs.com.br/chatbot-whatsapp` | Alta |
| `https://devflowlabs.com.br/software-atendimento-whatsapp` | Alta |
| `https://devflowlabs.com.br/demo` | Média |

---

## 3️⃣ Configurações da propriedade

1. Clique no ícone de **engrenagem** (Configurações) no menu lateral
2. Verifique:
   - **País-alvo:** Brasil
   - **Endereço da propriedade:** correto e atualizado

---

## 4️⃣ Monitoramento contínuo

Nos próximos dias e semanas, acompanhe:

### Desempenho
- Impressões, cliques, CTR e posição média
- Evolução ao longo do tempo

### Cobertura (Índice)
- Páginas indexadas
- Erros (404, bloqueadas, etc.)
- Exclusões intencionais

### Core Web Vitals
- LCP, INP, CLS
- URLs com problemas de experiência

### Mobile Usability
- Problemas de usabilidade em dispositivos móveis

---

## 5️⃣ Timeline esperada

| Período | O que esperar |
|---------|---------------|
| 1–3 dias | Sitemap processado, primeiras URLs rastreadas |
| 1–2 semanas | Primeiras impressões no relatório de Desempenho |
| 30–60 dias | Primeiros cliques orgânicos |
| 90+ dias | Leads orgânicos consistentes (com conteúdo e backlinks) |

---

## Links úteis

- [Google Search Console](https://search.google.com/search-console)
- [Sitemap DevFlow](https://devflowlabs.com.br/sitemap.xml)
- [Robots.txt DevFlow](https://devflowlabs.com.br/robots.txt)

---

## Checklist rápido

- [ ] Verificação do domínio concluída
- [ ] Sitemap enviado (`sitemap.xml`)
- [ ] Indexação solicitada para home e páginas principais
- [ ] Configurações da propriedade revisadas (país-alvo)
- [ ] Monitoramento de Desempenho e Cobertura agendado
