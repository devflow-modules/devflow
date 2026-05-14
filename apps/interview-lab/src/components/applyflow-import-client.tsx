"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  createInterviewPreparationFromApplication,
  getInterviewReadyApplications,
  parseCareerBundle,
  type CareerApplication,
  type CareerBundle,
} from "@devflow/career-core";
import { parseCareerBundleFromClipboardText } from "@/lib/applyflow-clipboard-import";
import { persistApplyFlowCareerBundle, clearApplyFlowCareerBundle } from "@/lib/applyflow-bundle-storage";
import { appendCareerPrepRecord } from "@/lib/career-prep-storage";

const STATUS_LABEL: Record<CareerApplication["status"], string> = {
  saved: "Saved",
  applied: "Applied",
  interview_requested: "Interview requested",
  interview_scheduled: "Interview scheduled",
  rejected: "Rejected",
  offer: "Offer",
};

const DEFAULT_PRACTICE_PROBLEM_ID = "most-frequent-category";

function statusPillClass(status: CareerApplication["status"]): string {
  if (status === "interview_requested" || status === "interview_scheduled") {
    return "border-emerald-500/50 bg-emerald-500/15 text-emerald-100";
  }
  if (status === "offer") return "border-teal-500/40 bg-teal-500/10 text-teal-100";
  if (status === "rejected") return "border-red-500/35 bg-red-500/10 text-red-200/90";
  return "border-neutral-600 bg-neutral-900/80 text-neutral-300";
}

function ImportSteps() {
  const steps = [
    {
      n: 1,
      title: "Export from ApplyFlow",
      body: "Open the ApplyFlow dashboard, load applications, then Copy CareerBundle, Open Interview Lab, or download JSON — all local.",
    },
    { n: 2, title: "Paste, clipboard, or upload CareerBundle JSON", body: "Use Import from clipboard, drop a file, or paste and Parse field — validation runs only in this browser." },
    { n: 3, title: "Train for a selected role", body: "Pick a row and open practice with a deterministic prep panel (no AI, no backend)." },
  ];
  return (
    <ol className="grid list-none gap-3 sm:grid-cols-3">
      {steps.map((s) => (
        <li key={s.n} className="il-card flex flex-col gap-2 p-4">
          <span className="flex size-8 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-200">
            {s.n}
          </span>
          <p className="text-sm font-semibold text-white">{s.title}</p>
          <p className="text-xs leading-relaxed text-neutral-500">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

function BundleSummaryCard({ bundle, interviewReadyCount }: { bundle: CareerBundle; interviewReadyCount: number }) {
  const exported = new Date(bundle.exportedAt);
  const exportedLabel = Number.isNaN(exported.getTime()) ? bundle.exportedAt : exported.toLocaleString();

  return (
    <div className="il-card border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">Bundle summary</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">Source</dt>
          <dd className="mt-0.5 font-medium text-neutral-100">ApplyFlow ({bundle.sourceProduct})</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">Exported at</dt>
          <dd className="mt-0.5 text-neutral-200">{exportedLabel}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">Total roles</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-white">{bundle.applications.length}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">Interview-ready (mapped)</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-emerald-200/95">{interviewReadyCount}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ApplyflowImportClient({ fromApplyflowHandoff = false }: { fromApplyflowHandoff?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<CareerBundle | null>(null);
  const [clipboardBusy, setClipboardBusy] = useState(false);

  const applications = bundle?.applications ?? [];

  const interviewReadyCount = useMemo(
    () => (bundle ? getInterviewReadyApplications(bundle).length : 0),
    [bundle],
  );

  const ingestValidatedBundle = useCallback((data: CareerBundle) => {
    setError(null);
    persistApplyFlowCareerBundle(data);
    setBundle(data);
    setText(JSON.stringify(data, null, 2));
  }, []);

  const applyParsed = useCallback(
    (parsed: unknown) => {
      setError(null);
      const r = parseCareerBundle(parsed);
      if (!r.ok) {
        setError(r.error);
        setBundle(null);
        return;
      }
      ingestValidatedBundle(r.data);
    },
    [ingestValidatedBundle],
  );

  const importFromClipboard = useCallback(async () => {
    setError(null);
    setClipboardBusy(true);
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        setError("Clipboard read is not available in this browser. Paste JSON manually or use Upload JSON.");
        setBundle(null);
        return;
      }
      const raw = await navigator.clipboard.readText();
      const r = parseCareerBundleFromClipboardText(raw);
      if (!r.ok) {
        setError(r.error);
        setBundle(null);
        return;
      }
      ingestValidatedBundle(r.data);
    } catch {
      setError("Could not read from clipboard. Paste JSON manually or use Upload JSON.");
      setBundle(null);
    } finally {
      setClipboardBusy(false);
    }
  }, [ingestValidatedBundle]);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      void file.text().then((t) => {
        setText(t);
        try {
          applyParsed(JSON.parse(t) as unknown);
        } catch {
          setError("Invalid JSON file.");
          setBundle(null);
        }
      });
    },
    [applyParsed],
  );

  const onParsePasted = useCallback(() => {
    try {
      applyParsed(JSON.parse(text) as unknown);
    } catch {
      setError("Could not parse JSON.");
      setBundle(null);
    }
  }, [applyParsed, text]);

  const trainFor = useCallback(
    (app: CareerApplication) => {
      const preparation = createInterviewPreparationFromApplication(app);
      const id = crypto.randomUUID();
      appendCareerPrepRecord({
        id,
        applicationId: app.id,
        company: app.company,
        role: app.role,
        status: app.status,
        requiredSkills: app.requiredSkills,
        preparation,
        createdAt: new Date().toISOString(),
      });
      router.push(`/practice/${DEFAULT_PRACTICE_PROBLEM_ID}?careerPrep=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const isEmptyStart = !bundle && !error && !text.trim();
  const hasValidBundle = Boolean(bundle);
  const hasRoles = applications.length > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-4 py-10 md:px-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">DevFlow Career Suite</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">ApplyFlow → Interview Lab</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Import a <strong className="text-neutral-200">CareerBundle</strong> JSON from the ApplyFlow dashboard. Data
          stays in your browser — same privacy model as both products.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-neutral-500">
          No data is sent to DevFlow servers. The bundle stays in your browser or clipboard until you import it here.
        </p>
        <Link href="/" className="inline-block text-sm font-medium text-emerald-400/90 hover:text-emerald-300">
          ← Home
        </Link>
      </header>

      {fromApplyflowHandoff ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/95"
        >
          <p className="font-medium text-emerald-200">ApplyFlow handoff detected.</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-100/85">
            Paste or import the CareerBundle copied from ApplyFlow (use <strong className="text-emerald-200">Import from clipboard</strong>{" "}
            if you used Copy CareerBundle on the dashboard).
          </p>
        </div>
      ) : null}

      <ImportSteps />

      {isEmptyStart ? (
        <div className="il-card border border-dashed border-neutral-700 bg-neutral-950/40 p-6 text-center">
          <p className="text-sm font-medium text-neutral-200">No JSON loaded yet</p>
          <p className="mt-2 text-xs text-neutral-500">
            Export from ApplyFlow, then paste the file contents below or upload the <code className="text-neutral-400">.json</code>{" "}
            file.
          </p>
        </div>
      ) : null}

      <section className="il-card space-y-4 p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="il-bundle-json" className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            CareerBundle JSON
          </label>
          <textarea
            id="il-bundle-json"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-emerald-100/90 outline-none ring-emerald-500/25 focus:ring-2 md:text-[13px]"
            placeholder='{"schemaVersion":"1.0","sourceProduct":"applyflow", ...}'
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            id="il-af-json"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="il-af-json"
            className="cursor-pointer rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-400"
          >
            Upload JSON
          </label>
          <button
            type="button"
            disabled={clipboardBusy}
            onClick={() => void importFromClipboard()}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clipboardBusy ? "Reading clipboard…" : "Import from clipboard"}
          </button>
          <button
            type="button"
            onClick={() => onParsePasted()}
            className="rounded-xl border border-neutral-600 px-4 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-neutral-400"
          >
            Parse field
          </button>
          {hasValidBundle ? (
            <button
              type="button"
              onClick={() => {
                clearApplyFlowCareerBundle();
                setBundle(null);
                setText("");
                setError(null);
              }}
              className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-200/90 hover:bg-red-500/10"
            >
              Clear import
            </button>
          ) : null}
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100/95"
          >
            <p className="font-medium">Invalid bundle</p>
            <p className="mt-1 text-xs leading-relaxed text-red-200/85">{error}</p>
          </div>
        ) : null}
      </section>

      {bundle && !error ? <BundleSummaryCard bundle={bundle} interviewReadyCount={interviewReadyCount} /> : null}

      {bundle && !error && !hasRoles ? (
        <div className="il-card border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-amber-100/95">
          <p className="font-medium">Valid bundle, zero roles</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-200/80">
            The JSON schema is valid but the <code className="text-amber-200/90">applications</code> array is empty.
            Export again from ApplyFlow after saving applications to the dashboard.
          </p>
        </div>
      ) : null}

      {bundle && hasRoles ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold text-white">Roles in this bundle</h2>
            <p className="text-xs text-neutral-500">Select a row to open practice with the prep side panel.</p>
          </div>
          <ul className="space-y-4">
            {applications.map((app) => (
              <li
                key={app.id}
                className="il-card flex flex-col gap-4 border border-neutral-800/90 p-4 md:flex-row md:items-stretch md:justify-between md:p-5"
              >
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-base font-semibold text-white">{app.company}</p>
                    <p className="mt-0.5 text-sm text-neutral-300">{app.role}</p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${statusPillClass(app.status)}`}
                  >
                    {STATUS_LABEL[app.status]}
                  </span>
                  {app.requiredSkills.length > 0 ? (
                    <div>
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-neutral-500">Top skills</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {app.requiredSkills.slice(0, 14).map((sk) => (
                          <span
                            key={sk}
                            className="rounded-md border border-neutral-700 bg-neutral-950/80 px-2 py-0.5 text-[0.65rem] text-neutral-300"
                          >
                            {sk}
                          </span>
                        ))}
                        {app.requiredSkills.length > 14 ? (
                          <span className="text-[0.65rem] text-neutral-500">+{app.requiredSkills.length - 14} more</span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-600">No skills listed in this bundle row.</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col justify-center border-t border-neutral-800 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <button
                    type="button"
                    onClick={() => trainFor(app)}
                    className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-neutral-950 shadow-sm transition hover:bg-emerald-400 md:min-w-[11rem]"
                  >
                    Train for this role
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
