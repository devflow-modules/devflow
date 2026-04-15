/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AffiliatesAdminClient } from "../AffiliatesAdminClient";

const AFF_ID = "cjld2cjxh0000qzrmn831ir4";

describe("AffiliatesAdminClient", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("Copiar link usa URL completa com base pública", async () => {
    render(
      <AffiliatesAdminClient
        publicSignupBaseUrl="https://wa.devflow.test"
        initialAffiliates={[
          {
            id: AFF_ID,
            name: "Distribuidora",
            email: null,
            phone: null,
            commissionRate: 0.5,
            createdAt: new Date().toISOString(),
            clientCount: 0,
            totalEarned: 0,
            pendingTotal: 0,
            paidTotal: 0,
          },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId(`copy-ref-link-${AFF_ID}`));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`https://wa.devflow.test/signup?ref=${AFF_ID}`);
    });

    await waitFor(() => {
      expect(screen.getByTestId(`copy-ref-link-${AFF_ID}`)).toHaveTextContent("Link de indicação copiado");
    });
  });
});
