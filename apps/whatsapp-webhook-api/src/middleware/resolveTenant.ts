import type { Request, Response, NextFunction } from "express";
import { tenantService } from "../services/TenantService.js";
import type { ResolvedTenant } from "../services/TenantService.js";

export type RequestWithTenant = Request & { tenant: ResolvedTenant };

/**
 * Extracts tenant resolution hints from the request.
 * - Subdomain: first part of Host (e.g. tenant1.api.example.com -> tenant1)
 * - API key: X-API-Key header or Authorization: Bearer <key>
 * - Phone: X-Phone-Number or X-Phone-Number-Id header, or query/body (for webhook, phoneNumberId comes in body)
 */
function getResolveInput(req: Request): {
  phoneNumberId?: string;
  phone?: string;
  apiKey?: string;
  subdomain?: string;
} {
  const input: { phoneNumberId?: string; phone?: string; apiKey?: string; subdomain?: string } = {};

  const host = req.headers.host ?? "";
  const parts = host.split(".");
  if (parts.length >= 2) {
    const first = parts[0];
    if (first && first !== "www" && first !== "api") {
      input.subdomain = first;
    }
  }

  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim()) {
    input.apiKey = apiKeyHeader.trim();
  } else {
    const auth = req.headers.authorization;
    if (typeof auth === "string" && auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token) input.apiKey = token;
    }
  }

  const phoneNumberIdHeader = req.headers["x-phone-number-id"];
  if (typeof phoneNumberIdHeader === "string" && phoneNumberIdHeader.trim()) {
    input.phoneNumberId = phoneNumberIdHeader.trim();
  }

  const phoneHeader = req.headers["x-phone-number"];
  if (typeof phoneHeader === "string" && phoneHeader.trim()) {
    input.phone = phoneHeader.trim();
  }

  const queryPhone = req.query.phone ?? req.query.phone_number_id;
  if (typeof queryPhone === "string" && queryPhone.trim()) {
    input.phoneNumberId = input.phoneNumberId ?? queryPhone.trim();
  }

  return input;
}

/**
 * Middleware that resolves the tenant from request (subdomain, API key, or phone headers/query)
 * and attaches it to req.tenant. If no tenant is found, responds with 401 and does not call next().
 */
export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const input = getResolveInput(req);
  const tenant = await tenantService.resolveTenant(input);
  if (!tenant) {
    res.status(401).json({ error: "Tenant not found", code: "TENANT_NOT_RESOLVED" });
    return;
  }
  (req as RequestWithTenant).tenant = tenant;
  next();
}

/**
 * Optional middleware: attach tenant if resolved, but do not block (req.tenant may be undefined).
 */
export async function resolveTenantOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const input = getResolveInput(req);
  const tenant = await tenantService.resolveTenant(input);
  if (tenant) {
    (req as RequestWithTenant).tenant = tenant;
  }
  next();
}
