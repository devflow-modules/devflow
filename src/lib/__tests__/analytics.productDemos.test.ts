import { describe, it, expect, vi, beforeEach } from "vitest";

const mockedTrack = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: mockedTrack,
}));

import { trackOpenDemo, trackTryProduct } from "../analytics";

describe("analytics — demos de produto", () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it("trackOpenDemo envia open_demo com product e surface", () => {
    trackOpenDemo({ product: "funklab", surface: "hero" });
    expect(mockedTrack).toHaveBeenCalledWith("open_demo", {
      product: "funklab",
      surface: "hero",
    });
  });

  it("trackTryProduct envia try_product com destination", () => {
    trackTryProduct({
      product: "investigamais",
      surface: "cta",
      destination: "https://example.com",
    });
    expect(mockedTrack).toHaveBeenCalledWith("try_product", {
      product: "investigamais",
      surface: "cta",
      destination: "https://example.com",
      cta_variant: "primary",
    });
  });

  it("trackTryProduct aceita cta_variant secondary", () => {
    trackTryProduct({
      product: "funklab",
      surface: "footer",
      destination: "https://x.test",
      cta_variant: "secondary",
    });
    expect(mockedTrack).toHaveBeenCalledWith("try_product", {
      product: "funklab",
      surface: "footer",
      destination: "https://x.test",
      cta_variant: "secondary",
    });
  });
});
