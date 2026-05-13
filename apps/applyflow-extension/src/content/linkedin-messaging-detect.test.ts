/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";

import { detectLinkedInMessagingChromeVisible } from "./linkedin-messaging-detect.js";

describe("detectLinkedInMessagingChromeVisible", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("sem elementos → false", () => {
    expect(detectLinkedInMessagingChromeVisible()).toBe(false);
  });

  it("com raiz de mensagens visível → true", () => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
    const el = document.createElement("div");
    el.setAttribute("data-test-msg-ui-root", "1");
    document.body.appendChild(el);
    el.getBoundingClientRect = () =>
      ({
        width: 120,
        height: 100,
        top: 12,
        left: 12,
        right: 132,
        bottom: 112,
        x: 12,
        y: 12,
        toJSON: () => "",
      }) as DOMRect;
    expect(detectLinkedInMessagingChromeVisible()).toBe(true);
  });
});
