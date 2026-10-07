# ApplyFlow private local data

Use this folder for **personal** opportunity pipelines (real companies, contacts, outreach drafts).

## Rules

- Files matching `*.local.json` are gitignored — never commit them.
- Public demo fixtures under `apps/applyflow/public/demo/` must stay fictional.
- Contacts and messages stay in browser `localStorage` (local-first). Cloud Persistence V2 does **not** sync contacts.

## Import

1. Copy `opportunity-pipeline.local.json.example` → `opportunity-pipeline.local.json`
2. Fill with your researched opportunities (or use a local export)
3. In ApplyFlow → **Oportunidades** → Networking queue → **Import private pipeline (local JSON)**
4. Edit contacts/messages in the job Networking tab (human-in-the-loop; no auto-DM)

## Document shape

```json
{
  "version": 1,
  "kind": "applyflow-opportunity-pipeline",
  "opportunities": []
}
```

See the example file for field names. Manual `matchScore` values are preserved (not recalculated on import).
