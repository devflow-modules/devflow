"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CareerApplication } from "@devflow/career-core";
import { loadApplyFlowCareerBundle } from "@/lib/applyflow-bundle-storage";
import {
  briefingInputFromCareerApplication,
  exportBriefingMarkdown,
  generateInterviewBriefing,
  type BriefingInput,
  type InterviewBriefingContent,
  type InterviewBriefingType,
  type BriefingLanguage,
} from "@/lib/interview-briefing";
import {
  buildBriefingRecord,
  deleteInterviewBriefing,
  loadInterviewBriefings,
  saveInterviewBriefing,
  type InterviewBriefingRecord,
} from "@/lib/interview-briefing-storage";

const INTERVIEW_TYPES: { value: InterviewBriefingType; label: string }[] = [
  { value: "async_video", label: "Async video" },
  { value: "live_coding", label: "Live coding" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system_design", label: "System design" },
  { value: "recruiter_screen", label: "Recruiter screen" },
];

const LANGUAGES: { value: BriefingLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "portuguese", label: "Portuguese" },
];

function downloadMarkdown(filename: string, body: string): void {
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function skillsFromComma(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

function BriefingPreview({ content }: { content: InterviewBriefingContent }) {
  const blocks: { title: string; body: ReactNode }[] = [
    {
      title: "Core pitch",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.corePitch.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Role alignment",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.roleAlignment.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Project cards",
      body: (
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-300">
          {content.projectCards.map((c, i) => (
            <div key={i}>
              <p className="font-medium text-neutral-200">{c.title}</p>
              <ul className="mt-1 list-disc pl-4 text-neutral-400">
                {c.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Likely technical questions",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.likelyTechnicalQuestions.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Likely behavioral questions",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.likelyBehavioralQuestions.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "STAR outlines",
      body: (
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-300">
          {content.starOutlines.map((s, i) => (
            <div key={i}>
              <p className="font-medium text-neutral-200">{s.title}</p>
              <ul className="mt-1 list-disc pl-4 text-neutral-400">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Questions for the interviewer",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.questionsForInterviewer.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Vocabulary / speaking notes",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.vocabularyNotes.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Final checklist",
      body: (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-neutral-300">
          {content.finalChecklist.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {blocks.map((b) => (
        <section key={b.title} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">{b.title}</h3>
          {b.body}
        </section>
      ))}
    </div>
  );
}

export function InterviewBriefingClient() {
  const [sourceMode, setSourceMode] = useState<"imported" | "manual">("manual");
  const [importedApps, setImportedApps] = useState<CareerApplication[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillsComma, setSkillsComma] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewBriefingType>("live_coding");
  const [language, setLanguage] = useState<BriefingLanguage>("english");

  const [preview, setPreview] = useState<InterviewBriefingContent | null>(null);
  const [previewInput, setPreviewInput] = useState<BriefingInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<InterviewBriefingRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refreshSaved = useCallback(() => {
    setSaved(loadInterviewBriefings());
  }, []);

  useEffect(() => {
    const bundle = loadApplyFlowCareerBundle();
    setImportedApps(bundle?.applications ?? []);
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    if (sourceMode !== "imported" || !selectedAppId) return;
    const app = importedApps.find((a) => a.id === selectedAppId);
    if (!app) return;
    const base = briefingInputFromCareerApplication(app);
    setCompany(base.company);
    setRole(base.role);
    setJobDescription(base.jobDescription ?? "");
    setSkillsComma(base.requiredSkills.join(", "));
    setInterviewType(base.interviewType);
    setLanguage(base.language);
  }, [sourceMode, selectedAppId, importedApps]);

  const buildInput = useCallback((): BriefingInput => {
    return {
      company: company.trim(),
      role: role.trim(),
      jobDescription: jobDescription.trim(),
      requiredSkills: skillsFromComma(skillsComma),
      interviewType,
      language,
      sourceApplicationId:
        sourceMode === "imported" && selectedAppId ? selectedAppId : undefined,
    };
  }, [company, role, jobDescription, skillsComma, interviewType, language, sourceMode, selectedAppId]);

  const handleGenerate = useCallback(() => {
    setError(null);
    try {
      const input = buildInput();
      const content = generateInterviewBriefing(input);
      setPreview(content);
      setPreviewInput(input);
    } catch (e) {
      setPreview(null);
      setPreviewInput(null);
      setError(e instanceof Error ? e.message : "Invalid input");
    }
  }, [buildInput]);

  const handleSave = useCallback(() => {
    if (!preview || !previewInput) return;
    const title = `${previewInput.company} — ${previewInput.role}`;
    const record = buildBriefingRecord(title, previewInput, preview, editingId ?? undefined);
    saveInterviewBriefing(record);
    setEditingId(record.id);
    refreshSaved();
  }, [preview, previewInput, editingId, refreshSaved]);

  const handleExport = useCallback(() => {
    if (!preview || !previewInput) return;
    const title = `${previewInput.company} — ${previewInput.role}`;
    const slug = `${previewInput.company}-${previewInput.role}`.replace(/\s+/g, "-").slice(0, 60);
    downloadMarkdown(`interview-briefing-${slug}.md`, exportBriefingMarkdown(title, previewInput, preview));
  }, [preview, previewInput]);

  const handleLoad = useCallback((r: InterviewBriefingRecord) => {
    const i = r.input;
    setCompany(i.company);
    setRole(i.role);
    setJobDescription(i.jobDescription ?? "");
    setSkillsComma(i.requiredSkills.join(", "));
    setInterviewType(i.interviewType);
    setLanguage(i.language);
    setSourceMode(i.sourceApplicationId ? "imported" : "manual");
    setSelectedAppId(i.sourceApplicationId ?? "");
    setPreview(r.content);
    setPreviewInput(i);
    setEditingId(r.id);
    setError(null);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this briefing from local storage?")) return;
      deleteInterviewBriefing(id);
      if (editingId === id) {
        setEditingId(null);
        setPreview(null);
        setPreviewInput(null);
      }
      refreshSaved();
    },
    [editingId, refreshSaved],
  );

  const hasImport = importedApps.length > 0;

  const newBriefing = useCallback(() => {
    setEditingId(null);
    setPreview(null);
    setPreviewInput(null);
    setCompany("");
    setRole("");
    setJobDescription("");
    setSkillsComma("");
    setInterviewType("live_coding");
    setLanguage("english");
    setSelectedAppId("");
    setSourceMode(hasImport ? "imported" : "manual");
    setError(null);
  }, [hasImport]);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 md:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">Interview Lab</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">Interview Briefing Mode</h1>
        <p className="text-sm text-neutral-400">
          Structured prep before real interviews — local only, deterministic text, no audio, no screen capture, no hidden
          overlays.
        </p>
        <Link href="/" className="text-sm font-medium text-emerald-400/90 hover:text-emerald-300">
          ← Home
        </Link>
      </header>

      <section className="il-card border border-amber-500/30 bg-amber-500/[0.06] p-4 md:p-5">
        <h2 className="text-sm font-semibold text-amber-100">Preparation, not “invisible help”</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-100/85">
          <li>Use this <strong>before</strong> your interview to rehearse — not as a live cheat sheet during the real session.</li>
          <li>No microphone, no camera capture, no transcription, no third-party APIs.</li>
          <li>Respect the employer&apos;s process and applicable laws; this tool does not bypass assessments.</li>
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="il-card space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={newBriefing}
                className="rounded-lg border border-neutral-600 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:border-neutral-400"
              >
                New briefing
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-neutral-500">Source</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-neutral-300">
                  <input
                    type="radio"
                    name="src"
                    checked={sourceMode === "imported"}
                    disabled={!hasImport}
                    onChange={() => setSourceMode("imported")}
                  />
                  Imported ApplyFlow job {!hasImport ? "(import a bundle first)" : null}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-neutral-300">
                  <input
                    type="radio"
                    name="src"
                    checked={sourceMode === "manual"}
                    onChange={() => setSourceMode("manual")}
                  />
                  Manual
                </label>
              </div>
            </fieldset>

            {sourceMode === "imported" && hasImport ? (
              <label className="block space-y-1">
                <span className="text-xs text-neutral-500">Select application</span>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  <option value="">— Choose —</option>
                  {importedApps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company} — {a.role}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block space-y-1">
              <span className="text-xs text-neutral-500">Company</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-neutral-500">Role</span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-neutral-500">Job description</span>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-neutral-500">Required skills (comma-separated)</span>
              <input
                value={skillsComma}
                onChange={(e) => setSkillsComma(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-neutral-500">Interview type</span>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as InterviewBriefingType)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-neutral-500">Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as BriefingLanguage)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400"
              >
                Generate preview
              </button>
              <button
                type="button"
                disabled={!preview || !previewInput}
                onClick={() => handleSave()}
                className="rounded-xl border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-100 hover:border-neutral-400 disabled:opacity-40"
              >
                Save briefing
              </button>
              <button
                type="button"
                disabled={!preview || !previewInput}
                onClick={() => handleExport()}
                className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-40"
              >
                Export Markdown
              </button>
            </div>
          </div>

          <section className="il-card p-4 md:p-5">
            <h2 className="text-sm font-semibold text-white">Saved briefings</h2>
            <p className="mt-1 text-xs text-neutral-500">Stored in this browser only ({saved.length} / 24).</p>
            <ul className="mt-3 space-y-2">
              {saved.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-100">{r.title}</p>
                    <p className="text-xs text-neutral-500">{new Date(r.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoad(r)}
                      className="rounded-lg border border-neutral-600 px-2 py-1 text-xs text-neutral-200 hover:border-neutral-400"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadMarkdown(
                          `briefing-${r.id.slice(0, 8)}.md`,
                          exportBriefingMarkdown(r.title, r.input, r.content),
                        )
                      }
                      className="rounded-lg border border-emerald-500/35 px-2 py-1 text-xs text-emerald-200"
                    >
                      Export MD
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="rounded-lg border border-red-500/35 px-2 py-1 text-xs text-red-200/90"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {saved.length === 0 ? <p className="mt-2 text-xs text-neutral-600">No saved briefings yet.</p> : null}
          </section>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Preview</h2>
          {preview && previewInput ? (
            <BriefingPreview content={preview} />
          ) : (
            <div className="il-card border border-dashed border-neutral-700 p-6 text-center text-sm text-neutral-500">
              Generate a preview to see your briefing here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
