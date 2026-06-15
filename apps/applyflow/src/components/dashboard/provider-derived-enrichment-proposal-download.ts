export type DownloadTextFileDependencies = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => HTMLAnchorElement;
  appendChild: (node: HTMLAnchorElement) => void;
  removeChild: (node: HTMLAnchorElement) => void;
};

const defaultDependencies: DownloadTextFileDependencies = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => document.createElement("a"),
  appendChild: (node) => document.body.appendChild(node),
  removeChild: (node) => document.body.removeChild(node),
};

export function downloadProviderDerivedEnrichmentProposal(
  input: {
    filename: string;
    json: string;
  },
  dependencies: DownloadTextFileDependencies = defaultDependencies,
): void {
  const blob = new Blob([input.json], { type: "application/json" });
  const url = dependencies.createObjectURL(blob);
  const anchor = dependencies.createAnchor();

  anchor.href = url;
  anchor.download = input.filename;
  anchor.style.display = "none";

  dependencies.appendChild(anchor);
  anchor.click();
  dependencies.removeChild(anchor);
  dependencies.revokeObjectURL(url);
}
