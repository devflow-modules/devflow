import { describe, it, expect } from "vitest";

/**
 * Simula cache de idempotência: mesma chave → mesma resposta;
 * duas escritas concorrentes só uma persiste.
 */
describe("idempotency concurrency (modelo)", () => {
  it("duas corridas com mesma key retornam mesmo payload", async () => {
    const store = new Map<string, { body: object; status: number }>();
    const key = "idem-key-12345678";
    const run = async (id: number) => {
      if (store.has(key)) return { ...store.get(key)!, replay: true };
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      if (store.has(key)) return { ...store.get(key)!, replay: true };
      const payload = { success: true, data: { id } };
      store.set(key, { body: payload, status: 200 });
      return { body: payload, status: 200, replay: false };
    };
    const [a, b] = await Promise.all([run(1), run(2)]);
    expect(store.size).toBe(1);
    const bodies = [a, b].map((x) => ("body" in x ? x.body : x));
    expect(bodies[0]).toEqual(bodies[1]);
  });
});
