-- Migração de roles: agent → operator, admin → manager (tenant).
-- Staff interno (platform_admin): promover manualmente, ex.:
-- UPDATE whatsapp_users SET role = 'platform_admin' WHERE email IN ('ops@example.com');

UPDATE whatsapp_users SET role = 'operator' WHERE role = 'agent';
UPDATE whatsapp_users SET role = 'manager' WHERE role = 'admin';
