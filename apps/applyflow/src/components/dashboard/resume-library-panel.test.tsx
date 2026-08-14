import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ResumeLibraryPanel } from "./resume-library-panel";
import {
  RESUME_LIBRARY_ADD_LABEL,
  RESUME_LIBRARY_DEFAULT_BADGE,
  RESUME_LIBRARY_TITLE,
} from "./resume-library-content";
import { createResumeLibraryFromProfile, gustavoProfile } from "@devflow/applyflow-core";

describe("ResumeLibraryPanel", () => {
  it("mostra a lista local com badge Padrão e acção de adicionar", () => {
    const library = createResumeLibraryFromProfile(gustavoProfile, {
      now: new Date("2026-08-14T12:00:00.000Z"),
    });
    const html = renderToStaticMarkup(
      <ResumeLibraryPanel
        library={library}
        error={null}
        onSetDefault={() => undefined}
        onRename={() => undefined}
        onDelete={() => undefined}
        onDuplicate={() => undefined}
        onImportProfileFile={() => undefined}
      />,
    );
    expect(html).toContain(RESUME_LIBRARY_TITLE);
    expect(html).toContain(RESUME_LIBRARY_DEFAULT_BADGE);
    expect(html).toContain("Perfil principal");
    expect(html).toContain(RESUME_LIBRARY_ADD_LABEL);
    expect(html).not.toContain("melhor currículo");
    expect(html).not.toContain("Currículo recomendado");
  });
});
