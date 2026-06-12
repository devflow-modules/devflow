import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createProviderRuntimeConnectionStatus } from "@devflow/career-sync";
import {
  PROVIDER_CONNECTION_STATUS_TITLE,
  ProviderConnectionStatusPanel,
} from "./provider-connection-status-panel";

const updatedAt = "2026-06-12T12:00:00.000Z";

describe("ProviderConnectionStatusPanel", () => {
  it("renders initial not_connected status", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "not_connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).toContain(PROVIDER_CONNECTION_STATUS_TITLE);
    expect(html).toContain("Gmail");
    expect(html).toContain("nango");
    expect(html).toContain("not_connected");
    expect(html).toMatch(/Can sync:[\s\S]*No/);
    expect(html).toMatch(/Imports provider data:[\s\S]*No/);
    expect(html).toMatch(/Stores browser token:[\s\S]*No/);
    expect(html).toContain("CareerBundle affected:");
  });

  it("renders connecting status", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "calendar",
      runtime: "nango",
      state: "connecting",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).toContain("connecting");
    expect(html).toContain("Calendar");
  });

  it("renders connected status with no-import message", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).toContain("connected");
    expect(html).toContain("No Gmail or Calendar data has been imported yet");
  });

  it("renders error status with local failure message", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "error",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).toContain("error");
    expect(html).toContain("No provider data was imported or stored");
  });

  it("does not render tokens or session values", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).not.toMatch(/access_token/);
    expect(html).not.toMatch(/refresh_token/);
    expect(html).not.toMatch(/connectSessionToken/);
    expect(html).not.toMatch(/NANGO_SECRET_KEY/);
  });
});
