import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RelatedPageCard = {
  slug: string;
  h1: string;
  description: string;
};

type Props = {
  pages: RelatedPageCard[];
  title?: string;
  subtitle?: string;
};

export function RelatedPagesGrid({
  pages,
  title = "Leia também",
  subtitle = "Outros guias e dicas do ecossistema DevFlow Labs.",
}: Props) {
  if (pages.length === 0) return null;

  return (
    <section
      className="border-t border-border bg-[#f8fafc] py-16 sm:py-20"
      aria-labelledby="related-pages-heading"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-primary" aria-hidden />
        <h2
          id="related-pages-heading"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>

        <ul
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
        >
          {pages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/${p.slug}`}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border border-border bg-card p-6",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                )}
              >
                <h3 className="font-semibold text-foreground group-hover:text-primary">
                  {p.h1}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">
                  {p.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Ver guia
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
