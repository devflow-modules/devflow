# ApplyFlow — visão de produto

## Problema

Candidaturas em massa no LinkedIn Easy Apply são repetitivas, fáceis de desorganizar e muitas vezes dependem de cópia para planilhas ou notas dispersas. Ferramentas agressivas violam regras da plataforma e geram risco para o candidato.

## Solução

**ApplyFlow** é um copiloto **local-first**: extensão Chrome que sugere respostas e assiste o preenchimento **campo a campo**, com gate de segurança e **sem** enviar a candidatura automaticamente. Complementado por um **dashboard web** que lê apenas um export JSON gerado no próprio dispositivo para métricas e funil.

## Público-alvo

- Candidatos técnicos que usam LinkedIn Easy Apply com frequência.
- Profissionais que valorizam privacidade e controlo dos próprios dados.
- Visitantes de portefólio que querem ver uma peça de produto autoral (extensão + dashboard).

## Principais features

| Área | O que faz |
|------|------------|
| Extensão | Parser de campos Easy Apply, perfil local validado (Zod), sugestões, autofill assistido, safety gate. |
| Job intelligence | Heurísticas locais sobre o anúncio (senioridade, modelo de trabalho, skills, inglês…). |
| Histórico | Registos em `chrome.storage.local`, dedupe por URL, estados e notas. |
| IA (opt-in) | Textos longos via API OpenAI configurada pelo utilizador; sem backend DevFlow. |
| Dashboard | Import JSON ou demo; Recharts; filtros; `localStorage`. |

## Fluxo de uso

1. Instalar e configurar a extensão; opcionalmente IA nas opções.
2. Abrir uma vaga Easy Apply; consultar o painel e usar Copiar / Preencher com confirmações.
3. Guardar no histórico local conforme necessário.
4. Exportar backup JSON nas opções carregar no dashboard para análise visual.

## Privacidade

- Dados sensíveis e histórico **no dispositivo** (extensão) ou **no browser** (dashboard).
- Sem login DevFlow neste produto isolado.
- IA só se o utilizador activar e fornecer chave; o conteúdo gerado não é persistido no histórico de candidaturas.

## Local-first positioning

ApplyFlow is local-first by default. The extension and dashboard are designed to work without accounts, backend, or mandatory cloud sync. This keeps the MVP private, portable, low-cost, and easy to demo. A future optional cloud layer may add sync, accounts, and integrated AI for users who explicitly opt in.

## Status actual

Produto em evolução dentro do monorepo DevFlow Labs, com foco em demonstração de arquitetura limpa, TypeScript, Zod e UX responsável (sem mass apply).

Narrativa estendida para portefólio: [`CASE_STUDY.md`](./CASE_STUDY.md).
