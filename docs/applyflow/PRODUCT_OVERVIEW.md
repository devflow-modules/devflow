# ApplyFlow — visão de produto

## Problema

Candidaturas em massa no LinkedIn Easy Apply são repetitivas, fáceis de desorganizar e muitas vezes dependem de cópia para planilhas ou notas dispersas. Ferramentas agressivas violam regras da plataforma e geram risco para o candidato.

## Solução

**ApplyFlow** (DevFlow Labs) é um copiloto **local-first**: extensão Chrome que sugere respostas e assiste o preenchimento **campo a campo**, com gate de segurança e **sem** enviar a candidatura automaticamente. Complementado por um **dashboard web** que lê um export JSON (ou demo fictícia) para métricas e funil.

## Público-alvo

- Candidatos técnicos que usam LinkedIn Easy Apply com frequência.
- Profissionais que valorizam controlo dos próprios dados no dispositivo.
- Visitantes de portefólio que querem ver produto + engenharia (não só UI).

## Principais features

| Área | O que faz |
|------|------------|
| Extensão | Parser Easy Apply, perfil local (Zod), Answer Bank, sugestões, autofill assistido, safety gate |
| Job intelligence | Heurísticas locais sobre o anúncio |
| Histórico | `chrome.storage.local`, dedupe por URL |
| IA (opt-in) | Textos longos via OpenAI; credential no **service worker** |
| Dashboard | Import JSON / demo; métricas; handoff Interview Lab |

## Fluxo de uso

1. Configurar extensão (perfil; IA opcional).
2. Easy Apply → Copiar / Preencher com confirmações.
3. Histórico local → export JSON.
4. Dashboard: import ou demo.

## Local-first (default) vs Persistence V2 (pilot)

| Camada | Papel |
|--------|--------|
| **Local-first default** | Ciclo Easy Apply → JSON → dashboard **sem** cloud obrigatória |
| **Persistence V2 pilot** | Conta autenticada, Jobs/Applications em PostgreSQL, migração resumível, OCC |

O pilot **não** substitui o posicionamento local-first do produto base. **Production readiness não é reivindicada.**

Detalhe: [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md) · [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md).

## Dados no dispositivo

- Histórico default na extensão / browser após import.
- IA só com activação explícita.
- Tratar exports reais como dados sensíveis.

## Status

Produto e case de engenharia em evolução no monorepo DevFlow Labs.

- Produto público: [`PUBLIC_CASE_STUDY.md`](./PUBLIC_CASE_STUDY.md)
- README: [`apps/applyflow/README.md`](../../apps/applyflow/README.md)
