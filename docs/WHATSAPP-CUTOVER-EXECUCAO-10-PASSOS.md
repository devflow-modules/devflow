# WhatsApp cutover — 10 passos (clean start)

Checklist seco para executar o cutover na ordem certa. Marque cada item ao concluir.

---

1. **Schema no banco novo**  
   No `apps/whatsapp-webhook-api`:  
   `WHATSAPP_DATABASE_URL="<novo>" WHATSAPP_DIRECT_URL="<novo>" pnpm prisma migrate deploy`  
   _[ ]

2. **Envs locais**  
   Atualizar `.env` / `.env.local` com todas as WHATSAPP_* do novo projeto (DB + Supabase).  
   _[ ]

3. **Boot local**  
   Subir webhook-api e platform; confirmar que sobem, Prisma conecta e uma leitura básica funciona.  
   _[ ]

4. **Envs de produção**  
   Em Vercel (ou equivalente): configurar WHATSAPP_DATABASE_URL, WHATSAPP_DIRECT_URL, WHATSAPP_SUPABASE_URL, WHATSAPP_SUPABASE_SERVICE_ROLE_KEY para o novo projeto nos dois apps.  
   _[ ]

5. **Deploy webhook-api**  
   Redeploy do whatsapp-webhook-api.  
   _[ ]

6. **Deploy platform**  
   Redeploy do whatsapp-platform.  
   _[ ]

7. **Saúde**  
   Confirmar: sem erros de startup, sem erros de conexão com DB.  
   _[ ]

8. **Fluxos críticos**  
   Validar: login, GET /api/tenants/me, webhook inbound/outbound, fila, FAQ, métricas, feedback, CSV, CRM webhook, billing/Stripe.  
   _[ ]

9. **Zero writes no antigo**  
   Contar linhas em whatsapp_conversations e whatsapp_messages no banco antigo; após alguns minutos, contar de novo → não deve aumentar.  
   _[ ]

10. **Checkpoint final**  
    Novas conversas e mensagens estão no banco novo; banco antigo parado. Migração encerrada.  
    _[ ]

---

**Rollback:** Se algo falhar, restaurar envs anteriores (WHATSAPP_* apontando para o shared), redeploy webhook-api e platform. Ver `WHATSAPP-DB-ISOLATION-BLOCK2.md` seção 7.
