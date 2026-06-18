import { ApplyFlowBadge, type ApplyFlowBadgeTone } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  careerMetrics,
  resolveCareerBuildMetadata,
  resolveCareerComponentStatuses,
  resolveCareerConfigBlockers,
  resolveCareerFeatureFlags,
  resolveCareerReadiness,
  resolveCareerRuntimeEnvironment,
  type CareerComponentStatusValue,
} from "@/lib/career-system";

/**
 * Internal diagnostic page. Development-only by default; in production it is only available
 * when `CAREER_SYSTEM_STATUS_ENABLED=true` (protection). It shows ONLY client-safe data:
 * environment, version, aggregated status, flags (no secrets), component enabled/configured
 * state, recent config error codes, and aggregated metrics. No sensitive payload is rendered.
 */
function isDiagnosticPageEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const environment = resolveCareerRuntimeEnvironment(env);
  if (environment === "production") {
    return env.CAREER_SYSTEM_STATUS_ENABLED === "true";
  }
  return true;
}

const COMPONENT_TONE: Record<CareerComponentStatusValue, ApplyFlowBadgeTone> = {
  ready: "success",
  disabled: "neutral",
  misconfigured: "warning",
};

export default function SystemStatusPage() {
  if (!isDiagnosticPageEnabled()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <ApplyFlowCard variant="muted" padding="md">
          <h1 className="text-sm font-semibold text-[color:var(--af-text)]">System status</h1>
          <p className="mt-2 text-[12px] text-[color:var(--af-text-muted)]">
            This diagnostic page is restricted in production. Set
            <code className="mx-1">CAREER_SYSTEM_STATUS_ENABLED=true</code>
            to enable it for operators.
          </p>
        </ApplyFlowCard>
      </main>
    );
  }

  const build = resolveCareerBuildMetadata();
  const flags = resolveCareerFeatureFlags();
  const components = resolveCareerComponentStatuses();
  const blockers = resolveCareerConfigBlockers();
  const readiness = resolveCareerReadiness();
  const metrics = careerMetrics.snapshot();

  const flagRows: Array<{ label: string; value: string }> = [
    { label: "Career agents", value: String(flags.careerAgentsEnabled) },
    { label: "LibreChat adapter", value: String(flags.librechatAdapterEnabled) },
    { label: "LibreChat transport", value: String(flags.librechatTransportEnabled) },
    { label: "Career LLM", value: `${flags.careerLlmEnabled} (${flags.careerLlmProvider})` },
    {
      label: "Career automation",
      value: `${flags.careerAutomationEnabled} (${flags.careerAutomationProvider})`,
    },
    { label: "OpenClaw", value: String(flags.openClawEnabled) },
    { label: "Pilot mode", value: String(flags.pilotMode) },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-10">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold text-[color:var(--af-text)]">Career Suite — system status</h1>
        <ApplyFlowBadge tone="intel">{build.environment}</ApplyFlowBadge>
        <ApplyFlowBadge tone={readiness.status === "ready" ? "success" : "danger"}>
          {readiness.status === "ready" ? "Ready" : "Not ready"}
        </ApplyFlowBadge>
      </header>

      <ApplyFlowCard variant="default" padding="md">
        <h2 className="text-xs font-semibold text-[color:var(--af-text)]">Build metadata</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-[color:var(--af-text-muted)] sm:grid-cols-4">
          <div>
            <dt className="font-medium text-[color:var(--af-text)]">Version</dt>
            <dd>{build.appVersion}</dd>
          </div>
          <div>
            <dt className="font-medium text-[color:var(--af-text)]">Commit</dt>
            <dd>{build.commitSha}</dd>
          </div>
          <div>
            <dt className="font-medium text-[color:var(--af-text)]">Built</dt>
            <dd>{build.buildTimestamp}</dd>
          </div>
          <div>
            <dt className="font-medium text-[color:var(--af-text)]">Environment</dt>
            <dd>{build.environment}</dd>
          </div>
        </dl>
      </ApplyFlowCard>

      <ApplyFlowCard variant="default" padding="md">
        <h2 className="text-xs font-semibold text-[color:var(--af-text)]">Components</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] text-[color:var(--af-text-muted)]">
          {components.map((component) => (
            <li key={component.component} className="flex flex-wrap items-center gap-2">
              <ApplyFlowBadge tone={COMPONENT_TONE[component.status]}>{component.status}</ApplyFlowBadge>
              <span className="font-medium text-[color:var(--af-text)]">{component.component}</span>
              <span>
                enabled={String(component.enabled)} · configured={String(component.configured)} ·
                required={String(component.required)}
                {component.errorCode ? ` · ${component.errorCode}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </ApplyFlowCard>

      <ApplyFlowCard variant="default" padding="md">
        <h2 className="text-xs font-semibold text-[color:var(--af-text)]">Feature flags (no secrets)</h2>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-[12px] text-[color:var(--af-text-muted)] sm:grid-cols-2">
          {flagRows.map((row) => (
            <li key={row.label}>
              <span className="font-medium text-[color:var(--af-text)]">{row.label}:</span> {row.value}
            </li>
          ))}
        </ul>
      </ApplyFlowCard>

      <ApplyFlowCard variant={blockers.length > 0 ? "warning" : "default"} padding="md">
        <h2 className="text-xs font-semibold text-[color:var(--af-text)]">Recent config errors</h2>
        {blockers.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[12px] text-amber-200/90">
            {blockers.map((blocker) => (
              <li key={blocker.component}>
                {blocker.component}: {blocker.errorCode}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-[color:var(--af-text-muted)]">No config blockers.</p>
        )}
      </ApplyFlowCard>

      <ApplyFlowCard variant="default" padding="md">
        <h2 className="text-xs font-semibold text-[color:var(--af-text)]">Aggregated metrics (in-memory)</h2>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-[12px] text-[color:var(--af-text-muted)] sm:grid-cols-3">
          {Object.entries(metrics).map(([name, value]) => (
            <li key={name}>
              <span className="font-medium text-[color:var(--af-text)]">{name}:</span> {value}
            </li>
          ))}
        </ul>
      </ApplyFlowCard>
    </main>
  );
}
