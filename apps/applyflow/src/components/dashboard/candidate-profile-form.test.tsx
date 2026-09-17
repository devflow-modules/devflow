import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { CandidateProfileForm } from "./candidate-profile-form";
import {
  PROFILE_FORM_EVIDENCE_SUMMARY,
  PROFILE_FORM_HINT,
  PROFILE_FORM_SAVE_LABEL,
  PROFILE_FORM_SALARY_SUMMARY,
} from "./candidate-profile-form-content";
import { RESUME_LIBRARY_CREATE_LABEL } from "./resume-library-content";
import { ResumeLibraryPanel } from "./resume-library-panel";

describe("CandidateProfileForm", () => {
  it("mostra cadastro mínimo sem exigir salário nem JSON", () => {
    const html = renderToStaticMarkup(
      <CandidateProfileForm onCancel={() => undefined} onSave={() => ({ ok: true })} />,
    );
    expect(html).toContain(PROFILE_FORM_HINT);
    expect(html).toContain(PROFILE_FORM_SAVE_LABEL);
    expect(html).toContain(PROFILE_FORM_SALARY_SUMMARY);
    expect(html).toContain(PROFILE_FORM_EVIDENCE_SUMMARY);
    expect(html).toContain("Não informado");
    expect(html).not.toContain("gustavoProfile");
  });
});

describe("ResumeLibraryPanel empty", () => {
  it("oferece Cadastrar perfil como acção principal", () => {
    const html = renderToStaticMarkup(
      <ResumeLibraryPanel
        library={null}
        error={null}
        onSetDefault={() => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
        onDuplicate={() => undefined}
        onImportProfileFile={() => undefined}
        onSaveProfile={() => ({ ok: true })}
      />,
    );
    expect(html).toContain(RESUME_LIBRARY_CREATE_LABEL);
    expect(html).toContain("Importar perfil JSON");
  });
});
