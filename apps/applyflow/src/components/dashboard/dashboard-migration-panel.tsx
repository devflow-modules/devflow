"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  prepareMigration,
  resumeMigration,
  runMigration,
  type MigrationCoordinatorErrorCode,
  type MigrationCoordinatorState,
} from "@/lib/persistence-v2/migration/migration-coordinator";
import type { MigrationPrepareErrorCode } from "@/lib/persistence-v2/migration/migration-prepare";

import {
  isMigrationBlockedPrepare,
  isMigrationRetrySafe,
  migrationCoordinatorUserMessage,
  migrationPrepareUserMessage,
} from "./migration-ux-messages";

export type MigrationSummaryCounts = {
  jobs: number;
  applications: number;
  linkedApplications: number;
  standaloneApplications: number;
};

type PreviewOk = {
  kind: "ready";
  counts: MigrationSummaryCounts;
};

type PreviewBlocked = {
  kind: "blocked";
  code: MigrationPrepareErrorCode;
  message: string;
};

type PreviewEmpty = {
  kind: "empty";
};

type PreviewState = PreviewOk | PreviewBlocked | PreviewEmpty | { kind: "loading" };

type FailureState = {
  code: MigrationCoordinatorErrorCode;
  message: string;
  conflicts?: Array<{ entityType: string; entityId: string; reason: string }>;
};

function summarizeFromPrepare(): PreviewState {
  const prep = prepareMigration();
  if (!prep.ok) {
    return {
      kind: "blocked",
      code: prep.code,
      message: migrationPrepareUserMessage(prep.code),
    };
  }
  if (prep.empty) {
    return { kind: "empty" };
  }
  const linkedApplications = prep.bundle.applications.filter(
    (app) => typeof app.sourceJobId === "string" && app.sourceJobId.trim().length > 0,
  ).length;
  return {
    kind: "ready",
    counts: {
      jobs: prep.bundle.jobs.length,
      applications: prep.bundle.applications.length,
      linkedApplications,
      standaloneApplications: prep.bundle.applications.length - linkedApplications,
    },
  };
}

export function DashboardMigrationPanel({
  onComplete,
  fetchImpl,
}: {
  /** Called only after coordinator success with validated proof + marker. */
  onComplete: () => void;
  fetchImpl?: typeof fetch;
}) {
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });
  const [phase, setPhase] = useState<MigrationCoordinatorState>("idle");
  const [failure, setFailure] = useState<FailureState | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setPreview(summarizeFromPrepare());
  }, []);

  const busy = phase === "preparing" || phase === "migrating";

  const execute = useCallback(
    async (mode: "run" | "resume") => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setFailure(null);
      setAuthRequired(false);
      setPhase("preparing");
      // Allow React to paint preparing before migrating.
      await Promise.resolve();
      setPhase("migrating");
      try {
        const result =
          mode === "resume"
            ? await resumeMigration({ fetchImpl })
            : await runMigration({ fetchImpl });
        if (result.ok) {
          setPhase("completed");
          onComplete();
          return;
        }
        setPhase("failed");
        if (result.code === "auth_required" || result.code === "auth_not_configured") {
          setAuthRequired(true);
        }
        setFailure({
          code: result.code,
          message: migrationCoordinatorUserMessage(result.code),
          conflicts: result.conflicts,
        });
      } finally {
        inFlightRef.current = false;
      }
    },
    [fetchImpl, onComplete],
  );

  if (preview.kind === "loading") {
    return (
      <ApplyFlowCard variant="muted" padding="lg">
        <p className="text-sm text-[color:var(--af-text-muted)]" role="status" aria-live="polite">
          A preparar o resumo da migração…
        </p>
      </ApplyFlowCard>
    );
  }

  if (preview.kind === "empty") {
    return (
      <ApplyFlowCard variant="muted" padding="lg">
        <p className="text-sm font-medium text-[color:var(--af-text)]">Nada a migrar</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          Não há vagas ou candidaturas locais para copiar para a conta.
        </p>
      </ApplyFlowCard>
    );
  }

  if (preview.kind === "blocked") {
    const cardVariant =
      preview.code === "migration_dataset_too_large" || isMigrationBlockedPrepare(preview.code)
        ? "warning"
        : "danger";
    return (
      <ApplyFlowCard variant={cardVariant} padding="lg" className="mx-auto max-w-2xl">
        <h2 className="text-base font-semibold text-[color:var(--af-text)]">Migração bloqueada</h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]" role="alert">
          {preview.message}
        </p>
        <p className="mt-3 text-sm text-[color:var(--af-text-muted)]">
          Os dados locais deste navegador foram preservados. Nada foi apagado.
        </p>
      </ApplyFlowCard>
    );
  }

  const counts = preview.counts;
  const showRetry = failure != null && isMigrationRetrySafe(failure.code) && !authRequired;
  const migrating = phase === "preparing" || phase === "migrating";

  return (
    <ApplyFlowCard variant="muted" padding="lg" className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[color:var(--af-text)]">Migrar dados para a conta</h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--af-text-muted)]">
          Foram detectados dados locais neste navegador. O ApplyFlow V2 guarda vagas e candidaturas de forma
          segura na sua conta. A migração copia o histórico canónico para a conta; os dados locais não serão
          apagados. Se a migração for interrompida, pode tentar de novo com segurança.
        </p>
      </div>

      <div
        className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface)] p-4"
        aria-label="Resumo antes da migração"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--af-text-muted)]">
          Resumo
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[color:var(--af-text)]">
          <li>
            Vagas detectadas: <span className="font-medium tabular-nums">{counts.jobs}</span>
          </li>
          <li>
            Candidaturas detectadas:{" "}
            <span className="font-medium tabular-nums">{counts.applications}</span>
          </li>
          {counts.applications > 0 ? (
            <>
              <li className="text-[color:var(--af-text-muted)]">
                Ligadas a vagas: <span className="tabular-nums">{counts.linkedApplications}</span>
              </li>
              <li className="text-[color:var(--af-text-muted)]">
                Independentes: <span className="tabular-nums">{counts.standaloneApplications}</span>
              </li>
            </>
          ) : null}
        </ul>
      </div>

      {migrating ? (
        <p className="text-sm text-[color:var(--af-text-muted)]" role="status" aria-live="polite">
          {phase === "preparing" ? "A preparar a migração…" : "A migrar dados para a conta…"}
        </p>
      ) : null}

      {authRequired ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-[color:var(--af-text)]">
            {failure?.message ?? migrationCoordinatorUserMessage("auth_required")}
          </p>
          <Link href="/login" className="inline-block text-sm text-emerald-300 hover:text-emerald-200">
            Entrar
          </Link>
        </div>
      ) : null}

      {failure && !authRequired ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-[color:var(--af-text)]">{failure.message}</p>
          {failure.code === "migration_conflict" && failure.conflicts && failure.conflicts.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-[color:var(--af-text-muted)]">
              {failure.conflicts.slice(0, 8).map((c) => (
                <li key={`${c.entityType}:${c.entityId}`}>
                  {c.entityType}: conflito (dados da conta preservados)
                </li>
              ))}
            </ul>
          ) : null}
          {failure.code === "marker_write_failed" ? (
            <p className="text-sm text-[color:var(--af-text-muted)]">
              A migração no servidor não falhou — falta só confirmar no navegador.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-1">
        {!failure && !authRequired ? (
          <ApplyFlowButton
            variant="primary"
            size="md"
            disabled={busy}
            aria-busy={migrating}
            onClick={() => {
              void execute("run");
            }}
          >
            Migrar dados para V2
          </ApplyFlowButton>
        ) : null}
        {showRetry ? (
          <ApplyFlowButton
            variant="primary"
            size="md"
            disabled={busy}
            aria-busy={migrating}
            onClick={() => {
              void execute("resume");
            }}
          >
            Tentar novamente
          </ApplyFlowButton>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-[color:var(--af-text-muted)]">
        A migração só começa quando você confirmar. Os dados locais permanecem neste navegador após a cópia
        para a conta.
      </p>
    </ApplyFlowCard>
  );
}
