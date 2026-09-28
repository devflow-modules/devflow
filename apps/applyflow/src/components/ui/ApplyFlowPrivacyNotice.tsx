import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import {
  persistencePrivacyCopyForMode,
  type ApplyFlowPersistencePrivacyMode,
} from "@/lib/persistence-v2/dashboard/persistence-privacy-copy";
import type { ReactNode } from "react";

export function ApplyFlowPrivacyNotice({
  children,
  mode = "v1",
}: {
  children?: ReactNode;
  /** Authoritative persistence mode. Defaults to v1 for landing/anonymous surfaces. */
  mode?: ApplyFlowPersistencePrivacyMode;
}) {
  const copy = persistencePrivacyCopyForMode(mode);
  return (
    <ApplyFlowCard variant="success" padding="md" data-testid={`persistence-privacy-${mode}`}>
      <p className="text-sm leading-relaxed text-emerald-100/95">
        {children ?? (
          <>
            <strong className="text-emerald-300">{copy.title}:</strong>{" "}
            {copy.storageLabel ? (
              <>
                {copy.body.split("localStorage")[0]}
                <code className="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[11px] text-emerald-200/90">
                  {copy.storageLabel}
                </code>
                {copy.body.split("localStorage")[1] ?? ""}
              </>
            ) : (
              copy.body
            )}
          </>
        )}
      </p>
    </ApplyFlowCard>
  );
}
