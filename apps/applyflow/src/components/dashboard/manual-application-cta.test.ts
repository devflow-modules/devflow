import { describe, expect, it, vi } from "vitest";

import {
  MANUAL_APPLICATION_CTA_LISTING_LABEL,
  MANUAL_APPLICATION_CTA_OFFICIAL_LABEL,
} from "./job-inbox-content";
import {
  isSafeExternalJobUrl,
  openManualApplicationUrl,
  resolveManualApplicationCta,
} from "./manual-application-cta";

describe("resolveManualApplicationCta", () => {
  it("labels known ATS hosts as official apply", () => {
    const cta = resolveManualApplicationCta({
      url: "https://jobs.ashbyhq.com/wagmo/dbf4dc55",
      source: "paste",
    });
    expect(cta.kind).toBe("official");
    expect(cta.label).toBe(MANUAL_APPLICATION_CTA_OFFICIAL_LABEL);
    expect(cta.url).toBe("https://jobs.ashbyhq.com/wagmo/dbf4dc55");
  });

  it("labels aggregator/listing hosts as Abrir anúncio", () => {
    const cta = resolveManualApplicationCta({
      url: "https://remoteok.com/remote-jobs/1",
      source: "remoteok",
    });
    expect(cta.kind).toBe("listing");
    expect(cta.label).toBe(MANUAL_APPLICATION_CTA_LISTING_LABEL);
  });

  it("blocks invalid or non-http(s) URLs", () => {
    expect(resolveManualApplicationCta({ url: "javascript:alert(1)" }).kind).toBe("unavailable");
    expect(resolveManualApplicationCta({ url: "/jobs/local" }).kind).toBe("unavailable");
    expect(resolveManualApplicationCta({ url: "ftp://example.com/job" }).kind).toBe("unavailable");
    expect(resolveManualApplicationCta({ url: "" }).kind).toBe("unavailable");
    expect(isSafeExternalJobUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalJobUrl("https://example.com/job")).toBe(true);
  });
});

describe("openManualApplicationUrl", () => {
  it("opens http(s) with noopener,noreferrer and does not open unsafe URLs", () => {
    const openImpl = vi.fn(() => null);
    expect(openManualApplicationUrl("https://example.com/jobs/1", openImpl)).toBe(true);
    expect(openImpl).toHaveBeenCalledWith("https://example.com/jobs/1", "_blank", "noopener,noreferrer");

    openImpl.mockClear();
    expect(openManualApplicationUrl("javascript:alert(1)", openImpl)).toBe(false);
    expect(openImpl).not.toHaveBeenCalled();
  });

  it("clears opener when window.open returns a handle", () => {
    const fakeWindow = { opener: {} as Window | null };
    const openImpl = vi.fn(() => fakeWindow as unknown as Window);
    expect(openManualApplicationUrl("https://boards.greenhouse.io/acme/jobs/1", openImpl)).toBe(true);
    expect(fakeWindow.opener).toBeNull();
  });
});
