import { cn } from "@/lib/utils";

type Props = {
  steps: string[];
  title?: string;
  className?: string;
};

export function StepsSection({
  steps,
  title = "Passo a passo",
  className,
}: Props) {
  return (
    <section
      className={cn("py-12 sm:py-16", className)}
      aria-labelledby="growth-steps-heading"
    >
      <div className="mx-auto max-w-[720px]">
        <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-primary" aria-hidden />
        <h2
          id="growth-steps-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h2>
        <ol className="mt-8 space-y-5" role="list">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  "bg-primary text-sm font-bold text-primary-foreground"
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-base leading-relaxed text-slate-700">{step}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
