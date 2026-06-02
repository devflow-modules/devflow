# WhatsApp Platform — Security Model

This document summarizes the security model for the WhatsApp Platform app.

The app handles authentication, tenant configuration, billing callbacks, admin operations and operational WhatsApp workflows. The security model focuses on protecting sessions, tenant boundaries, admin routes, sensitive configuration and white-label response contracts.

## Security Goals

- Protect authenticated sessions.
- Keep tenant operations scoped to the correct tenant.
- Avoid exposing billing information in white-label mode.
- Keep admin routes protected.
- Keep secrets and service-role credentials server-side only.
- Avoid sending tokens in support reports.
- Keep production errors safe for users.

## Authentication

The app uses JWT authentication with cookies.

Expected flow:

```text
User submits credentials
  ↓
Server validates credentials
  ↓
JWT session is created
  ↓
Cookie-based session is used for product access
  ↓
API routes resolve tenant/user context
```

## Password Handling

Passwords are hashed with `bcryptjs`.

Security expectations:

- Plain-text passwords must never be stored.
- Password hashes must only be handled server-side.
- Login errors should not expose unnecessary internal details.

## Tenant Boundaries

Tenant context is central to the product.

Expected rules:

- Tenant-specific settings should only be visible to authorized users.
- Metrics should be scoped to tenant context.
- Agent and queue operations should not cross tenant boundaries.
- API key generation should be attached to the correct tenant.

## Admin Protection

Production admin routes require secret-based protection.

Current controls:

- `/admin` routes in production require `admin_metrics_secret` cookie matching `WHATSAPP_ADMIN_METRICS_SECRET`.
- `/api/admin/metrics` requires `x-admin-metrics-secret` or a development environment.

These controls reduce accidental exposure of internal operational metrics.

## White-Label Response Sanitization

In `WHITE_LABEL` mode, public UI and HTTP contracts should not expose billing details to managers/operators.

Security goal:

- Managers/operators receive only the information needed for operational use.
- Commercial/billing details remain internal where appropriate.

Reference types live in:

```text
src/types/whiteLabelContracts.ts
```

## Stripe Webhook Security

Stripe webhook handling must validate webhook signatures through the configured webhook secret.

Rules:

- Use the webhook secret from environment variables.
- Do not reuse development/test secrets in production.
- The webhook endpoint must point to the WhatsApp Platform app host, not the portal host.

## Supabase and RLS

The Supabase schema enables Row Level Security.

Current note:

- Policies may be permissive when using service role server-side.
- If using Supabase Auth in a stricter multi-tenant flow, policies should filter by `tenant_id`.
- Service role credentials must remain server-side only.

## Support Reports

The in-app support report sends technical context without tokens.

Rules:

- Do not include raw tokens.
- Do not include service role keys.
- Do not include sensitive environment values.
- Keep diagnostic data useful but safe.

## Environment Variables

Important sensitive values:

- `JWT_SECRET`
- `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_STRIPE_SECRET_KEY`
- `WHATSAPP_STRIPE_TEST_SECRET_KEY`
- `WHATSAPP_STRIPE_WEBHOOK_SECRET`
- `WHATSAPP_ADMIN_METRICS_SECRET`

Rules:

- Never commit `.env.local` or production secrets.
- Keep `.env.example` safe and placeholder-based.
- Separate local, staging and production values.

## Error Handling

Production errors should be safe and not expose stack traces or sensitive implementation details.

Expected behavior:

- Validation errors are clear.
- Authentication errors are safe.
- Internal errors are logged server-side.
- User-facing responses avoid secret leakage.

## Recruiter Notes

This security model demonstrates:

- Cookie-based JWT session design
- Password hashing
- Tenant-aware SaaS thinking
- Admin route protection
- White-label contract sanitization
- Stripe webhook security awareness
- Supabase RLS awareness
- Safe support-report design
