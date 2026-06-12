import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createProviderConnectionVerificationResult,
  createProviderRuntimeConnectionStatus,
} from "@devflow/career-sync";
import {
  PROVIDER_CONNECTION_STATUS_TITLE,
  PROVIDER_VERIFY_CONNECTION_LABEL,
  ProviderConnectionStatusPanel,
} from "./provider-connection-status-panel";

const updatedAt = "2026-06-12T12:00:00.000Z";
const checkedAt = "2026-06-12T12:05:00.000Z";

describe("ProviderConnectionStatusPanel", () => {
  it("renders initial not_connected status with server verification not checked", () => {
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
    expect(html).toContain("not checked");
    expect(html).toContain("Connection flow:");
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
    expect(html).toContain("in progress");
    expect(html).toContain("Calendar");
  });

  it("renders connected local status with no-import message", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(<ProviderConnectionStatusPanel status={status} />);

    expect(html).toContain("connected");
    expect(html).toContain("completed");
    expect(html).toContain("No Gmail or Calendar data has been imported yet");
  });

  it("renders server verification connected separately from local state", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const verificationResult = createProviderConnectionVerificationResult({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      checkedAt,
    });
    const html = renderToStaticMarkup(
      <ProviderConnectionStatusPanel status={status} verificationResult={verificationResult} />,
    );

    expect(html).toContain("Server verification:");
    expect(html).toContain("connected");
    expect(html).toContain("No Gmail or Calendar data has been imported.");
  });

  it("shows Verify connection button only when local flow is connected and consent is given", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(
      <ProviderConnectionStatusPanel
        status={status}
        explicitConsentChecked
        onVerifyConnection={() => undefined}
      />,
    );

    expect(html).toContain(PROVIDER_VERIFY_CONNECTION_LABEL);
  });

  it("does not show Verify connection button before local connect completes", () => {
    const status = createProviderRuntimeConnectionStatus({
      provider: "gmail",
      runtime: "nango",
      state: "not_connected",
      updatedAt,
    });
    const html = renderToStaticMarkup(
      <ProviderConnectionStatusPanel
        status={status}
        explicitConsentChecked
        onVerifyConnection={() => undefined}
      />,
    );

    expect(html).not.toContain(PROVIDER_VERIFY_CONNECTION_LABEL);
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
