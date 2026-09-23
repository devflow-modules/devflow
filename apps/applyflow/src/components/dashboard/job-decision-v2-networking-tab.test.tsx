// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { loadApplicationOutreach, loadDashboardContacts } from "@/lib/local-contact-storage";

import { JobDecisionV2NetworkingTab } from "./job-decision-v2-networking-tab";

const scope = { applicationId: "application-1", jobId: "job-1" };

function Harness() {
  const [, setRevision] = useState(0);
  const contacts = loadApplicationOutreach(scope).contacts;
  return (
    <JobDecisionV2NetworkingTab
      applicationId={scope.applicationId}
      jobId={scope.jobId}
      company="Example Labs"
      contacts={contacts}
      onPersist={() => setRevision((value) => value + 1)}
    />
  );
}

afterEach(() => {
  window.localStorage.clear();
  cleanup();
});

describe("JobDecisionV2NetworkingTab", () => {
  it("registra contato, prepara, envia e marca resposta", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Alex Morgan" } });
    fireEvent.change(screen.getByLabelText("Cargo / headline"), { target: { value: "Talent Partner" } });
    fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "linkedin_inmail" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));

    expect(screen.getByText("Alex Morgan")).toBeTruthy();
    expect(screen.getAllByText("Identificado")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Marcar preparada" }));
    expect(screen.getAllByText("Preparada")).toHaveLength(2);
    expect(loadDashboardContacts().contacts[0]?.sentAt).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Marcar enviada" }));
    expect(screen.getAllByText("Enviada")).toHaveLength(2);
    expect(screen.getByText("1 LinkedIn InMail credit")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Registrar resposta" }));
    expect(screen.getAllByText("Respondida")).toHaveLength(2);

    const stored = loadDashboardContacts();
    expect(stored.contacts[0]?.applicationId).toBe(scope.applicationId);
    expect(stored.contacts[0]?.repliedAt).toBeDefined();
    expect(stored.interactions.map((item) => item.type)).toEqual(["message", "reply"]);
  });

  it("bloqueia criação sem candidatura associada", () => {
    render(
      <JobDecisionV2NetworkingTab
        jobId={scope.jobId}
        company="Example Labs"
        contacts={[]}
        onPersist={() => undefined}
      />,
    );
    expect(screen.getByText(/Registe a candidatura/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adicionar contato" })).toBeNull();
  });
});
