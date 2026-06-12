import { describe, expect, it } from "vitest";
import { mapNangoInteractionToConnectEvent } from "./provider-connection-runtime-status";

describe("mapNangoInteractionToConnectEvent", () => {
  it("maps connect UI interaction states to runtime connect events", () => {
    expect(mapNangoInteractionToConnectEvent("idle")).toBe("idle");
    expect(mapNangoInteractionToConnectEvent("starting")).toBe("connect_start");
    expect(mapNangoInteractionToConnectEvent("completed")).toBe("connect_success");
    expect(mapNangoInteractionToConnectEvent("cancelled")).toBe("connect_close");
    expect(mapNangoInteractionToConnectEvent("error")).toBe("connect_error");
  });
});
