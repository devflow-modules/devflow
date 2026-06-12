/**
 * Injectable Nango Connect UI wrapper.
 * Opens Connect UI with a short-lived client-safe session token only.
 */

export type NangoConnectUiEventType = "connect" | "close" | "error";

export type NangoConnectUiEvent = {
  type: NangoConnectUiEventType;
};

export type OpenNangoConnectUiInput = {
  sessionToken: string;
  onEvent: (event: NangoConnectUiEvent) => void;
};

export type OpenNangoConnectUiFn = (input: OpenNangoConnectUiInput) => void | Promise<void>;

export async function openNangoConnectUiWithFrontendSdk(
  input: OpenNangoConnectUiInput,
): Promise<void> {
  const { default: Nango } = await import("@nangohq/frontend");
  const nango = new Nango();
  const connect = nango.openConnectUI({
    onEvent: (event) => {
      if (event.type === "connect") {
        input.onEvent({ type: "connect" });
        return;
      }

      if (event.type === "close") {
        input.onEvent({ type: "close" });
      }
    },
  });

  connect.setSessionToken(input.sessionToken);
}
