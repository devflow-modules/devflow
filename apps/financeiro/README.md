# 💰 Financeiro — DevFlow Labs

Veja em menos de 1 minuto se o seu mês está organizado — e o que fazer a seguir.

## ✨ O que resolve

Controle financeiro simples falha em dois pontos:

- mostra dados, mas não interpreta
- não deixa claro o próximo passo

O Financeiro resolve isso com:

- **Score do mês** — leitura instantânea (0–100) + ação recomendada
- **Insights automáticos** — o que está fora do padrão ou esquecido
- **Checklist de fechamento** — passos práticos até o mês “fechado” na cabeça

## 🧠 Como funciona

### 1. Score do mês

Mostra rapidamente o nível de organização (0–100) e qual ajuste faz mais sentido agora.

### 2. Insights

Detecta situações automaticamente, por exemplo:

- sem receitas registradas
- gastos acima do padrão
- dados desatualizados ou incompletos

### 3. Checklist do mês

Guia objetivo:

- registrar receita
- registrar despesas
- categorizar
- revisar resumo

## 📱 Experiência

- Mobile-first
- Retorno inteligente (continua de onde parou)
- Ações rápidas no fluxo do dia a dia

## 🛠️ Stack

- Next.js (App Router)
- Supabase (auth)
- Prisma (PostgreSQL)
- Vitest
- Vercel Analytics (onde configurado)

## 📊 Qualidade

- Testes de domínio (score, insights, checklist)
- Consistência cruzada entre motores
- CI com `lint:ci` + `test` em paralelo (escopo Financeiro)

## 📚 Documentação

| Doc | Conteúdo |
|-----|----------|
| [CHANGELOG](../../docs/financeiro/CHANGELOG.md) | Versões e entregas |
| [Arquitetura (motores)](../../docs/financeiro/FINANCEIRO-ARCHITECTURE.md) | Score, insights, checklist, storage, analytics |
| [Posicionamento](../../docs/financeiro/FINANCEIRO-POSICIONAMENTO.md) | Proposta de mercado |
| [Índice docs](../../docs/financeiro/README.md) | Demais especificações e operação |

## 🚀 Status

Em evolução ativa, pronto para uso e demonstração.

## 🔗 Acesse

- **Produção:** [devflowlabs.com.br/ferramentas/financeiro](https://devflowlabs.com.br/ferramentas/financeiro)
- **Desenvolvimento:** `pnpm dev` no monorepo (app em `apps/financeiro` conforme setup do workspace)

## 🖼️ Screenshots (material de produto)

Mockups mobile dos três estados (vazio → em progresso → organizado). Detalhes: [`docs/financeiro/screenshots/README.md`](../../docs/financeiro/screenshots/README.md).

| Vazio | Em progresso | Organizado |
|-------|----------------|------------|
| ![Estado vazio](../../docs/financeiro/screenshots/estado-1-vazio.png) | ![Em progresso](../../docs/financeiro/screenshots/estado-2-em-progresso.png) | ![Organizado](../../docs/financeiro/screenshots/estado-3-organizado.png) |
