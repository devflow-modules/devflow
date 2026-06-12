import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import type { ProviderRuntimeConnectionStatus } from "@devflow/career-sync";
import { formatProviderCapabilityYesNo } from "./provider-consent-mock-data";

export const PROVIDER_CONNECTION_STATUS_TITLE = "Provider connection status";

const PROVIDER_LABELS = {
  gmail: "Gmail",
  calendar: "Calendar",
} as const;

/**
 * Read-only client-safe provider runtime connection status panel.
 * Does not import provider data or expose tokens.
 */

export function ProviderConnectionStatusPanel({
  status,
}: {
  status: ProviderRuntimeConnectionStatus;
}) {
  const providerLabel = PROVIDER_LABELS[status.provider];

  return (
    <ApplyFlowCard
      variant="default"
      padding="sm"
      className="border border-violet-500/25 bg-violet-950/10"
      data-testid="provider-connection-status-panel"
    >
      <div className="space-y-2 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
        <p className="text-xs font-semibold text-violet-100/95">{PROVIDER_CONNECTION_STATUS_TITLE}</p>
        <p>
          Provider:{" "}
          <span className="font-medium text-[color:var(--af-text)]">{providerLabel}</span>
        </p>
        <p>
          Runtime:{" "}
          <span className="font-medium capitalize text-[color:var(--af-text)]">{status.runtime}</span>
        </p>
        <p>
          State:{" "}
          <span className="font-medium text-[color:var(--af-text)]" data-testid="provider-connection-state">
            {status.state}
          </span>
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <p>
            Can sync:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatProviderCapabilityYesNo(status.canSync)}
            </span>
          </p>
          <p>
            Imports provider data:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatProviderCapabilityYesNo(status.canImportProviderData)}
            </span>
          </p>
          <p>
            Stores raw provider payload:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatProviderCapabilityYesNo(status.canPersistProviderPayload)}
            </span>
          </p>
          <p>
            Stores browser token:{" "}
            <span className="font-medium text-[color:var(--af-text)]">
              {formatProviderCapabilityYesNo(status.hasToken)}
            </span>
          </p>
        </div>
        <p>
          CareerBundle affected:{" "}
          <span className="font-medium text-[color:var(--af-text)]">No</span>
        </p>
        {status.messages.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-[color:var(--af-text-muted)]">
            {status.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
        {status.warnings.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-amber-200/90">
            {status.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </ApplyFlowCard>
  );
}
