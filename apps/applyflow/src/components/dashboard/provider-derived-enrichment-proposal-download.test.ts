import { describe, expect, it, vi } from "vitest";
import {
  downloadProviderDerivedEnrichmentProposal,
  type DownloadTextFileDependencies,
} from "./provider-derived-enrichment-proposal-download";

describe("downloadProviderDerivedEnrichmentProposal", () => {
  it("creates application/json blob and triggers one download click", () => {
    const createObjectURL = vi.fn(() => "blob:proposal");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = {
      href: "",
      download: "",
      style: { display: "" },
      click,
    } as unknown as HTMLAnchorElement;
    const createAnchor = vi.fn(() => anchor);
    const appendChild = vi.fn();
    const removeChild = vi.fn();

    const dependencies: DownloadTextFileDependencies = {
      createObjectURL,
      revokeObjectURL,
      createAnchor,
      appendChild,
      removeChild,
    };

    downloadProviderDerivedEnrichmentProposal(
      {
        filename: "devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json",
        json: '{"schema":"devflow.provider-derived-enrichment-proposal"}\n',
      },
      dependencies,
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(createAnchor).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe("devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:proposal");
  });
});
