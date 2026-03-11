# Deploy e ambientes — Vercel

Baseado na [documentação de Environments da Vercel](https://vercel.com/docs/deployments/environments).

---

## Ambientes

| Ambiente | Uso | Disparo |
|----------|-----|---------|
| **Local** | Desenvolvimento na máquina | `pnpm dev` |
| **Preview** | Testar antes de produção, QA, PRs | Push em branch ≠ main, PR, ou `vercel` |
| **Production** | Site em produção | Push/merge em main ou `vercel --prod` |

---

## Preview (pré-produção)

Deploys de Preview permitem testar em URL própria, sem afetar produção.

**Disparos automáticos:**
- Push em branch diferente de `main`
- Abertura de Pull Request (GitHub, GitLab, Bitbucket)
- Deploy via CLI: `vercel` (sem `--prod`)

**URLs geradas:**
- Por branch — sempre a última versão da branch
- Por commit — versão exata do commit

---

## Production

**Disparos automáticos:**
- Push ou merge em `main` (branch de produção)

**Via CLI:**
```bash
vercel --prod
```

---

## Comandos

```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Linkar projeto local
vercel link

# Puxar variáveis de ambiente
vercel env pull

# Deploy Preview (teste)
vercel

# Deploy Production (site ao vivo)
vercel --prod
```
