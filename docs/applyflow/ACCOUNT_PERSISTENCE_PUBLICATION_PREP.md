# ApplyFlow â€” Account persistence publication prep (shared activation)

**Scope:** handoff for operator-led activation on the shared ApplyFlow stack.
**Not done in this document:** remote migrate, deploy, credential rotation, Chrome Web Store publish, commit/push.

Related: [`PERSISTENCE_V2.md`](./PERSISTENCE_V2.md) Â· [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) Â· [`PERSISTENCE_V2_MIGRATION_RUNBOOK.md`](./PERSISTENCE_V2_MIGRATION_RUNBOOK.md) Â· [`PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`](./PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md) Â· [`CLOSED_BETA_RUNBOOK.md`](./CLOSED_BETA_RUNBOOK.md)

---

## Estado da entrega (2026-10-06)

| Camada | Estado |
| --- | --- |
| EvidÃªncia local (unit/local-db/typecheck/build/Chrome Aâ€“L) | **ConcluÃ­da** |
| PreparaÃ§Ã£o (branch + runbook + pacote extensÃ£o) | **ConcluÃ­da** |
| OperaÃ§Ã£o remota (migrate/deploy/pilot/smoke prod) | **Pendente â€” requer autorizaÃ§Ã£o** |
| ValidaÃ§Ã£o em produÃ§Ã£o | **NÃ£o executada** |

**Veredito de preparaÃ§Ã£o:** cÃ³digo pronto para commit/PR apÃ³s checks locais. AtivaÃ§Ã£o compartilhada continua **bloqueada atÃ©** backup + migrate + deploy + pilot + smoke remotos autorizados.

---

## IdentificaÃ§Ã£o do cÃ³digo

| Item | Valor |
| --- | --- |
| Branch de entrega | `feat/applyflow-account-persistence-v2` |
| Base `HEAD` | `0a61625c579af2d8003ed640709ec17e5d3b8677` |
| Diff | ~71 tracked modified + ~53 untracked de entrega (sem `.tmp`/zip/`dist-production`) |
| **Excluir do commit** | `.tmp/` (perfil Chrome), `dist-production/`, `applyflow-extension-*-production.zip`, `.env*`, caches |

ApÃ³s merge/deploy: substituir `HEAD` pelo SHA exacto do deployment Vercel.

---

## Destino compartilhado (documentaÃ§Ã£o existente â€” sem inventar)

| Camada | Identificador | Fonte |
| --- | --- | --- |
| App Vercel | project **`devflow-applyflow`** | `BETA_EVIDENCE.md`, `CLOSED_BETA_RUNBOOK.md` |
| URL canÃ³nica | `https://devflow-applyflow.vercel.app` | `extension-origins.json`, docs ApplyFlow |
| Postgres project ref | **`qygwhuwvilkekfkgoizb`** (sa-east-1) | `PERSISTENCE_V2_FIRST_PRODUCTION_PILOT_RUNBOOK.md`, `BACKUP_RESTORE.md` |
| Pooler host (fingerprint) | `aws-0-sa-east-1.pooler.supabase.com` Â· fingerprint `3c193d95207920e0` | pilot runbook |
| Host / DB name exactos em runtime | **DESTINO NÃƒO CONFIRMADO nesta sessÃ£o** â€” operador confirma no console Supabase/Vercel com dual-confirm antes de mutate | â€” |
| Auth | Supabase via `NEXT_PUBLIC_SUPABASE_*` | env names only |
| ExtensÃ£o | ID `mjigahpnpgcopnjfofcpopkaehohfknh` Â· versÃ£o `0.2.0` | `extension-origins.json` / manifest |

**Nesta etapa:** nenhum acesso a produÃ§Ã£o; comandos abaixo sÃ£o templates para execuÃ§Ã£o posterior autorizada.

---

## Contract A (inalterado)

| Layer | Guarantee |
| --- | --- |
| Next.js personal/V2 APIs | `accountId` derivado de sessÃ£o/grant no servidor; repositÃ³rios filtram por conta; OCC via `expectedVersion` |
| Prisma runtime | `DATABASE_URL` service role â€” tipicamente owner/`BYPASSRLS`; **nÃ£o** afirmar RLS efectiva nas queries Prisma |
| RLS `ENABLE` sem `FORCE` | IntenÃ§Ã£o + deny `anon`/`authenticated` grants; nÃ£o substitui Contract A |
| Pilot | Login **â‰ ** beta; sÃ³ conta explicitamente `pilotEligible` |
| Rollback | Sem demote silencioso `v2_cloud â†’ v1_local`; preferir `v2_paused` / fix-forward |

---

## Compatibilidade de versÃµes â†’ ordem de activaÃ§Ã£o

| CombinaÃ§Ã£o | Resultado |
| --- | --- |
| App antigo + DB **com** migration personal | Seguro â€” tabelas novas ignoradas |
| App novo + DB **sem** migration | **Falha** nas rotas personal/grants |
| App novo + DB migrado + flag off / sem pilot | APIs existem; capabilities negam escrita cloud |
| App novo + flag on + pilot + config incompleta | Risco operacional |

**ConsequÃªncia:** migration e configuraÃ§Ã£o runtime necessÃ¡rias **antes** (ou no mesmo cutover que) a promoÃ§Ã£o do cÃ³digo que depende das tabelas. NÃ£o deixar env/role â€œpara depoisâ€ do deploy.

### SequÃªncia canÃ³nica (operador)

1. **RevisÃ£o / PR / checks** na versÃ£o exacta (SHA do merge).
2. **Identificar destino** â€” Vercel `devflow-applyflow` + Supabase `qygwhuwvilkekfkgoizb`; confirmar host redigido e fingerprint no console (**DESTINO NÃƒO CONFIRMADO atÃ© dual-confirm**).
3. **Preflight somente leitura** + **backup verificÃ¡vel** (SHA-256 + `pg_restore -l`).
4. **Preparar role runtime Contract A** e **variÃ¡veis Vercel** (nomes abaixo) **antes** de promover o cÃ³digo â€” valores jÃ¡ correctos no ambiente Production/Preview alvo.
5. **`prisma migrate deploy`** com **role de migrations** / `DIRECT_URL` (separada da role runtime).
6. **Deploy** do commit mergeado com `DATABASE_URL` (runtime) + flags jÃ¡ apontando ao DB migrado.
7. **Activar uma conta elegÃ­vel** (`pilotEligible` + fluxo activate/`v2_cloud` server-side) â€” nunca promover todas as contas / signup pÃºblico.
8. **ExtensÃ£o de produÃ§Ã£o** 0.2.0 (ZIP/SHA abaixo) ligada ao origin Vercel.
9. **Smoke sintÃ©tico** + critÃ©rios de interrupÃ§Ã£o; limpeza sÃ³ de registos sintÃ©ticos.

Nango reconnect e import legado (`confirmImport`) ocorrem **apÃ³s** a conta pilot estar cloud-activa.

---

## VariÃ¡veis (nomes apenas â€” sem valores)

| Variable | Quando deve estar pronta | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Antes do deploy que usa tabelas personal | Prisma **runtime** (Contract A) |
| `DIRECT_URL` | Antes do `migrate deploy` | Prisma migrate / direct |
| `APPLYFLOW_DB_TARGET` | Preflight | Guard pin do ambiente |
| `APPLYFLOW_PERSISTENCE_V2` | Antes ou no deploy; tipicamente `false` atÃ© Gate pÃ³s-migrate, depois `true` conforme pilot runbook | Flag global V2 |
| `NEXT_PUBLIC_APPLYFLOW_URL` | Antes do deploy | `https://devflow-applyflow.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | JÃ¡ existentes; confirmar | Auth |
| `NANGO_SECRET_KEY` | Antes de smoke Nango | Server-side only |
| `APPLYFLOW_E2E` / `APPLYFLOW_E2E_SECRET` | **Nunca em production** | Local/non-prod only |
| `APPLYFLOW_EXTENSION_TARGET` | Build local da extensÃ£o | `production` â†’ manifest writer |

SeparaÃ§Ã£o obrigatÃ³ria: **role migrations â‰  role runtime**.

---

## Migration `20261005170000_account_personal_persistence`

Aditiva; FKs `RESTRICT` â†’ `applyflow_accounts`; uniques de dedupe; RLS ENABLE sem FORCE + REVOKE anon/authenticated.

- NÃ£o alterar esta migration se jÃ¡ aplicada algures â€” correcÃ§Ãµes = nova migration.
- NÃ£o `migrate reset` / drops em shared.
- App antigo + DB migrado OK; rollback de app sem rotas personal â†’ **fix-forward** ou `v2_paused`, nÃ£o wipe.

---

## Preflight remoto (preparado â€” execuÃ§Ã£o posterior)

```bash
cd apps/applyflow
# 1) Identidade do destino (operador confirma host fingerprint vs 3c193d95207920e0)
# 2) Status sem apply
pnpm exec prisma migrate status
# 3) Role inspect (read-only SQL do repo; alvo confirmado)
pnpm db:role:inspect
# 4) Backup fresco â€” ver BACKUP_RESTORE.md; registar UTC + SHA-256 fora do git
# 5) Vercel: confirmar nomes de env no project devflow-applyflow (nÃ£o colar valores)
```

**Parar se:** drift inesperado; backup sem prova; fingerprint nÃ£o bate; intenÃ§Ã£o de abrir signup / promover todas as contas.

---

## ExtensÃ£o â€” pacote de produÃ§Ã£o

Regenerado a partir do working tree final (2026-10-06). `dist/` local (fixture) **preservado** separadamente.

| Campo | Valor |
| --- | --- |
| VersÃ£o | `0.2.0` |
| ID | `mjigahpnpgcopnjfofcpopkaehohfknh` |
| Origin | `https://devflow-applyflow.vercel.app` |
| ZIP | `apps/applyflow-extension/applyflow-extension-0.2.0-production.zip` |
| SHA256 | `EB288F749F1905983DA721071E7CE8456369735613DFF4715A244E7A605FAC53` |

Manifest produÃ§Ã£o: content scripts sÃ³ LinkedIn; `host_permissions` / `externally_connectable` sÃ³ Vercel (+ LinkedIn/OpenAI hosts). Sem fixture no manifest.

Nota: o bundle JS ainda contÃ©m strings `localOrigins` (allowlist de desenvolvimento no SW); o gate Chrome de produÃ§Ã£o Ã© `externally_connectable` â†’ sÃ³ Vercel. NÃ£o publicar CWS nesta etapa.

Detalhe 409/OCC: [`apps/applyflow-extension/docs/ACCOUNT_CLOUD_SYNC.md`](../../apps/applyflow-extension/docs/ACCOUNT_CLOUD_SYNC.md).

---

## Checks locais (evidÃªncia)

| Check | Resultado |
| --- | --- |
| `prisma generate` (schema ApplyFlow) apÃ³s libertar lock | **PASS** |
| `pnpm build` canÃ³nico (`prisma generate && next build`) | **PASS** |
| Lock EPERM | Causa: `next dev` em `127.0.0.1:3012` (PIDs deste checkout); encerrados sÃ³ esses processos |
| Vitest auth/personal/local-db + extensÃ£o account | PASS (sessÃ£o anterior; nÃ£o repetido sem invalidaÃ§Ã£o) |
| Chrome Aâ€“L CDP | VALIDADO LOCALMENTE (nÃ£o repetido) |

Ambiente: Docker local `127.0.0.1:5434` / `applyflow`. ProduÃ§Ã£o **nÃ£o** modificada.

---

## Smoke pÃ³s-ativaÃ§Ã£o (preparar â€” nÃ£o executar em prod aqui)

Contas sintÃ©ticas autorizadas apenas. Sem candidaturas/e-mails reais. Sem dados de clientes.

1. Login + capabilities
2. Profile/CV entre contextos
3. Networking + inbound responses
4. Job/Application, dedupe, OCC
5. Lifecycle + career event
6. ExtensÃ£o prod â†” origin Vercel
7. Logout/revogaÃ§Ã£o
8. Isolamento A/B

**Interromper se:** IDOR; grant vÃ¡lido pÃ³s-logout; 500 em rotas core; drift de schema; dados cross-tenant.

Limpeza: sÃ³ registos das contas sintÃ©ticas listadas no ticket.

---

## Rollback

| AcÃ§Ã£o | Efeito |
| --- | --- |
| `APPLYFLOW_PERSISTENCE_V2=false` com `v2_cloud` | `v2_paused` â€” dados retidos |
| Reverter deploy sem cÃ³digo personal | IncompatÃ­vel para contas jÃ¡ cloud â€” **fix-forward** / pausa |
| Apagar tabelas / demote silencioso para V1 | **Proibido** |
| Revogar grants / `pilotEligible=false` | Reduz exposiÃ§Ã£o sem wipe |

---

## Proposta de PR (nÃ£o executada)

**TÃ­tulo:** `feat(applyflow): account personal persistence, extension cloud sync, and activation prep`

**DescriÃ§Ã£o:**

```markdown
## Summary
- Account-scoped personal persistence (profile, contacts, inbound, career events, import, extension grants) with Contract A API isolation.
- Extension grant/sync (409 reconcile, OCC, generation fence) and account-scoped Nango routes.
- Additive migration `20261005170000_account_personal_persistence` and shared activation runbook.

## Test plan
- [x] prisma generate + pnpm build (applyflow)
- [x] vitest auth/personal/local-db (applyflow)
- [x] vitest extension src/account
- [x] Chrome Aâ€“L local (CDP evidence)
- [ ] operator: migrate deploy + single-account pilot smoke (authorized remote)

## Out of scope
- Remote migrate/deploy, CWS publish, production credential changes
```

---

## AÃ§Ãµes externas que requerem autorizaÃ§Ã£o

1. Commit + push + merge do PR nesta branch.
2. Backup + `prisma migrate deploy` no Postgres Supabase ApplyFlow (`qygwhuwvilkekfkgoizb`) apÃ³s dual-confirm de host.
3. Role runtime Contract A em produÃ§Ã£o (se ainda nÃ£o existir).
4. Deploy Vercel Production `devflow-applyflow` com env jÃ¡ preparadas.
5. Activar **uma** conta pilot.
6. Distribuir ZIP 0.2.0 (SHA acima) â€” sem CWS.
7. Smoke sintÃ©tico pÃ³s-deploy.
