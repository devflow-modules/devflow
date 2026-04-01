/** Estados de retorno pós-checkout (query string) — testável sem React */
export type UpgradeReturnState = "success" | "cancel" | "idle";

export function upgradeReturnStateFromSearchParams(params: {
  success?: string | null;
  cancel?: string | null;
}): UpgradeReturnState {
  if (params.success === "1") return "success";
  if (params.cancel === "1") return "cancel";
  return "idle";
}
