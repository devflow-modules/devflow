import { describe, expect, it } from "vitest";

import { jobAnalysisPath, nextInboxDraftAfterEvaluate } from "./job-inbox-evaluate";

describe("nextInboxDraftAfterEvaluate", () => {
  const draft = {
    description: "React Engineer\n- 3+ years of professional experience working with React.",
    title: "React Engineer",
    company: "Acme",
    url: "https://jobs.example.com/acme/role",
  };

  it("limpa o formulário só depois de um cadastro novo com sucesso", () => {
    expect(nextInboxDraftAfterEvaluate("added", draft)).toEqual({
      description: "",
      title: "",
      company: "",
      url: "",
    });
  });

  it("preserva o formulário em erro, conteúdo repetido ou URL já cadastrada", () => {
    expect(nextInboxDraftAfterEvaluate("error", draft)).toEqual(draft);
    expect(nextInboxDraftAfterEvaluate("duplicate_content", draft)).toEqual(draft);
    expect(nextInboxDraftAfterEvaluate("duplicate_url", draft)).toEqual(draft);
  });
});

describe("jobAnalysisPath", () => {
  it("aponta para a análise da vaga correcta sem perder o id", () => {
    expect(jobAnalysisPath("job_mtylpciv_5tq43jcc")).toBe("/dashboard/jobs/job_mtylpciv_5tq43jcc");
    expect(jobAnalysisPath("job/with extra")).toBe("/dashboard/jobs/job%2Fwith%20extra");
  });
});
