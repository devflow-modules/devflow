# Supabase — Site URL e Redirect URLs (produção)

**Domínio canônico:** `https://devflowlabs.com.br`  
O login do Financeiro fica em `/ferramentas/financeiro/auth`; o callback OAuth/magic link é:

`/ferramentas/financeiro/auth/callback`

## Painel Supabase → Authentication → URL Configuration

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://devflowlabs.com.br` |

### Redirect URLs (adicione todas que forem usar)

```
https://devflowlabs.com.br/ferramentas/financeiro/auth/callback
http://localhost:3001/ferramentas/financeiro/auth/callback
http://127.0.0.1:3001/ferramentas/financeiro/auth/callback
```

Opcional — se você desenvolve pelo **site raiz** do monorepo (porta 3000):

```
http://localhost:3000/ferramentas/financeiro/auth/callback
http://127.0.0.1:3000/ferramentas/financeiro/auth/callback
```

- **Produção:** **Site URL** e callback com **`https://devflowlabs.com.br`** (domínio canônico).
- **Local:** `apps/financeiro` → porta **3001**; monorepo raiz → costuma ser **3000**.

## Variável de ambiente (Vercel / produção)

```env
NEXT_PUBLIC_APP_URL=https://devflowlabs.com.br
```

Assim `redirectTo` e links de e-mail batem com o domínio certo.
