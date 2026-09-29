# Entitlement status policy — WhatsApp Platform

**Status:** current (Phase 2 remediation)  
**Source of truth:** `apps/whatsapp-platform/src/modules/billing/entitlementStatusPolicy.ts` + `getTenantPlan`

## Decision

Paid plan **capabilities** are granted only when the authoritative subscription row is in an **entitled** status.

This aligns `BillingSubscription` with the existing `TenantSubscription` gate (which already excluded `CANCELED` / `PAST_DUE`).

### TenantSubscription (`status` UPPER)

| Status | Entitled? |
|--------|------------|
| `ACTIVE` | yes |
| `TRIAL` | yes |
| `PAST_DUE` | no |
| `CANCELED` | no |
| unknown / empty | no |

### BillingSubscription (`status` Stripe-style lowercase)

| Status | Entitled? |
|--------|------------|
| `active` | yes |
| `trialing` | yes |
| `past_due` | no |
| `canceled` | no |
| `unpaid` | no |
| `incomplete` | no |
| `incomplete_expired` | no |
| `paused` | no |
| unknown | **no** (fail-closed) |

## Resolution order (`getTenantPlan`)

1. If `TenantSubscription` exists and status is entitled → use its `plan`.
2. Else if `BillingSubscription` exists and status is entitled → use its `plan`.
3. Else → `normalizePlan(Tenant.plan)` (typically FREE / legacy field).

A row with a paid `plan` field and `past_due` / `canceled` / `unpaid` **must not** keep paid feature access.

## Product note

Grace-period paid access during `past_due` is **not** enabled. If product later wants a grace window, it must be an explicit policy change with tests — not silent fallthrough on `plan`.
