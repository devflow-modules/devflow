# Posts ApplyFlow — LinkedIn e GitHub

Materiais de lançamento público. **Não** afirmar Chrome Web Store, Production SaaS, utilizadores/receita, exactly-once, ou “Gmail da conta”.

Deep link: [`APPLYFLOW_ENGINEERING_CASE.md`](./APPLYFLOW_ENGINEERING_CASE.md) · produto: [`apps/applyflow/README.md`](../../apps/applyflow/README.md)

---

## Frase de posicionamento

```txt
Local-first is a product and architecture decision, not a technical limitation.
```

---

## Versão final — LinkedIn (builder)

```
I didn't want ApplyFlow to be another CRUD portfolio app.

It's a LinkedIn Easy Apply copiloto—Chrome MV3 extension + Next.js dashboard—built around a hard constraint: help candidates without mass-apply or auto-submit, and keep the default product local-first.

Along the way I had to solve real engineering problems:

1. Race-safe uniqueness — at most one Application per job link per account, enforced in PostgreSQL under concurrent creates (local verification).
2. Resumable migration — durable staging is allowed; product authority stays on V1 until verified promotion (not all-or-nothing theater).
3. Extension trust boundary — the content script never holds the OpenAI key; the service worker owns provider calls.
4. Honest provider identity — the Gmail/Calendar pilot is browser-scoped by design, not fake “account sync.”

What the architecture guarantees: clear boundaries, tested failure modes, evidence in ADRs and tests.
What it intentionally does not claim: Production operational readiness, exactly-once migration, or multi-device Gmail continuity.

ApplyFlow · DevFlow Labs
```

---

## Versão curta (PT)

```
ApplyFlow · DevFlow Labs

Copiloto local-first para LinkedIn Easy Apply (extensão MV3 + dashboard Next.js): autofill humano, sem auto-submit.

Engenharia: unicidade sourceJob no Postgres sob corrida, OCC com expectedVersion, migração partial-resumable (V1 canónico até promote), chave OpenAI no service worker, Nango Gmail/Calendar browser-scoped (pilot).

Case de engenharia com ADRs e testes — Production readiness não é o claim.
```

---

## Versão técnica — GitHub / release notes

**Título:** `ApplyFlow — local-first Easy Apply copiloto + Persistence V2 engineering case (DevFlow Labs)`

- **Produto default:** extensão + dashboard, JSON handoff, sem auto-submit.
- **Pilot:** Persistence V2 (account-scoped Jobs/Apps, OCC, resumable migration), Career/AI boundaries, Nango browser-scoped provider.
- **Qualidade:** Vitest + ADRs; ver Engineering Case.
- **Fora do claim:** Production readiness, exactly-once, multi-device Gmail.

**Links:** `apps/applyflow/README.md` · `docs/applyflow/APPLYFLOW_ENGINEERING_CASE.md` · ADRs de migração e Nango.
