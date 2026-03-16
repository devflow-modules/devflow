/**
 * Cookie adapter interface for Supabase SSR.
 * Implement this with your framework's cookie store (e.g. Next.js cookies(), request.cookies).
 */
export type CookieOption = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export type CookieStore = {
  getAll(): { name: string; value: string }[];
  setAll(cookiesToSet: CookieOption[]): void;
};
