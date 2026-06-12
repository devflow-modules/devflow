import type { ProviderRuntimeConnectEvent } from "@devflow/career-sync";
import type { NangoConnectUiInteractionStatus } from "./provider-nango-connect-ui";

export function mapNangoInteractionToConnectEvent(
  interactionStatus: NangoConnectUiInteractionStatus,
): ProviderRuntimeConnectEvent {
  switch (interactionStatus) {
    case "starting":
      return "connect_start";
    case "completed":
      return "connect_success";
    case "cancelled":
      return "connect_close";
    case "error":
      return "connect_error";
    default:
      return "idle";
  }
}
