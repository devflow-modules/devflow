# Modelo de Dados — Módulo Financeiro DevFlow

**Fonte:** `prisma/schema.prisma` (captura março 2025)

Apenas modelos relacionados ao módulo financeiro. Marketing, leads etc. omitidos.

---

## Diagrama de entidades (resumido)

```
User ──┬── HouseholdMembership ── household ── Household
       │         │
       │         └── sources ── Source
       │
       └── PersonalAllocationGoal ── household ── Household

Household ──┬── HouseholdMembership
            ├── Invite
            ├── Source
            ├── Income
            ├── Expense
            ├── Rule
            ├── Cycle
            ├── IncomeAllocationGoal
            └── PersonalAllocationGoal

Source ──┬── PaymentDay ── Cycle
         ├── Income
         ├── Expense
         └── RuleSource ── Rule

Rule ── RuleSource ── Source
```

---

## Enums

| Enum | Valores |
|------|---------|
| `MembershipRole` | OWNER, MEMBER |
| `SourceType` | PJ, PF |
| `CycleType` | MONTHLY, WEEKLY |
| `IncomeStatus` | SCHEDULED, RECEIVED |
| `ExpenseStatus` | PENDING, PAID, SCHEDULED |
| `RuleType` | CATEGORY_PERCENTAGE, FIXED_PER_MEMBER |

---

## Modelos

### Household
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| name | String | Nome da casa |
| slug | String | Slug único |
| timezone | String | Default America/Sao_Paulo |
| createdAt, updatedAt | DateTime | |

### User
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| supabaseId | String? | ID no Supabase Auth |
| email | String | Único |
| name | String? | |
| avatarUrl | String? | |
| createdAt, updatedAt | DateTime | |

### HouseholdMembership
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| userId | String | FK User |
| householdId | String | FK Household |
| role | MembershipRole | OWNER ou MEMBER |
| createdAt | DateTime | |
| @@unique([userId, householdId]) | | Um user por household |

### Invite
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| email | String | |
| role | MembershipRole | |
| token | String | Único |
| expiresAt | DateTime | |
| acceptedAt | DateTime? | |
| acceptedByUserId | String? | FK User |

### Source
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| membershipId | String? | FK HouseholdMembership (opcional) |
| name | String | |
| sourceType | SourceType | PJ ou PF |
| description | String? | |
| isActive | Boolean | Default true |
| createdAt | DateTime | |

### Cycle
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| name | String | |
| cycleType | CycleType | MONTHLY ou WEEKLY |
| anchorDay | Int? | 1-31 (MONTHLY) |
| anchorWeekDay | Int? | 0-6 (WEEKLY: 0=dom) |
| createdAt, updatedAt | DateTime | |

### PaymentDay
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| sourceId | String | FK Source |
| dayOfMonth | Int | 1-31 |
| description | String? | |
| cycleId | String? | FK Cycle |

### Income
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| sourceId | String? | FK Source |
| amount | Decimal(10,2) | |
| receivedAt | DateTime | |
| isRecurring | Boolean | Default false |
| status | IncomeStatus | SCHEDULED, RECEIVED |
| notes | String? | |

### Expense
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| sourceId | String? | FK Source |
| category | String | |
| amount | Decimal(10,2) | |
| dueDate | DateTime | |
| paidAmount | Decimal? | |
| paidAt | DateTime? | |
| isRecurring | Boolean | Default false |
| status | ExpenseStatus | PENDING, PAID, SCHEDULED |
| note | String? | |

### Rule
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| name | String | |
| description | String? | |
| ruleType | RuleType | CATEGORY_PERCENTAGE, FIXED_PER_MEMBER |
| percentage | Decimal? | |
| fixedAmount | Decimal? | |
| referenceCategory | String? | |
| createdAt | DateTime | |

### RuleSource
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| ruleId | String | FK Rule |
| sourceId | String | FK Source |
| share | Decimal? | Percentual por fonte |

### IncomeAllocationGoal
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| year, month | Int | |
| investmentPercent | Decimal? | |
| savingsPercent | Decimal? | |
| investmentAmount | Decimal? | |
| savingsAmount | Decimal? | |
| observations | String? | |
| @@unique([householdId, year, month]) | | Uma meta por mês |

### PersonalAllocationGoal
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| userId | String | FK User |
| householdId | String | FK Household |
| year, month | Int | |
| investmentPercent | Decimal? | |
| savingsPercent | Decimal? | |
| investmentAmount | Decimal? | |
| savingsAmount | Decimal? | |
| observations | String? | |
| @@unique([userId, householdId, year, month]) | | Uma meta por usuário/mês |

### AuditLog
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| householdId | String | FK Household |
| userId | String | FK User |
| action | String | |
| entityType | String | |
| entityId | String? | |
| metadata | Json? | |
| createdAt | DateTime | |

---

## Índices relevantes

- `Invite`: [householdId, email]
- `AuditLog`: [householdId, createdAt], [userId, createdAt]
- `IncomeAllocationGoal`: [householdId, year, month]
- `PersonalAllocationGoal`: [householdId, year, month], [userId, householdId, year, month]
- `Cycle`: [householdId]
