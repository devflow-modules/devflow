import Link from "next/link";
import { groupProblemsByPattern } from "@/data/problems";
import type { ProblemPattern } from "@/lib/types";
import { RecentSessions } from "@/components/recent-sessions";

const PATTERN_ORDER: ProblemPattern[] = [
  "Frequency Map",
  "Sorting + Tie-breaker",
  "Two Pointers",
  "Async JavaScript",
  "Frontend Logic",
];

export default function HomePage() {
  const grouped = groupProblemsByPattern();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 md:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">DevFlow</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">DevFlow Interview Lab</h1>
        <p className="max-w-2xl text-lg text-neutral-400">
          Practice live coding, English reasoning, and interview performance.
        </p>
      </header>

      <RecentSessions />

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-950/50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-1">
          <p className="text-sm font-medium text-white">DevFlow Career Suite</p>
          <p className="text-xs leading-relaxed text-neutral-500">
            Import ApplyFlow bundles for role-specific prep, or run a <strong className="text-neutral-300">resume ↔ job</strong>{" "}
            match and jump into the same interview practice flow — briefing and answer review stay one click away.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3 sm:justify-end">
          <Link
            href="/import/applyflow"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/60"
          >
            Import from ApplyFlow
          </Link>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Link
              href="/career/ats"
              className="rounded-xl border border-emerald-500/35 bg-neutral-950/80 px-4 py-2 text-center text-sm font-semibold text-emerald-100 transition hover:border-emerald-500/50 sm:text-left"
            >
              Resume Match
            </Link>
            <p className="text-[10px] leading-snug text-neutral-500 sm:max-w-[220px]">
              Compare your resume with a job description and convert the analysis into interview practice.
            </p>
          </div>
          <Link
            href="/briefing"
            className="rounded-xl border border-neutral-600 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-500/40"
          >
            Interview Briefing
          </Link>
          <Link
            href="/ai-review"
            className="rounded-xl border border-neutral-600 bg-neutral-950/60 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-emerald-500/40"
          >
            AI Answer Review
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-medium text-white">Problems by pattern</h2>
        <div className="grid gap-8">
          {PATTERN_ORDER.map((pattern) => {
            const list = grouped[pattern];
            if (list.length === 0) return null;
            return (
              <div key={pattern} className="il-card p-5 md:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">{pattern}</h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/practice/${p.id}`}
                        className="group flex flex-col rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3 transition hover:border-emerald-500/40 hover:bg-neutral-950/80"
                      >
                        <span className="font-medium text-neutral-100 group-hover:text-white">{p.title}</span>
                        <span className="mt-1 text-xs text-neutral-500">
                          {p.difficulty} · {p.pattern}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="il-muted border-t border-neutral-800/80 pt-6 text-xs">
        Local-first MVP — no backend, no auth. Code runs in your browser only (see runner disclaimer on the practice
        page).
      </footer>
    </div>
  );
}
