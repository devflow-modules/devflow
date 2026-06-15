import { describe, expect, it, vi } from "vitest";
import {
  downloadProviderDerivedEnrichmentProposal,
  type DownloadTextFileDependencies,
} from "./provider-derived-enrichment-proposal-download";

function createDependencies(overrides: Partial<DownloadTextFileDependencies> = {}) {
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
    ...overrides,
  };

  return {
    dependencies,
    createObjectURL,
    revokeObjectURL,
    click,
    anchor,
    createAnchor,
    appendChild,
    removeChild,
  };
}

const downloadInput = {
  filename: "devflow-enrichment-proposal-2026-06-15T18-30-00-000Z.json",
  json: '{"schema":"devflow.provider-derived-enrichment-proposal"}\n',
};

describe("downloadProviderDerivedEnrichmentProposal", () => {
  it("creates application/json blob and triggers one download click", () => {
    const { dependencies, createObjectURL, createAnchor, click, anchor, appendChild, removeChild, revokeObjectURL } =
      createDependencies();

    downloadProviderDerivedEnrichmentProposal(downloadInput, dependencies);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/json");
    expect(createAnchor).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe(downloadInput.filename);
    expect(anchor.href).toBe("blob:proposal");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:proposal");
  });

  it("passes exact json content to the blob", async () => {
    const { dependencies, createObjectURL } = createDependencies();

    downloadProviderDerivedEnrichmentProposal(downloadInput, dependencies);

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(await blob.text()).toBe(downloadInput.json);
  });

  it("revokes object URL when click throws", () => {
    const click = vi.fn(() => {
      throw new Error("click failed");
    });
    const { dependencies, revokeObjectURL } = createDependencies();
    dependencies.createAnchor = vi.fn(
      () =>
        ({
          href: "",
          download: "",
          style: { display: "" },
          click,
        }) as unknown as HTMLAnchorElement,
    );

    expect(() => downloadProviderDerivedEnrichmentProposal(downloadInput, dependencies)).toThrow("click failed");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:proposal");
  });

  it("does not revoke object URL when createObjectURL throws", () => {
    const createObjectURL = vi.fn(() => {
      throw new Error("createObjectURL failed");
    });
    const revokeObjectURL = vi.fn();
    const { dependencies } = createDependencies({ createObjectURL, revokeObjectURL });

    expect(() => downloadProviderDerivedEnrichmentProposal(downloadInput, dependencies)).toThrow(
      "createObjectURL failed",
    );
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("does not leave anchor in DOM after download", () => {
    const { dependencies, appendChild, removeChild } = createDependencies();

    downloadProviderDerivedEnrichmentProposal(downloadInput, dependencies);

    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledTimes(1);
  });
});
