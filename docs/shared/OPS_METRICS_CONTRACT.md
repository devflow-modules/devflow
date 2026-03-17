# Ops metrics contract

Data contract that product apps should expose for the (future) Ops dashboard. **This document defines the contract only; the Ops dashboard is not implemented yet.**

## Endpoint

Each product app that participates in Ops reporting **MUST** expose:

```
GET /api/ops/metrics
```

- **Authentication:** TBD (e.g. internal API key or service-to-service auth).
- **Response:** JSON with the shape below.

## Response shape

```ts
{
  product: string;           // Product slug, e.g. "financeiro", "crm"
  users: number;             // Total users (or accounts) for this product
  activeSubscriptions: number;
  pendingCancellation: number;
  mrr: number;               // Monthly recurring revenue (e.g. in cents or currency base unit)
}
```

### Field semantics

| Field                 | Description |
|-----------------------|-------------|
| `product`             | Unique product identifier (slug). Must match the app name used in the monorepo (e.g. `financeiro`). |
| `users`               | Count of users (or tenants/accounts) that have access to the product. |
| `activeSubscriptions` | Count of subscriptions that are active (not cancelled, not past_due, etc.). |
| `pendingCancellation` | Count of subscriptions that are set to cancel at period end. |
| `mrr`                 | Monthly recurring revenue. Unit is product-defined (e.g. cents or whole currency); the Ops dashboard will document the chosen unit. |

Products that do not have subscriptions may set `activeSubscriptions`, `pendingCancellation`, and `mrr` to `0` and still expose `users`.

## Example response

```json
{
  "product": "financeiro",
  "users": 150,
  "activeSubscriptions": 42,
  "pendingCancellation": 2,
  "mrr": 42000
}
```

(Here `mrr` might be in cents, so 42000 = 420.00 in currency.)

## Optional fields (reserved)

The contract may be extended later with optional fields. Products **MAY** include extra keys; the Ops dashboard **MUST** ignore unknown keys. Required keys **MUST** be present.

Optional keys already in use:

| Field              | Description                          | Used by              |
|--------------------|--------------------------------------|-----------------------|
| `tenants`          | Total tenants/accounts               | whatsapp-platform     |
| `conversations`    | Total conversations                  | whatsapp-platform     |
| `messagesLast24h`  | Messages in the last 24 hours        | whatsapp-platform     |
| `queries`          | Total queries (e.g. CNPJ lookups)    | investigamais         |
| `cacheHitRate`     | Cache hit rate (0–100 or decimal)   | investigamais        |

## Implementation note

Implementation of this endpoint is **per product** inside each app (e.g. `apps/financeiro/src/app/api/ops/metrics/route.ts`). Each product uses its own DB and Stripe (or billing) data to compute the values. The Ops dashboard will aggregate these endpoints across products when it is built.
