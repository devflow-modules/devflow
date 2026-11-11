# ApplyFlow Extension v0.2.1 — distribution readiness

**Status:** `EXTENSION_DISTRIBUTION_PACKAGE_READY` (local package + checklist; **not** CWS-submitted)  
**Version:** `0.2.1`  
**Do not confuse** unpacked extension id (manifest `key`) with a future Chrome Web Store id.

---

## Validated capabilities (Production QA pilot)

| Capability | Status |
|------------|--------|
| Production origin handshake | PASS |
| Official `/account` grant UI | PASS |
| `signedIn` + scopes (incl. contacts) | PASS |
| Cloud **read** contacts via `options.html` | PASS |
| Revoke → subsequent read `401 signed_out` | PASS |
| Cloud **write** (jobs/apps/contacts mutations) | NOT_EXECUTED in pilot |
| CWS publication | NOT_EXECUTED |

---

## Build & package (local)

From repo root (pnpm workspace):

```bash
pnpm --filter @devflow/applyflow-core build
pnpm --filter applyflow-extension build
node apps/applyflow-extension/scripts/pack-distribution.mjs
```

Outputs (gitignored under `apps/applyflow-extension/.distribution/`):

- `applyflow-extension-0.2.1.zip` — dist-only payload
- `applyflow-extension-0.2.1.sha256` — hash of the zip
- `MANIFEST_INVENTORY.json` — version, permissions, hosts (no secrets)

### Zip must include

- `manifest.json`, background/content/options bundles, icons/assets required at runtime

### Zip must exclude

- `.env*`, QA browser profiles, `.qa-pw`, dumps, source maps not required for review, test fixtures, operator logs

---

## Permission inventory (purpose)

| Permission / host | Purpose |
|-------------------|---------|
| `storage` | Local-first profile + opaque grant material in the service worker |
| `https://devflow-applyflow.vercel.app/*` | Canonical Production ApplyFlow origin |
| Localhost `3010`/`3012` | Local/dev E2E only |
| `https://www.linkedin.com/*` | Assisted Easy Apply UX (no auto-submit) |
| `https://api.openai.com/*` | Optional assist features when configured by the user |
| `externally_connectable` Production + local | Receive bind/clear/status messages from ApplyFlow web origin only |

---

## Chrome Web Store checklist (pre-submit)

- [ ] Developer account + payment (human ops)
- [ ] Store name / short + detailed description
- [ ] Category
- [ ] Icons (all required sizes)
- [ ] Screenshots (1280×800 or current CWS requirement)
- [ ] Privacy policy URL (must match data practices)
- [ ] Single-purpose justification
- [ ] Permission justifications matching this inventory
- [ ] Data usage disclosure (account grant, local profile, LinkedIn page assist)
- [ ] Support / contact email
- [ ] Remote code policy compliance (no eval of remote scripts)
- [ ] Upload zip built from tagged commit
- [ ] Explicit authorization to submit

Official requirements change — re-check Chrome Web Store documentation before submit.

**This document does not claim approval or publication.**
