import { cn } from "@/lib/utils";

const SECTION_CONTAINER = "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8";

type SectionProps = {
  children: React.ReactNode;
  alternate?: boolean;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

export function Section({
  children,
  alternate = false,
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-24",
        alternate && "border-y df-border-brand bg-[var(--devflow-surface)]",
        className
      )}
      {...props}
    >
      <div className={SECTION_CONTAINER}>{children}</div>
    </section>
  );
}

export { SECTION_CONTAINER };
