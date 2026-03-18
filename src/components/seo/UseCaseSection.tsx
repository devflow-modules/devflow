import type { SeoPage } from "@/lib/seo/types";
import { cn } from "@/lib/utils";

type Props = {
  page: SeoPage;
};

export function UseCaseSection({ page }: Props) {
  return (
    <section
      className="py-12 sm:py-16"
      aria-labelledby="seo-use-case-heading"
    >
      <div className="mx-auto max-w-[720px]">
        <h2
          id="seo-use-case-heading"
          className="text-sm font-semibold uppercase tracking-wide text-primary"
        >
          Quando usar
        </h2>
        <div
          className={cn(
            "mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8",
            "shadow-sm"
          )}
        >
          <p className="text-base leading-relaxed text-foreground sm:text-lg">
            {page.useCase}
          </p>
        </div>
      </div>
    </section>
  );
}
