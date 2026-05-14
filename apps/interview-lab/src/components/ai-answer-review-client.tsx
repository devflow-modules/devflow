"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiAnswerReviewRequest, AiAnswerReviewResult } from "@/lib/ai-answer-review";
import {
  ANSWER_REVIEW_MAX_ANSWER_CHARS,
  ANSWER_REVIEW_MAX_CONTEXT_CHARS,
  buildAnswerReviewExportFilename,
  formatAnswerReviewAsMarkdown,
  getAnswerReviewContextCharCount,
  reviewAnswerWithLimits,
} from "@/lib/ai-answer-review";
import {
  clearLastAiAnswerReview,
  clearStoredOpenAiKey,
  loadAiAnswerReviewSettings,
  loadLastAiAnswerReview,
  saveAiAnswerReviewSettings,
  saveLastAiAnswerReview,
} from "@/lib/ai-answer-review-storage";
import { resolveAnswerReviewProvider } from "@/lib/ai-provider";

const btn =
  "rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-emerald-500/50 hover:text-white";

export function AiAnswerReviewClient() {
  const [userAnswer, setUserAnswer] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [language, setLanguage] = useState("english");
  const [preferOpenAi, setPreferOpenAi] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAnswerReviewResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const s = loadAiAnswerReviewSettings();
    setPreferOpenAi(s.preferOpenAi);
    setHasStoredKey(Boolean(s.openAiApiKey?.trim()));
    setApiKeyInput("");
  }, []);

  const flash = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint(null), 2400);
  };

  const saveSettings = useCallback(() => {
    const keyToStore = apiKeyInput.trim() || loadAiAnswerReviewSettings().openAiApiKey?.trim() || null;
    saveAiAnswerReviewSettings({
      preferOpenAi,
      openAiApiKey: keyToStore,
    });
    setHasStoredKey(Boolean(keyToStore));
    flash("Settings saved locally.");
  }, [apiKeyInput, preferOpenAi]);

  const handleClearKey = () => {
    clearStoredOpenAiKey();
    setApiKeyInput("");
    setPreferOpenAi(false);
    setHasStoredKey(false);
    flash("OpenAI key removed from this browser.");
  };

  const handleReview = async () => {
    setError(null);
    setLoading(true);
    setResult(null);

    const settings = loadAiAnswerReviewSettings();
    const keyFromField = apiKeyInput.trim();
    const key = keyFromField || settings.openAiApiKey?.trim() || "";

    const req: AiAnswerReviewRequest = {
      userAnswer,
      role: role.trim() || undefined,
      company: company.trim() || undefined,
      interviewType: interviewType.trim() || undefined,
      language: language.trim() || undefined,
    };

    try {
      const provider = resolveAnswerReviewProvider({
        preferOpenAi: preferOpenAi && Boolean(key),
        openAiApiKey: key || null,
      });
      const out = await reviewAnswerWithLimits(req, provider);
      setResult(out);
      saveLastAiAnswerReview(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadLast = () => {
    const last = loadLastAiAnswerReview();
    if (last) {
      setResult(last.result);
      flash("Loaded last saved review from this browser.");
    }
  };

  const clearLast = () => {
    clearLastAiAnswerReview();
    setResult(null);
    flash("Cleared saved review.");
  };

  const exportReviewMarkdown = () => {
    if (!result) return;
    const req: AiAnswerReviewRequest = {
      userAnswer,
      role: role.trim() || undefined,
      company: company.trim() || undefined,
      interviewType: interviewType.trim() || undefined,
      language: language.trim() || undefined,
    };
    const md = formatAnswerReviewAsMarkdown({ request: req, result });
    const filename = buildAnswerReviewExportFilename({ role: role.trim(), company: company.trim() });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
    flash("Markdown file downloaded.");
  };

  const answerCharCount = userAnswer.trim().length;
  const contextCharCount = getAnswerReviewContextCharCount({
    role,
    company,
    interviewType,
    language,
  });
  const answerOverLimit = answerCharCount > ANSWER_REVIEW_MAX_ANSWER_CHARS;
  const contextOverLimit = contextCharCount > ANSWER_REVIEW_MAX_CONTEXT_CHARS;
  const canReview = !loading && answerCharCount > 0 && !answerOverLimit && !contextOverLimit;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
        <p className="font-semibold text-amber-200">Preparation only</p>
        <p className="mt-1 text-xs text-amber-100/80">
          Use this to prepare and review your own answers. Do not use it as hidden assistance during live interviews. Nothing runs
          automatically — your text is sent only when you click <strong className="font-medium">Review answer</strong>. No audio, no
          screen capture, no overlay.
        </p>
      </section>

      <section className="il-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Optional OpenAI</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Default is <strong className="font-medium text-neutral-400">local mock</strong> (no key, no network). Enable OpenAI only if
          you paste your own API key — it stays in this browser&apos;s <code className="text-neutral-400">localStorage</code> until you
          remove it.
        </p>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={preferOpenAi}
            onChange={(e) => setPreferOpenAi(e.target.checked)}
            className="rounded border-neutral-600"
          />
          Use OpenAI when a key is present
        </label>
        <div className="mt-2 space-y-1">
          <label htmlFor="ai-openai-key" className="text-xs text-neutral-500">
            API key (optional)
          </label>
          <input
            id="ai-openai-key"
            type="password"
            autoComplete="off"
            placeholder={hasStoredKey ? "Key saved — leave blank to keep, or paste new" : "sk-…"}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none ring-emerald-500/0 transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={saveSettings}>
            Save settings locally
          </button>
          <button type="button" className={btn} onClick={handleClearKey}>
            Remove key
          </button>
        </div>
        {hint ? <p className="mt-2 text-xs text-emerald-400/90">{hint}</p> : null}
        {preferOpenAi && !hasStoredKey && !apiKeyInput.trim() ? (
          <p className="mt-2 text-xs text-amber-400/90">OpenAI selected but no key — reviews will use mock mode until you save a key.</p>
        ) : null}
      </section>

      <section className="il-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Your answer</h2>
        <p className="mt-2 text-xs text-neutral-500">
          Character limits keep feedback focused and avoid oversized requests (cost and quality). Counts use trimmed text for the
          answer and trimmed optional fields combined for context.
        </p>
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          rows={10}
          placeholder="Paste or type a written interview answer you want feedback on…"
          aria-invalid={answerOverLimit}
          className={`mt-3 w-full resize-y rounded-lg border bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none ring-emerald-500/0 transition focus:ring-2 focus:ring-emerald-500/20 ${
            answerOverLimit
              ? "border-red-500/60 focus:border-red-500/70"
              : "border-neutral-700 focus:border-emerald-500/50"
          }`}
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={answerOverLimit ? "font-medium text-red-400" : "text-neutral-500"}>
            {answerCharCount} / {ANSWER_REVIEW_MAX_ANSWER_CHARS} characters (after trim)
          </span>
          {answerOverLimit ? (
            <span className="text-red-400">Shorten your answer to run a review.</span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-neutral-500">Role (optional)</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Company (optional)</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Interview type (optional)</label>
            <input
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              placeholder="e.g. behavioral, system design"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Language preference (optional)</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500/50"
            >
              <option value="english">English</option>
              <option value="portuguese">Portuguese</option>
              <option value="bilingual">Bilingual</option>
            </select>
          </div>
        </div>
        <div className="mt-2 text-xs">
          <span className={contextOverLimit ? "font-medium text-red-400" : "text-neutral-500"}>
            Optional context total: {contextCharCount} / {ANSWER_REVIEW_MAX_CONTEXT_CHARS} characters
          </span>
          {contextOverLimit ? (
            <p className="mt-1 text-red-400">Reduce role, company, interview type, or language text to stay within the limit.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canReview}
            onClick={() => void handleReview()}
            className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Reviewing…" : "Review answer"}
          </button>
          <button type="button" className={btn} onClick={loadLast}>
            Load last saved review
          </button>
          <button type="button" className={btn} onClick={clearLast}>
            Clear saved review
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </section>

      {result ? (
        <section className="il-card space-y-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400/90">Review</h2>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold text-white">
                {result.score}
                <span className="text-sm font-normal text-neutral-500">/10</span>
              </p>
              <button type="button" className={btn} onClick={exportReviewMarkdown}>
                Export Markdown
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Strengths</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-200">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Improvements</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-200">
              {result.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Improved version</h3>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-950/80 p-3 text-sm text-neutral-200">
              {result.improvedVersion}
            </pre>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">English notes</h3>
            <p className="mt-2 text-sm text-neutral-200">{result.englishNotes}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Follow-up practice prompt</h3>
            <p className="mt-2 text-sm text-neutral-200">{result.followUpPrompt}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
