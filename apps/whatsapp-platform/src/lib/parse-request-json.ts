/**
 * Evita 500 em rotas API quando o corpo não é JSON válido (cliente bug / probe).
 */
export async function parseRequestJson(
  request: Request
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
