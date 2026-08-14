"use client";

import { ApplyFlowBadge } from "@/components/ui/ApplyFlowBadge";
import { ApplyFlowButton } from "@/components/ui/ApplyFlowButton";
import { ApplyFlowCard } from "@/components/ui/ApplyFlowCard";
import { ApplyFlowSection } from "@/components/ui/ApplyFlowSection";
import {
  RESUME_LIBRARY_ADD_LABEL,
  RESUME_LIBRARY_DEFAULT_BADGE,
  RESUME_LIBRARY_DELETE_LABEL,
  RESUME_LIBRARY_DESCRIPTION,
  RESUME_LIBRARY_DUPLICATE_HINT,
  RESUME_LIBRARY_EYEBROW,
  RESUME_LIBRARY_IMPORT_LABEL,
  RESUME_LIBRARY_RENAME_LABEL,
  RESUME_LIBRARY_SET_DEFAULT_LABEL,
  RESUME_LIBRARY_TITLE,
  formatResumeUpdatedAt,
} from "@/components/dashboard/resume-library-content";
import type { ResumeLibrary, ResumeVariant } from "@devflow/applyflow-core";
import { useState } from "react";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  "w-full min-w-0 rounded-[var(--af-radius-sm)] border border-[color:var(--af-border-strong)]",
  "bg-[color:var(--af-surface-muted)] px-3 py-2 text-sm text-[color:var(--af-text)]",
  "placeholder:text-[color:var(--af-text-muted)] focus-visible:outline focus-visible:outline-2",
  "focus-visible:outline-offset-2 focus-visible:outline-[var(--af-brand)]",
);

export function ResumeLibraryPanel({
  library,
  error,
  onSetDefault,
  onRename,
  onDelete,
  onDuplicate,
  onImportProfileFile,
}: {
  library: ResumeLibrary;
  error: string | null;
  onSetDefault: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (name: string) => void;
  onImportProfileFile: (file: File | null) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  return (
    <ApplyFlowSection
      id="resume-library"
      eyebrow={RESUME_LIBRARY_EYEBROW}
      title={RESUME_LIBRARY_TITLE}
      description={RESUME_LIBRARY_DESCRIPTION}
    >
      <div className="grid gap-3">
        {library.variants.map((variant) => (
          <ResumeVariantRow
            key={variant.id}
            variant={variant}
            canDelete={library.variants.length > 1 && !variant.isDefault}
            editing={editingId === variant.id}
            draftName={draftName}
            onDraftName={setDraftName}
            onStartRename={() => {
              setEditingId(variant.id);
              setDraftName(variant.name);
            }}
            onCancelRename={() => setEditingId(null)}
            onSaveRename={() => {
              onRename(variant.id, draftName);
              setEditingId(null);
            }}
            onSetDefault={() => onSetDefault(variant.id)}
            onDelete={() => onDelete(variant.id)}
          />
        ))}
      </div>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onDuplicate(newName.trim() || `Cópia de ${library.variants.find((item) => item.isDefault)?.name ?? "currículo"}`);
          setNewName("");
        }}
      >
        <label className="grid gap-1.5 text-sm text-[color:var(--af-text)]">
          Nome da nova variante
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            className={fieldClass}
            placeholder="Product Engineer"
            maxLength={80}
          />
        </label>
        <ApplyFlowButton type="submit" variant="primary" size="md">
          {RESUME_LIBRARY_ADD_LABEL}
        </ApplyFlowButton>
      </form>
      <p className="mt-2 text-xs text-[color:var(--af-text-muted)]">{RESUME_LIBRARY_DUPLICATE_HINT}</p>

      <div className="mt-4">
        <label className={cn(fieldClass, "inline-flex cursor-pointer items-center justify-center text-sm")}>
          {RESUME_LIBRARY_IMPORT_LABEL}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              onImportProfileFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {error ? (
        <ApplyFlowCard variant="danger" padding="md" role="alert" className="mt-4">
          <p className="text-sm text-red-100/90">{error}</p>
        </ApplyFlowCard>
      ) : null}
    </ApplyFlowSection>
  );
}

function ResumeVariantRow({
  variant,
  canDelete,
  editing,
  draftName,
  onDraftName,
  onStartRename,
  onCancelRename,
  onSaveRename,
  onSetDefault,
  onDelete,
}: {
  variant: ResumeVariant;
  canDelete: boolean;
  editing: boolean;
  draftName: string;
  onDraftName: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <ApplyFlowCard padding="md" variant={variant.isDefault ? "highlight" : "default"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <input
                value={draftName}
                onChange={(event) => onDraftName(event.target.value)}
                className={fieldClass}
                aria-label={RESUME_LIBRARY_RENAME_LABEL}
              />
            ) : (
              <p className="text-sm font-medium text-[color:var(--af-text)]">{variant.name}</p>
            )}
            {variant.isDefault ? <ApplyFlowBadge tone="brand">{RESUME_LIBRARY_DEFAULT_BADGE}</ApplyFlowBadge> : null}
          </div>
          <p className="mt-1 text-xs text-[color:var(--af-text-muted)]">
            Actualizado {formatResumeUpdatedAt(variant.updatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <ApplyFlowButton type="button" variant="primary" size="sm" onClick={onSaveRename}>
                Guardar
              </ApplyFlowButton>
              <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={onCancelRename}>
                Cancelar
              </ApplyFlowButton>
            </>
          ) : (
            <>
              {!variant.isDefault ? (
                <ApplyFlowButton type="button" variant="secondary" size="sm" onClick={onSetDefault}>
                  {RESUME_LIBRARY_SET_DEFAULT_LABEL}
                </ApplyFlowButton>
              ) : null}
              <ApplyFlowButton type="button" variant="ghost" size="sm" onClick={onStartRename}>
                {RESUME_LIBRARY_RENAME_LABEL}
              </ApplyFlowButton>
              <ApplyFlowButton
                type="button"
                variant="dangerGhost"
                size="sm"
                disabled={!canDelete}
                title={
                  canDelete
                    ? undefined
                    : variant.isDefault
                      ? "Define outro currículo como padrão antes de excluir este."
                      : "Não podes excluir o único currículo."
                }
                onClick={onDelete}
              >
                {RESUME_LIBRARY_DELETE_LABEL}
              </ApplyFlowButton>
            </>
          )}
        </div>
      </div>
    </ApplyFlowCard>
  );
}
