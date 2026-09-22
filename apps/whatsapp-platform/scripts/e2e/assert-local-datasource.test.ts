import { describe, expect, it } from "vitest";
import {
  assertCiLocalDatasources,
  assertLocalDatasourceUrl,
} from "./assert-local-datasource";

const LOCAL = "postgresql://whatsapp_a11y:whatsapp_a11y_ci@127.0.0.1:5432/whatsapp_a11y";
const LOCALHOST = "postgresql://whatsapp_a11y:whatsapp_a11y_ci@localhost:5432/whatsapp_a11y";

describe("assertLocalDatasourceUrl", () => {
  it("accepts 127.0.0.1 and localhost", () => {
    expect(() => assertLocalDatasourceUrl(LOCAL)).not.toThrow();
    expect(() => assertLocalDatasourceUrl(LOCALHOST, "WHATSAPP_DIRECT_URL")).not.toThrow();
  });

  it("rejects remote, service-name and loopback-adjacent hosts without leaking the URL", () => {
    const rejected = [
      "postgresql://whatsapp_a11y:x@db.example.test:5432/whatsapp",
      "postgresql://whatsapp_a11y:x@postgres:5432/whatsapp_a11y",
      "postgresql://whatsapp_a11y:x@0.0.0.0:5432/whatsapp_a11y",
      "postgresql://whatsapp_a11y:x@[::1]:5432/whatsapp_a11y",
    ];
    for (const url of rejected) {
      expect(() => assertLocalDatasourceUrl(url)).toThrow(/host não é localhost/);
      try {
        assertLocalDatasourceUrl(url);
      } catch (error) {
        expect(String(error)).not.toContain(url);
        expect(String(error)).not.toMatch(/example\.test|postgres:5432|::1/);
      }
    }
  });

  it("rejects missing, invalid and non-postgres values", () => {
    expect(() => assertLocalDatasourceUrl("")).toThrow("WHATSAPP_DATABASE_URL ausente");
    expect(() => assertLocalDatasourceUrl("not-a-url")).toThrow("WHATSAPP_DATABASE_URL inválido");
    expect(() => assertLocalDatasourceUrl("mysql://127.0.0.1:3306/db")).toThrow(
      "WHATSAPP_DATABASE_URL não é PostgreSQL"
    );
  });
});

describe("assertCiLocalDatasources", () => {
  it("requires WHATSAPP_DATABASE_URL and checks every present alias", () => {
    expect(() => assertCiLocalDatasources({})).toThrow("WHATSAPP_DATABASE_URL ausente");
    expect(() =>
      assertCiLocalDatasources({
        WHATSAPP_DATABASE_URL: LOCAL,
        WHATSAPP_DIRECT_URL: LOCALHOST,
      })
    ).not.toThrow();
    expect(() =>
      assertCiLocalDatasources({
        WHATSAPP_DATABASE_URL: LOCAL,
        DATABASE_URL: "postgresql://x:y@db.example.test:5432/whatsapp",
      })
    ).toThrow("DATABASE_URL recusado: host não é localhost");
  });
});
