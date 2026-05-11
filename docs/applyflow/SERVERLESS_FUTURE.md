# ApplyFlow — camada serverless futura (opcional)

**Estado:** exploratório — **não implementado** no repositório atual.

## Objetivo

Descrever, sem compromisso de implementação, como uma versão **Pro/cloud** poderia complementar o modo **local-first** já existente: sync, contas, IA gerida e billing — apenas quando fizer sentido de produto, legal e operacional.

## Quando faria sentido

- Utilizadores a pedirem **sync multi-dispositivo** ou **backup cloud** com consentimento explícito.
- Modelo de negócio que suporte **custos de infraestrutura**, suporte e compliance.
- Product-market fit validado no modo local antes de centralizar dados.

## Arquitetura proposta (alto nível)

```
Chrome Extension  ──►  Serverless API  ──►  PostgreSQL
                              │
                              ├── AI Gateway (OpenAI ou equivalente)
                              ├── Usage metering
                              └── Webhooks (Stripe)

Dashboard (browser)  ──►  modo local (actual)  OU  modo cloud autenticado (futuro)
```

### Módulos sugeridos

| Módulo | Função |
|--------|--------|
| **Auth** | Contas, sessões, eventual SSO (Auth.js, Clerk, Supabase Auth, etc.). |
| **Applications API** | CRUD de candidaturas sincronizadas; quotas por plano. |
| **Profile Sync** | Perfil candidato espelhado na cloud (opt-in). |
| **AI Gateway** | Chamadas LLM no backend; sem expor chaves ao cliente Pro. |
| **Usage Metering** | Limites por plano; anti-abuso. |
| **Billing** | Stripe Checkout + webhooks; planos Free local vs Pro cloud. |
| **Data export/delete** | Direitos LGPD/GDPR; eliminação de conta e dados. |

## Stack sugerida (referência)

- **API:** Next.js Route Handlers ou funções serverless dedicadas.
- **Dados:** PostgreSQL (Supabase, Neon, RDS).
- **ORM:** Prisma ou Drizzle.
- **Auth:** Auth.js, Clerk ou Supabase Auth — avaliar lock-in e custos.
- **IA:** OpenAI (ou outro) **apenas no backend** para utilizadores Pro que aceitem termos claros.
- **Pagamentos:** Stripe.
- **Deploy:** Vercel ou equivalente com observabilidade e rate limiting na borda.

## Modelo Free / Pro (conceito)

| Modo | Descrição |
|------|-----------|
| **Free / local-first** | Comportamento actual: `chrome.storage.local`, export JSON, dashboard sem backend ApplyFlow. |
| **Pro / cloud** (hipotético) | Sync automático, dashboard com sessão, IA integrada possível, backups na cloud — **opt-in** e contrato de dados explícito. |

## Riscos

- **LGPD/GDPR** — base legal, DSRs, sub-processadores, transferências internacionais.
- **Segurança** — auth robusto, segredos, OWASP API, segredos em CI.
- **Custos** — tokens LLM, DB, egress; margem vs preço.
- **Privacidade** — minimização; não guardar texto de candidatura completo sem necessidade.
- **Abuso de IA** — rate limit, custos por utilizador, monitorização de padrões.

## Mitigação

- **Opt-in** explícito para qualquer dado na cloud; modo local sempre disponível ou migrável.
- **Minimização** — apenas campos necessários; retention policies.
- **Rate limit** na API e por utilizador.
- **Criptografia** em trânsito e em repouso conforme stack escolhida.
- **Export/delete** self-service e processos internos para pedidos de titulares.
- **Logs sem conteúdo sensível** — sem corpo de cartas nem prompts completos em texto claro.

## Decisão actual

**Não implementar** esta camada até nova decisão explícita da equipa e critérios em [`ADR-LOCAL_FIRST_VS_SERVERLESS.md`](./ADR-LOCAL_FIRST_VS_SERVERLESS.md).

Documentação relacionada: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`ROADMAP.md`](./ROADMAP.md).
