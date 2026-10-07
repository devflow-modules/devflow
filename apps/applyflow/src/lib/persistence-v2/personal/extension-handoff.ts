const APPLYFLOW_EXTENSION_ID = "mjigahpnpgcopnjfofcpopkaehohfknh";

type ChromeRuntime = {
  sendMessage: (extensionId: string, message: unknown, callback?: () => void) => void;
  lastError?: { message?: string };
};

function extensionRuntime(): ChromeRuntime | null {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!runtime?.sendMessage) return null;
  return runtime;
}

export function deliverExtensionGrant(grant: {
  accountId: string;
  token: string;
  expiresAt: string;
}): void {
  const runtime = extensionRuntime();
  if (!runtime) return;
  runtime.sendMessage(
    APPLYFLOW_EXTENSION_ID,
    {
      type: "APPLYFLOW_BIND_GRANT",
      accountId: grant.accountId,
      expiresAt: grant.expiresAt,
      token: grant.token,
    },
    () => {
      void extensionRuntime()?.lastError;
    },
  );
}

export function clearInstalledExtensionGrant(): void {
  const runtime = extensionRuntime();
  if (!runtime) return;
  runtime.sendMessage(APPLYFLOW_EXTENSION_ID, { type: "APPLYFLOW_CLEAR_GRANT" }, () => {
    void extensionRuntime()?.lastError;
  });
}
