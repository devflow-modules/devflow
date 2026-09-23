// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadApplicationOutreach,
  loadDashboardContacts,
  persistDashboardContacts,
} from "@/lib/local-contact-storage";
import type { Contact } from "@devflow/applyflow-core";

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
    expect(stored.contacts[0]?.role).toBe("Talent Partner");
    expect(stored.contacts[0]?.company).toBe("Example Labs");
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

  it("não exibe contatos scoped quando a vaga ainda não tem candidatura", () => {
    const scopedContact: Contact = {
      id: "contact-scoped",
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      name: "Scoped Contact",
      type: "recruiter",
      status: "IDENTIFIED",
      createdAt: "2026-09-23T12:00:00.000Z",
      updatedAt: "2026-09-23T12:00:00.000Z",
    };

    render(
      <JobDecisionV2NetworkingTab
        jobId={scope.jobId}
        company="Example Labs"
        contacts={[scopedContact]}
        onPersist={() => undefined}
      />,
    );

    expect(screen.queryByText("Scoped Contact")).toBeNull();
    expect(screen.getByText("0 contatos")).toBeTruthy();
  });

  it("migra contato legado para o escopo ao usar ação rápida", () => {
    const legacyContact: Contact = {
      id: "legacy-contact",
      jobId: scope.jobId,
      name: "Legacy Contact",
      role: "Recruiter",
      type: "recruiter",
      status: "not_contacted",
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    };
    persistDashboardContacts([legacyContact], []);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar preparada" }));

    const stored = loadDashboardContacts().contacts[0];
    expect(stored?.applicationId).toBe(scope.applicationId);
    expect(stored?.status).toBe("MESSAGE_PREPARED");
    expect(stored?.role).toBe("Recruiter");
  });

  it("registra resposta em contato legado enviado sem sentAt", () => {
    const legacyContact: Contact = {
      id: "legacy-sent",
      jobId: scope.jobId,
      name: "Legacy Sent Contact",
      role: "Recruiter",
      type: "recruiter",
      status: "messaged",
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    };
    persistDashboardContacts([legacyContact], []);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar resposta" }));

    const stored = loadDashboardContacts().contacts[0];
    expect(stored?.applicationId).toBe(scope.applicationId);
    expect(stored?.status).toBe("REPLIED");
    expect(stored?.sentAt).toBeDefined();
    expect(stored?.repliedAt).toBeDefined();
    expect(stored?.role).toBe("Recruiter");
  });

  it("mantém uma única interação quando marcar enviada é acionado duas vezes", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Double Click Contact" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "MESSAGE_PREPARED" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));

    const markSent = screen.getByRole("button", { name: "Marcar enviada" });
    fireEvent.click(markSent);
    fireEvent.click(markSent);

    expect(loadDashboardContacts().interactions.filter((item) => item.type === "message")).toHaveLength(1);
  });

  it("registra timestamps coerentes ao criar uma conversa em andamento", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Conversation Contact" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "CONVERSATION" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));

    const stored = loadDashboardContacts().contacts[0];
    expect(stored?.status).toBe("CONVERSATION");
    expect(stored?.sentAt).toBeDefined();
    expect(stored?.repliedAt).toBeDefined();
    expect(screen.getByText("Enviados: 1")).toBeTruthy();
    expect(screen.getByText("Respostas: 1")).toBeTruthy();
  });
});
