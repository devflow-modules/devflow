# `/admin/lead-finder` — descoberta rápida de leads

Ferramenta **interna** para reduzir fricção entre pesquisa no Google Maps e criação de lead no CRM (`/admin/leads`).

---

## Objetivo

1. Abrir uma busca no **Google Maps** com segmento + cidade.  
2. Copiar **nome** e **telefone** (e opcionalmente empresa) dos resultados.  
3. **Gravar** o lead no CRM com origem padronizada.

Sem scraping, sem APIs externas além do browser (abre `google.com/maps` numa nova aba).

---

## Fluxo do helper Maps

- Campos **Segmento** e **Cidade**.  
- Botão **Buscar no Google Maps** → URL do tipo  
  `https://www.google.com/maps/search/{encodeURIComponent(segmento + " " + cidade)}`.

---

## Presets de nicho

Botões que preenchem só o **segmento** (ex.: Clínica estética, Imobiliária, Dentista, Contabilidade, Oficina mecânica, Academia). A cidade continua à escolha do operador.

---

## Persistência da cidade

A **cidade** é guardada em `localStorage` com a chave `leadFinderCity` (carrega ao abrir a página, grava a cada alteração). Assim repetições na mesma região ficam mais rápidas.

---

## Criação de lead

- Campos: **telefone** (obrigatório), nome, empresa opcional.  
- **Origem** fixa nesta ferramenta: `lead_finder_google_maps` (texto explicativo na UI).  
- `POST /api/admin/leads` com `status: "novo"` e `credentials: "include"`.

### Botões de envio

- **Adicionar ao CRM** — só cria o lead.  
- **Adicionar e abrir WhatsApp** — cria e abre `https://wa.me/{dígitos}` numa nova aba (mensagem vazia).

Após sucesso: formulário limpo, **focus** volta ao telefone; toast “Lead criado”.

---

## Navegação

- Link **Ir para Leads** → `/admin/leads`.  
- Na página de leads há atalho **Buscar leads (Maps)** → `/admin/lead-finder`.

---

## Proteção de rota

Em produção, `/admin/lead-finder` segue a mesma política de acesso que outras rotas admin sensíveis (cookie de métricas / JWT conforme middleware). Ver código em `src/middleware.ts`.
