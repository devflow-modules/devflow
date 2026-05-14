import Link from "next/link";
import { AiAnswerReviewClient } from "@/components/ai-answer-review-client";

export default function AiReviewPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">DevFlow Interview Lab</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">AI Answer Review</h1>
        <p className="max-w-2xl text-sm text-neutral-400">
          Optional, explicit opt-in feedback on <strong className="font-medium text-neutral-300">written</strong> answers. Local mock by
          default; OpenAI only if you enable it and store your own key in this browser.
        </p>
        <Link href="/" className="inline-block text-xs text-emerald-400/90 underline-offset-2 hover:underline">
          ← Back to problems
        </Link>
      </header>

      <AiAnswerReviewClient />
    </div>
  );
}
