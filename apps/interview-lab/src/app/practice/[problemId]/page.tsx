import Link from "next/link";
import { notFound } from "next/navigation";
import { getProblemById } from "@/data/problems";
import { PracticeClient } from "@/components/practice-client";

type PageProps = {
  params: Promise<{ problemId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PracticePage({ params, searchParams }: PageProps) {
  const { problemId } = await params;
  const sp = await searchParams;
  const raw = sp.careerPrep;
  const careerPrepId = typeof raw === "string" ? raw : undefined;
  const problem = getProblemById(problemId);
  if (!problem) notFound();

  return (
    <div className="min-h-screen bg-neutral-950 px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto mb-4 flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-400/90 underline-offset-4 hover:text-emerald-300 hover:underline"
        >
          ← Home
        </Link>
        <p className="text-xs text-neutral-500">
          Runner uses <code className="rounded bg-neutral-900 px-1 py-0.5 text-neutral-300">new Function</code> —
          internal use only.
        </p>
      </div>
      <PracticeClient problem={problem} careerPrepId={careerPrepId} />
    </div>
  );
}
