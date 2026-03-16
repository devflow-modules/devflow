-- Revogar acesso e habilitar RLS nas tabelas criadas após 20260202192423_supabase_security_hardening
REVOKE ALL ON TABLE public."AuditLog" FROM anon, authenticated;
REVOKE ALL ON TABLE public."IncomeAllocationGoal" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingLead" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingConsent" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingEvent" FROM anon, authenticated;
REVOKE ALL ON TABLE public."MarketingMessageSchedule" FROM anon, authenticated;
REVOKE ALL ON TABLE public."PersonalAllocationGoal" FROM anon, authenticated;
REVOKE ALL ON TABLE public."Cycle" FROM anon, authenticated;

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IncomeAllocationGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MarketingMessageSchedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PersonalAllocationGoal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cycle" ENABLE ROW LEVEL SECURITY;
