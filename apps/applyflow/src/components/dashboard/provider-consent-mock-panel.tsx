import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  PROVIDER_CONSENT_MOCK_ACTIONS,
  PROVIDER_CONSENT_MOCK_BADGE,
  PROVIDER_CONSENT_MOCK_BOUNDARIES,
  PROVIDER_CONSENT_MOCK_DESCRIPTION,
  PROVIDER_CONSENT_MOCK_PROVIDERS,
  PROVIDER_CONSENT_MOCK_RUNTIME,
  PROVIDER_CONSENT_MOCK_TITLE,
} from "./provider-consent-mock-content";

/**
 * Read-only mock panel for future provider consent flow.
 * Does not connect providers, request OAuth, store tokens, or fetch Gmail/Calendar data.
 */
export function ProviderConsentMockPanel() {
  return (
    <ApplyFlowCard variant="muted" padding="md" className="border border-[color:var(--af-border-strong)]/80">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_TITLE}</h3>
            <ApplyFlowBadge tone="warning">{PROVIDER_CONSENT_MOCK_BADGE}</ApplyFlowBadge>
            <p className="max-w-2xl text-xs leading-relaxed text-[color:var(--af-text-muted)]">
              {PROVIDER_CONSENT_MOCK_DESCRIPTION}
            </p>
          </div>
          <p className="shrink-0 text-[11px] text-[color:var(--af-text-muted)]">
            Runtime: <span className="font-medium text-[color:var(--af-text)]">Sandbox</span> /{" "}
            <span className="font-medium text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_RUNTIME}</span>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDER_CONSENT_MOCK_PROVIDERS.map((provider) => (
            <ApplyFlowCard key={provider.id} variant="default" padding="sm" className="bg-[color:var(--af-surface)]/60">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[color:var(--af-text)]">{provider.label}</h4>
                  <ApplyFlowBadge tone="neutral">Status: {provider.status}</ApplyFlowBadge>
                </div>
                <p className="text-[11px] text-[color:var(--af-text-muted)]">
                  Runtime: <span className="text-[color:var(--af-text)]">{PROVIDER_CONSENT_MOCK_RUNTIME}</span>
                </p>
                <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                  <span className="font-medium text-emerald-200/90">Allowed derived signals:</span>{" "}
                  {provider.allowedSignals}
                </p>
                <p className="text-[11px] leading-snug text-[color:var(--af-text-muted)]">
                  <span className="font-medium text-amber-200/90">Never stored:</span> {provider.neverStored}
                </p>
              </div>
            </ApplyFlowCard>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
            Scopes preview · Data boundaries
          </p>
          <ul className="list-inside list-disc space-y-1 text-[11px] leading-snug text-[color:var(--af-text-muted)]">
            {PROVIDER_CONSENT_MOCK_BOUNDARIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {PROVIDER_CONSENT_MOCK_ACTIONS.map((action) => (
            <ApplyFlowButton
              key={action.id}
              type="button"
              variant="outlineBrand"
              size="sm"
              disabled
              aria-disabled="true"
              title="Coming soon — mock panel only"
              className="cursor-not-allowed opacity-60"
            >
              {action.label}
            </ApplyFlowButton>
          ))}
        </div>
      </div>
    </ApplyFlowCard>
  );
}
