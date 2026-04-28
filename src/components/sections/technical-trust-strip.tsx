import { TECH_TRUST_STRIP } from "@/lib/conversion-copy";

export function TechnicalTrustStrip() {
  return (
    <div
      className="border-y df-border-brand bg-[var(--devflow-surface)] py-2.5 text-center sm:py-2.5"
      role="note"
      aria-label="Infraestrutura técnica"
    >
      <p className="df-text-secondary mx-auto max-w-4xl px-3 font-mono text-[11px] font-medium leading-relaxed tracking-wide min-[380px]:text-xs sm:px-4">
        {TECH_TRUST_STRIP}
      </p>
    </div>
  );
}
