# ADR — ApplyFlow Local-First vs Serverless

**Status:** Accepted for MVP  
**Data:** 2026-05-07

## Contexto

O ApplyFlow é um produto composto por extensão Chrome (MV3), dashboard web importável e pacotes partilhados (`applyflow-core`, `applyflow-linkedin`). O estado e o histórico residem no dispositivo; o utilizador pode exportar JSON e analisar métricas no browser. Uma alternativa arquitetural seria introduzir desde já uma camada serverless (API, base de dados, auth) para sincronização e analytics centralizados.

## Decisão

**Manter o ApplyFlow local-first por defeito no MVP.** Serverless/cloud será tratado como **camada futura opcional** (ex. Pro/SaaS), não como base obrigatória do produto.

> **Local-first is a product and architecture decision, not a technical limitation.**

## Por que local-first no MVP

- **Privacidade forte** — dados de candidatura e perfil não transitam por infraestrutura ApplyFlow.
- **Dados no navegador** — `chrome.storage.local` e `localStorage`; controlo explícito via export/import.
- **Baixo custo operacional** — sem API, DB nem filas a gerir para o MVP.
- **Menor superfície de segurança** — menos pontos de falha e menos dados centralizados.
- **Sem conta/login no MVP** — reduz fricção e escopo legal inicial.
- **Menor risco de compliance** — menos processamento remoto de dados pessoais.
- **Portabilidade** — backup JSON exportável pelo utilizador.
- **Demonstração em portefólio** — demo e fluxo reprodutíveis sem backend.
- **Manutenção solo** — complexidade contida no front-end e pacotes partilhados.

## O que uma camada serverless resolveria (futuro)

- Sincronização automática entre extensão e dashboard.
- Histórico multi-dispositivo.
- Backup cloud gerido.
- Autenticação e contas.
- IA centralizada sem API key no cliente (mediante modelo de negócio e consentimento).
- Controlo de uso, billing e analytics persistentes.
- Planos Free/Pro e possível monetização SaaS.

## Por que não implementar serverless agora

- Autenticação, persistência remota e IA backend implicam **LGPD/GDPR**, políticas de privacidade e incident response.
- **Custos recorrentes** (hosting, DB, tokens LLM, observabilidade).
- **Risco de armazenar dados sensíveis** de candidaturas sem produto e modelo de confiança maduros.
- O MVP deve **validar utilidade e UX** local-first antes de comprometer infraestrutura partilhada.

## Impactos positivos (decisão atual)

- Narrativa clara: copiloto responsável, dados no dispositivo.
- Tempo de iteração menor em features de produto sem deploy de API.
- Alinhamento com posicionamento ético (sem mass submit, sem backend obrigatório).

## Trade-offs

- **Sem sync automático** — o utilizador exporta/importa manualmente (ou usa demo).
- **Sem visão unificada entre dispositivos** até existir camada cloud opt-in.
- **IA no cliente** — opt-in com chave do utilizador; não há “IA gerida” no MVP.

## Riscos mitigados

- Fuga de dados por servidor ApplyFlow inexistente no MVP.
- Expectativa de SLA/backend antes do produto estar maduro.
- Complexidade legal prematura.

## Riscos restantes

- Dispositivo comprometido expõe storage local e chaves IA configuradas no cliente.
- Utilizadores podem confundir “local-first” com “anónimo” — export JSON continua a ser dado sensível.
- Evolução futura para cloud exigirá migração cuidadosa e consentimento explícito.

## Critérios para considerar serverless no futuro

- Modelo de produto e **privacidade** definidos por escrito (opt-in, minimização, export/delete).
- Capacidade operacional para **auth, billing e suporte**.
- Demanda validada para **sync** ou **IA gerida** que justifique custos e compliance.

## Arquitetura futura opcional (visão)

Extension ↔ Serverless API ↔ PostgreSQL; Dashboard em modo cloud opcional; AI Gateway e Billing por detrás de auth e quotas — sempre **opt-in** e separado do modo local-first gratuito.

Ver [`SERVERLESS_FUTURE.md`](./SERVERLESS_FUTURE.md).

## Fora de escopo proposital (MVP)

- Backend ApplyFlow obrigatório.
- Sync cloud automático sem consentimento explícito.
- IA backend como único modo de uso.

## Conclusão

O MVP consagrar **local-first** como decisão de produto e arquitetura. Serverless permanece **roadmap opcional**, não pré-requisito de valor. Qualquer camada cloud futura deve preservar um modo **local-only** ou equivalente portável, salvo decisão explícita em contrário.
