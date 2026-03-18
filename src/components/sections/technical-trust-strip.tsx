import { TECH_TRUST_STRIP } from "@/lib/conversion-copy";

export function TechnicalTrustStrip() {
  return (
    <div
      className="border-y border-slate-200/80 bg-slate-100/90 py-2.5 text-center sm:py-2.5"
      role="note"
      aria-label="Infraestrutura técnica"
    >
      <p className="mx-auto max-w-4xl px-3 font-mono text-[10px] font-medium leading-relaxed tracking-wide text-slate-600 min-[380px]:text-[11px] sm:px-4 sm:text-xs">
        {TECH_TRUST_STRIP}
      </p>
    </div>
  );
}
