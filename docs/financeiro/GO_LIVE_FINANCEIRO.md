# Go-live — DevFlow Financeiro

Checklist para lançamento controlado (staging → produção).

## 1. Variáveis de ambiente obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL (Prisma) |
| `DIRECT_URL` | Conexão direta (migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth cliente |
| `NODE_ENV` | `production` em prod |
| `NEXT_PUBLIC_APP_ENV` | `production` ou `staging` (telemetria/UX) |

**Nunca** usar `DATABASE_URL` de produção em staging ou local sem querer. Ver `apps/financeiro/.env.staging.example`.

## 2. Migrações

```bash
cd apps/financeiro
dotenv -e ../../.env.local -e .env -- pnpm run db:migrate:deploy
```

Confirmar que não há migrações pendentes antes do deploy.

## 3. Seed (opcional)

- **Demo completo:** `pnpm run seed:demo -- --email usuario@email.com`
- **Reset contas demo:** adicionar `--reset-demo`

Requer usuário já existente no banco (login pelo menos uma vez).

## 4. Health check

```bash
curl -sS https://SEU_DOMINIO/api/health
```

Esperado: `status: "ok"`, `db: "connected"`, `timestamp` ISO.

## 5. Smoke tests (staging/produção)

1. Login no app no navegador.
2. DevTools → Network → copiar header `Cookie` de uma requisição autenticada.
3. Rodar:

```bash
cd apps/financeiro
FINANCEIRO_SMOKE_COOKIE='...' \
FINANCEIRO_SMOKE_BASE_URL=https://staging... \
pnpm run smoke
```

Sem cookie, apenas `/api/health` é validado.

Se o servidor não estiver no ar, o smoke termina com **exit 0** (skip). Para CI exigindo servidor: `FINANCEIRO_SMOKE_STRICT=1`.

## 6. Testes automatizados

| Comando | Escopo |
|---------|--------|
| `pnpm test` | Unitários / integração leve (sem DB dedicado) |
| `FINANCEIRO_TEST_DATABASE_URL=postgresql://... pnpm run test:e2e` | E2E fluxo completo no Postgres |

O banco E2E deve ser **isolado** (criar/apagar households de teste).

## 7. Validação manual do fluxo

- [ ] Criar conta → participantes → despesa compartilhada paga
- [ ] Gerar liquidações → pagamento parcial → estorno
- [ ] Marcar quitado / reabrir / confirmar fechamento
- [ ] Fechar mês (snapshot)
- [ ] Linha do tempo coerente com ações

## 8. Observabilidade mínima

Logs JSON em stdout com prefixo `[finance]`:

- `expense_created`, `settlement_created`, `settlements_generated`
- `payment_applied`, `payment_reversed`
- `settlement_reopened`, `settlement_finalized`, `settlement_completed`
- `month_closed`

Campos comuns: `action`, `ts`, `timestamp`, `userId`, `householdId`, `accountId`, ids de entidade, `amount`, `service: "financeiro"`.

**Monitorar pós-lançamento:** taxa de 5xx nas rotas `/api/accounts/*`, `/api/settlements/*`, `/api/payments/*`, `/api/health`, erros Prisma, rate limit `429`.

## 9. Rollback / segurança

### Se algo crítico ocorrer após deploy

1. **Pausar mutações (mitigação rápida)**  
   - Colocar app em manutenção (Vercel/feature flag) **ou** bloquear POST/PATCH/DELETE no edge/WAF para `/api/**` exceto `GET /api/health`.  
   - **Não** apagar dados.

2. **Preservar histórico**  
   - Ledger (pagamentos, estornos, liquidações) não deve ser truncado. Rollback de código, não de dados, salvo orientação explícita de DBA.

3. **Somente leitura**  
   - Se necessário, expor apenas páginas estáticas + GET APIs enquanto corrige.

4. **Rollback de deploy**  
   - Redeploy do commit anterior estável.  
   - Se migração nova quebrou: plano com backup/restore do banco **antes** de reverter migração (Prisma não desfaz dados automaticamente).

5. **Rate limit**  
   - Hoje é in-memory por instância; em múltiplas réplicas considerar Redis/Upstash.

Documento complementar: procedimentos internos de backup do Postgres (fora deste repo).

## 10. Definição de pronto para uso controlado

- [ ] Build e `pnpm test` OK  
- [ ] Staging com DB separado e health OK  
- [ ] Smoke (com cookie) OK  
- [ ] E2E opcional mas recomendado em CI com DB de teste  
- [ ] Time alinhado ao plano de rollback  

---

**Última atualização:** sprint go-live Financeiro.
