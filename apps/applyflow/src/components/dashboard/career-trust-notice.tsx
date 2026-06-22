import { cn } from "@/lib/cn";

export function CareerTrustNotice({
  children,
  className,
  testId = "career-pilot-privacy-notice",
}: {
  children: string;
  className?: string;
  testId?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] bg-[color:var(--af-surface-muted)] px-3 py-2.5 text-sm leading-relaxed text-[color:var(--af-text-muted)]",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </p>
  );
}
