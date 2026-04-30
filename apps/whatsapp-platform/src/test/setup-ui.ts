import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = function () {} as typeof Element.prototype.scrollIntoView;
}

/** Viewport fictício “desktop largo” para hooks que usam `matchMedia` (ex.: ChatWindow). */
if (typeof window !== "undefined") {
  const viewportWidth = 1440;
  window.matchMedia = vi.fn((query: string) => {
    const m = /min-width:\s*(\d+)px/.exec(query);
    const bp = m ? Number(m[1]) : 0;
    return {
      matches: viewportWidth >= bp,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as typeof window.matchMedia;
}
