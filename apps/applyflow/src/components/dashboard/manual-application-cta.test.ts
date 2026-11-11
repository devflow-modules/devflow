import { describe, expect, it, vi } from "vitest";

import {
  MANUAL_APPLICATION_CTA_APPLY_FORM_LABEL,
  MANUAL_APPLICATION_CTA_ATS_JOB_LABEL,
  MANUAL_APPLICATION_CTA_LISTING_LABEL,
} from "./job-inbox-content";
import {
  isProvenAtsApplyFormUrl,
  isSafeExternalJobUrl,
  openManualApplicationUrl,
  resolveManualApplicationCta,
} from "./manual-application-cta";

describe("resolveManualApplicationCta", () => {
  it("labels known ATS job pages as recruitment portal (not official site claim)", () => {
    const cta = resolveManualApplicationCta({
      url: "https://jobs.ashbyhq.com/wagmo/dbf4dc55",
      source: "paste",
    });
    expect(cta.kind).toBe("ats_job");
    expect(cta.label).toBe(MANUAL_APPLICATION_CTA_ATS_JOB_LABEL);
    expect(cta.url).toBe("https://jobs.ashbyhq.com/wagmo/dbf4dc55");
  });

  it("labels proven ATS apply-form paths as formulário de candidatura", () => {
    const workable = resolveManualApplicationCta({
      url: "https://apply.workable.com/acme/j/ABCD1234/",
      source: "paste",
    });
    expect(workable.kind).toBe("apply_form");
    expect(workable.label).toBe(MANUAL_APPLICATION_CTA_APPLY_FORM_LABEL);

    const leverApply = resolveManualApplicationCta({
      url: "https://jobs.lever.co/acme/role-slug/apply",
      source: "paste",
    });
    expect(leverApply.kind).toBe("apply_form");
    expect(leverApply.label).toBe(MANUAL_APPLICATION_CTA_APPLY_FORM_LABEL);
  });

  it("does not treat generic jobs/career path words as proven apply forms", () => {
    expect(isProvenAtsApplyFormUrl(new URL("https://jobs.ashbyhq.com/acme/uuid"))).toBe(false);
    expect(isProvenAtsApplyFormUrl(new URL("https://boards.greenhouse.io/acme/jobs/123"))).toBe(false);
    expect(
      resolveManualApplicationCta({
        url: "https://example.com/careers/apply-now",
        source: "paste",
      }).kind,
    ).toBe("listing");
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
