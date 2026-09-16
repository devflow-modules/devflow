import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobsStorageRecoveryBanner, ResumeLibraryRecoveryBanner } from "./dashboard-storage-recovery";
import {
  JOBS_STORAGE_MALFORMED_DESCRIPTION,
  JOBS_STORAGE_PARTIAL_TITLE,
  JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION,
  JOBS_STORAGE_UNREADABLE_TITLE,
  RESUME_STORAGE_UNREADABLE_TITLE,
  jobsStoragePartialDescription,
} from "./dashboard-storage-recovery-content";

describe("dashboard storage recovery banners", () => {
  it("comunica jobs parciais sem fingir inbox vazio", () => {
    const html = renderToStaticMarkup(
      <JobsStorageRecoveryBanner status="partial" ignoredCount={1} onDiscard={() => undefined} />,
    );
    expect(html).toContain(JOBS_STORAGE_PARTIAL_TITLE);
    expect(html).toContain(jobsStoragePartialDescription(1));
    expect(html).toContain('role="alert"');
  });

  it("distingue JSON quebrado de versão desconhecida", () => {
    const malformed = renderToStaticMarkup(
      <JobsStorageRecoveryBanner
        status="unreadable"
        ignoredCount={0}
        reason="malformed-json"
        onDiscard={() => undefined}
      />,
    );
    const unknown = renderToStaticMarkup(
      <JobsStorageRecoveryBanner
        status="unreadable"
        ignoredCount={0}
        reason="unknown-version"
        onDiscard={() => undefined}
      />,
    );
    expect(malformed).toContain(JOBS_STORAGE_UNREADABLE_TITLE);
    expect(malformed).toContain(JOBS_STORAGE_MALFORMED_DESCRIPTION);
    expect(unknown).toContain(JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION);
    expect(malformed).not.toContain(JOBS_STORAGE_UNKNOWN_VERSION_DESCRIPTION);
  });

  it("recovery de currículos não apresenta Gustavo nem primeira visita", () => {
    const html = renderToStaticMarkup(
      <ResumeLibraryRecoveryBanner onDiscard={() => undefined} onImportProfileFile={() => undefined} />,
    );
    expect(html).toContain(RESUME_STORAGE_UNREADABLE_TITLE);
    expect(html).not.toMatch(/Gustavo/i);
    expect(html).not.toContain("Nenhum currículo configurado");
  });
});
