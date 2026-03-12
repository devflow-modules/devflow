# DevFlow Labs

Landing e funil de aquisição da **DevFlow Labs** — automação de atendimento no WhatsApp com IA, handoff humano e métricas operacionais.

**Software Engineering • Automation • AI Systems • WhatsApp Automation Platform**

---

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui**
- **Lucide React**

---

## Início rápido

### Pré-requisitos

- Node.js 20+
- pnpm (recomendado) ou npm/yarn

### Instalação

```bash
# Clonar e entrar no projeto
cd devflow

# Instalar dependências
pnpm install

# Copiar variáveis de ambiente
cp .env.example .env.local

# Rodar em desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Build de produção

```bash
pnpm build
pnpm start
```

---

## Variáveis de ambiente

Configure no `.env.local`:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Sim | Número do WhatsApp (ex: 5513999999999) |
| `NEXT_PUBLIC_WHATSAPP_DEFAULT_TEXT` | Não | Mensagem padrão (default: "Olá, gostaria de mais informações.") |
| `WHATSAPP_ACCESS_TOKEN` | Webhook | Token da WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | Webhook | Phone Number ID do Meta |
| `WHATSAPP_VERIFY_TOKEN` | Webhook | Token para verificação do webhook |
| `NEXT_PUBLIC_META_PIXEL_ID` | Não | Pixel do Meta Ads para tracking |
| `NEXT_PUBLIC_GITHUB_URL` | Não | URL do GitHub (footer) |
| `NEXT_PUBLIC_FUNKLAB_DEMO_URL` | Não | URL da demo do FunkLab (projetos) |

Ver [docs/WHATSAPP-SETUP.md](docs/WHATSAPP-SETUP.md) para configurar o robô WhatsApp.

---

## Estrutura do projeto

```
src/
├── app/                    # App Router (Next.js)
│   ├── api/webhook/whatsapp/  # Webhook WhatsApp Cloud API
│   ├── automacao-whatsapp-tabacaria/
│   ├── automacao-whatsapp-restaurante/
│   ├── demo/               # Simulação interativa
│   ├── produtos/
│   ├── projetos/
│   └── contato/
├── modules/whatsapp/       # Módulo robô WhatsApp (mensagens, parser, envio)
├── components/
│   ├── layout/             # Header, Footer, Section
│   ├── sections/           # Hero, ProblemList, ForWho, etc.
│   ├── shared/             # WhatsAppCta, FloatingWhatsAppCta
│   ├── ui/                 # Badge, FeatureCard, etc.
│   └── analytics/          # Meta Pixel
├── design-system/          # Tokens e documentação
├── lib/                    # Utilitários (whatsapp, meta-pixel, projects)
└── styles/                 # globals.css, tokens.css
```

---

## Páginas principais

| Rota | Descrição |
|------|-----------|
| `/` | Landing principal |
| `/automacao-whatsapp-tabacaria` | Página nicho — tabacarias |
| `/automacao-whatsapp-restaurante` | Página nicho — restaurantes |
| `/demo` | Simulação interativa de atendimento |
| `/produtos/whatsapp-platform` | Produto automação WhatsApp |
| `/produtos/funklab-studio` | Produto FunkLab Studio |
| `/projetos` | Portfólio de projetos |
| `/contato` | Contato |

---

## Meta Ads

O site está pronto para Meta Ads com:

- **Meta Pixel** (PageView, ViewContent, Contact)
- **Evento Contact** em todos os cliques de WhatsApp
- **ViewContent** em páginas de nicho e demo

Ver [docs/META_ADS.md](docs/META_ADS.md) para configuração.

---

## Deploy

Recomendado: **Vercel**

```bash
# Instalar CLI e linkar
pnpm add -g vercel
vercel link
vercel env pull

# Deploy Preview (teste, branch, PR)
pnpm deploy:preview
# ou: vercel

# Deploy Production (site ao vivo)
pnpm deploy:prod
# ou: vercel --prod
```

| Comando | Ambiente | Uso |
|---------|----------|-----|
| `vercel` | Preview | Testar antes de produção |
| `vercel --prod` | Production | Publicar no domínio final |

Git: push em `main` → produção. Push em outra branch ou PR → preview.

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para detalhes.

---

## Licença

Projeto privado — DevFlow Labs.
