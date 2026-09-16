"use client";

import {
  EVIDENCE_KINDS,
  EVIDENCE_ORIGINS,
  EVIDENCE_STANCES,
  SUPABASE_COMPONENT_LABELS,
  SUPABASE_COMPONENT_TOPICS,
  buildRecordedFact,
  type Evidence,
  type EvidenceKind,
  type EvidenceOrigin,
  type EvidenceStance,
} from "@devflow/applyflow-core";
import { useState } from "react";
import { cn } from "@/lib/cn";

import {
  PROFILE_FORM_EVIDENCE_ADD,
  PROFILE_FORM_EVIDENCE_EMPTY,
  PROFILE_FORM_EVIDENCE_HINT,
  PROFILE_FORM_EVIDENCE_JOB_SCOPE_NONE,
  PROFILE_FORM_EVIDENCE_KIND_COMPONENT,
  PROFILE_FORM_EVIDENCE_KIND_HOURS,
  PROFILE_FORM_EVIDENCE_KIND_JOINT,
  PROFILE_FORM_EVIDENCE_KIND_PERIOD,
  PROFILE_FORM_EVIDENCE_ORIGIN_DECLARATION,
  PROFILE_FORM_EVIDENCE_ORIGIN_DOCUMENT,
  PROFILE_FORM_EVIDENCE_REMOVE,
  PROFILE_FORM_EVIDENCE_STANCE_ABSENT,
  PROFILE_FORM_EVIDENCE_STANCE_KNOWN,
  PROFILE_FORM_EVIDENCE_STANCE_UNKNOWN,
  PROFILE_FORM_EVIDENCE_SUMMARY,
} from "./candidate-profile-form-content";

const fieldClass = cn(
  "w-full min-w-0 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

export type AdditionalEvidenceJobScope = {
  id: string;
  label: string;
};

const KIND_LABELS: Record<Exclude<EvidenceKind, "other">, string> = {
  skill_component: PROFILE_FORM_EVIDENCE_KIND_COMPONENT,
  joint_skill: PROFILE_FORM_EVIDENCE_KIND_JOINT,
  experience_period: PROFILE_FORM_EVIDENCE_KIND_PERIOD,
  availability: PROFILE_FORM_EVIDENCE_KIND_HOURS,
};

function originLabel(origin: EvidenceOrigin | undefined, source: Evidence["source"]): string {
  if (origin === "document" || source === "resume") return PROFILE_FORM_EVIDENCE_ORIGIN_DOCUMENT;
  return PROFILE_FORM_EVIDENCE_ORIGIN_DECLARATION;
}

function defaultDraft(kind: Exclude<EvidenceKind, "other">) {
  if (kind === "skill_component") {
    return {
      topic: "supabase.database",
      label: SUPABASE_COMPONENT_LABELS["supabase.database"],
      technologies: "Supabase Database, Supabase",
    };
  }
  if (kind === "joint_skill") {
    return {
      topic: "typescript.backend",
      label: "TypeScript on the backend",
      technologies: "TypeScript, Node.js",
    };
  }
  if (kind === "experience_period") {
    return {
      topic: "fullstack.period",
      label: "Full-stack autonomous work",
      technologies: "",
    };
  }
  return {
    topic: "availability.window",
    label: "Online presence 9am - 4pm EST",
    technologies: "",
  };
}

export function AdditionalEvidenceEditor({
  evidence,
  jobScopes = [],
  onChange,
}: {
  evidence: Evidence[];
  jobScopes?: AdditionalEvidenceJobScope[];
  onChange: (next: Evidence[]) => void;
}) {
  const [kind, setKind] = useState<Exclude<EvidenceKind, "other">>("skill_component");
  const [origin, setOrigin] = useState<EvidenceOrigin>("candidate_declaration");
  const [stance, setStance] = useState<EvidenceStance>("known");
  const [topic, setTopic] = useState("supabase.database");
  const [label, setLabel] = useState(SUPABASE_COMPONENT_LABELS["supabase.database"]);
  const [declaredValue, setDeclaredValue] = useState("can_meet");
  const [sourceRef, setSourceRef] = useState("");
  const [project, setProject] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hoursLabel, setHoursLabel] = useState("9am - 4pm EST");
  const [timezoneLabel, setTimezoneLabel] = useState("EST");
  const [relatedJobId, setRelatedJobId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function resetKind(next: Exclude<EvidenceKind, "other">) {
    const defaults = defaultDraft(next);
    setKind(next);
    setTopic(defaults.topic);
    setLabel(defaults.label);
    setLocalError(null);
  }

  return (
    <details className="rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-emerald-300 hover:text-emerald-200">
        {PROFILE_FORM_EVIDENCE_SUMMARY}
      </summary>
      <div className="mt-3 grid gap-3">
        <p className="text-xs text-[color:var(--af-text-muted)]">{PROFILE_FORM_EVIDENCE_HINT}</p>
        {evidence.length === 0 ? (
          <p className="text-sm text-[color:var(--af-text-muted)]">{PROFILE_FORM_EVIDENCE_EMPTY}</p>
        ) : (
          <ul className="grid gap-2">
            {evidence.map((item) => (
              <li
                key={item.id}
                className="grid gap-1 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border)] px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm text-[color:var(--af-text)]">{item.label}</p>
                  <button
                    type="button"
                    className="text-xs text-red-200 hover:text-red-100"
                    onClick={() => onChange(evidence.filter((fact) => fact.id !== item.id))}
                  >
                    {PROFILE_FORM_EVIDENCE_REMOVE}
                  </button>
                </div>
                <p className="text-xs text-[color:var(--af-text-muted)]">
                  {originLabel(item.origin, item.source)}
                  {item.stance === "absent" ? " · sem experiência declarada" : ""}
                  {item.periodStart ? ` · ${item.periodStart}–${item.periodEnd ?? "present"}` : ""}
                  {item.relatedJobId ? ` · vaga ${item.relatedJobId}` : ""}
                  {item.sourceRef ? ` · ${item.sourceRef}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 border-t border-[color:var(--af-border)] pt-3">
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Tipo
            <select
              className={fieldClass}
              value={kind}
              onChange={(event) => resetKind(event.target.value as Exclude<EvidenceKind, "other">)}
            >
              {EVIDENCE_KINDS.filter((item) => item !== "other").map((item) => (
                <option key={item} value={item}>
                  {KIND_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          {kind === "skill_component" ? (
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              Componente
              <select
                className={fieldClass}
                value={topic}
                onChange={(event) => {
                  const next = event.target.value as (typeof SUPABASE_COMPONENT_TOPICS)[number];
                  setTopic(next);
                  setLabel(SUPABASE_COMPONENT_LABELS[next]);
                }}
              >
                {SUPABASE_COMPONENT_TOPICS.map((item) => (
                  <option key={item} value={item}>
                    {SUPABASE_COMPONENT_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              Requisito ou conhecimento
              <input className={fieldClass} value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
          )}
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Origem
            <select
              className={fieldClass}
              value={origin}
              onChange={(event) => setOrigin(event.target.value as EvidenceOrigin)}
            >
              {EVIDENCE_ORIGINS.map((item) => (
                <option key={item} value={item}>
                  {item === "document" ? PROFILE_FORM_EVIDENCE_ORIGIN_DOCUMENT : PROFILE_FORM_EVIDENCE_ORIGIN_DECLARATION}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Situação
            <select
              className={fieldClass}
              value={stance}
              onChange={(event) => setStance(event.target.value as EvidenceStance)}
            >
              {EVIDENCE_STANCES.map((item) => (
                <option key={item} value={item}>
                  {item === "absent"
                    ? PROFILE_FORM_EVIDENCE_STANCE_ABSENT
                    : item === "unknown"
                      ? PROFILE_FORM_EVIDENCE_STANCE_UNKNOWN
                      : PROFILE_FORM_EVIDENCE_STANCE_KNOWN}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Referência da fonte
            <input
              className={fieldClass}
              value={sourceRef}
              onChange={(event) => setSourceRef(event.target.value)}
              placeholder="CV, ficheiro ou nota"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
            Contexto ou projeto
            <input className={fieldClass} value={project} onChange={(event) => setProject(event.target.value)} />
          </label>
          {kind === "experience_period" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                Início (YYYY-MM)
                <input
                  className={fieldClass}
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  placeholder="2023-01"
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                Fim (YYYY-MM ou present)
                <input
                  className={fieldClass}
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  placeholder="2025-06"
                />
              </label>
            </div>
          ) : null}
          {kind === "availability" ? (
            <>
              <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                Faixa de horário
                <input className={fieldClass} value={hoursLabel} onChange={(event) => setHoursLabel(event.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                Fuso
                <input
                  className={fieldClass}
                  value={timezoneLabel}
                  onChange={(event) => setTimezoneLabel(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
                Âmbito da vaga
                <select className={fieldClass} value={relatedJobId} onChange={(event) => setRelatedJobId(event.target.value)}>
                  <option value="">{PROFILE_FORM_EVIDENCE_JOB_SCOPE_NONE}</option>
                  {jobScopes.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          {kind === "availability" ? (
            <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
              Valor declarado
              <select className={fieldClass} value={declaredValue} onChange={(event) => setDeclaredValue(event.target.value)}>
                <option value="can_meet">Consigo cumprir esta faixa</option>
                <option value="cannot_meet">Não consigo cumprir esta faixa</option>
              </select>
            </label>
          ) : null}
          {localError ? (
            <p className="text-sm text-red-200" role="alert">
              {localError}
            </p>
          ) : null}
          <button
            type="button"
            className="justify-self-start text-sm font-medium text-emerald-300 hover:text-emerald-200"
            onClick={() => {
              try {
                const fact = buildRecordedFact({
                  kind,
                  topic,
                  label: kind === "availability" ? hoursLabel : label,
                  origin,
                  stance,
                  sourceRef: sourceRef || undefined,
                  project: project || undefined,
                  declaredValue:
                    kind === "availability" ? declaredValue || "can_meet" : declaredValue || undefined,
                  periodStart: kind === "experience_period" ? periodStart : undefined,
                  periodEnd: kind === "experience_period" ? periodEnd || "present" : undefined,
                  scheduleWindow:
                    kind === "availability"
                      ? { label: hoursLabel, timezoneLabel: timezoneLabel || undefined, dstPolicy: "ambiguous" }
                      : undefined,
                  relatedJobId: kind === "availability" ? relatedJobId || undefined : undefined,
                  technologies:
                    kind === "skill_component"
                      ? [label, "Supabase"]
                      : kind === "joint_skill"
                        ? ["TypeScript", "Node.js"]
                        : undefined,
                });
                onChange([...evidence, fact]);
                setLocalError(null);
                setSourceRef("");
                setProject("");
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : "Não foi possível acrescentar o fato.");
              }
            }}
          >
            {PROFILE_FORM_EVIDENCE_ADD}
          </button>
        </div>
      </div>
    </details>
  );
}
