# Checklist de segurança — WhatsApp Platform

## 🔴 Ação imediata (se houve exposição)

### 1. Rotacionar Supabase Service Role Key

Se `WHATSAPP_SUPABASE_SERVICE_ROLE_KEY` foi exposta (print, commit, vazamento):

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto
2. **Settings** → **API** → **Service role key**
3. Clique em **Regenerate** (ou **Rotate**)
4. Atualize `.env.local` e variáveis de ambiente do deploy com a nova chave

### 2. Separar ambientes Stripe

| Ambiente   | Arquivo           | Usar apenas                          |
|-----------|-------------------|--------------------------------------|
| Desenvolvimento | `.env.local` | `*_TEST_*` (sk_test_, whsec_)       |
| Produção  | `.env.production` | `*_LIVE_*` (sk_live_, whsec_)       |

**Nunca misturar** LIVE e TEST no mesmo arquivo.

### 3. URL pública em produção

Em deploy, configure:

```
NEXT_PUBLIC_WHATSAPP_APP_URL=https://app.devflowlabs.com.br
```

Checkout e Customer Portal do Stripe redirecionam para essa URL.

## ✅ Checklist pré-deploy

- [ ] `.env.production` criado a partir de `.env.production.example`
- [ ] Apenas chaves LIVE no ambiente de produção
- [ ] `BILLING_ENFORCE_LIMITS=true` ativo
- [ ] Supabase service role rotacionada se houve exposição
- [ ] `.env*` confirmado no `.gitignore` (nunca commitar)
