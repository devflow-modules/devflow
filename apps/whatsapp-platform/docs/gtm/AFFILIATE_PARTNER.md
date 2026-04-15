# Afiliados — parceria com distribuidora (referência comercial)

Documento operacional para alinhar expectativa com o parceiro. Não substitui assessoria jurídica.

## Cláusulas essenciais (contrato simples)

- A comissão é paga **uma única vez**, referente ao **valor da implantação** do cliente indicado, após o cliente estar **implantado e ativo** no sistema (estado comercial «implantado»).
- **Não há comissão** sobre mensalidades, mensagens ou outros consumos recorrentes.
- A comissão **só é devida** quando o valor de implantação do cliente estiver **registado na plataforma** e o ciclo GTM estiver em **implantado** — sem valor definido, **não se gera** comissão automática (evita erro de margem).

## Proposta de fecho (pitch)

Podes monetizar a tua rede sem operar o produto.

Para cada cliente que indicares:

- tratamos da implantação e do arranque;
- recebes uma comissão **única**, calculada sobre o **valor real** fechado na implantação;
- sem operação do dia a dia, sem suporte técnico ao teu lado, sem comissão recorrente a gerir.

Parâmetros típicos de negociação (exemplo):

- percentagem da implantação (ex.: 50%);
- pagamento por cliente **após** implantação confirmada;
- sem limite de indicações.

## Link de indicação (`?ref=`)

Parceiro partilha o cadastro com o ID do afiliado (CUID):

`https://<teu-dominio>/signup?ref=<affiliateId>`

O visitante não vê campo nenhum: o `ref` fica em cookie (`affiliate_ref`, 7 dias) e é enviado no `POST /api/auth/signup` (corpo e/ou cookie). Só grava se o afiliado existir na base.

## Onde está no produto

- Valor por cliente: campo `implantationPriceBrl` no tenant (admin: `PATCH /api/admin/tenants/:id`).
- Comissão: gerada automaticamente ao passar a **IMPLANTADO** com afiliado e valor definido.
- Auditoria: eventos `affiliate.commission.created` e `affiliate.commission.paid` em `AuditLog` (plataforma).
