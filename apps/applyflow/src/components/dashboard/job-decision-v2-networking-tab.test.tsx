// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  vi.restoreAllMocks();
});

describe("JobDecisionV2NetworkingTab", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("registra contato, prepara, envia e marca resposta", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Alex Morgan" } });
    fireEvent.change(screen.getByLabelText("Cargo / headline"), { target: { value: "Talent Partner" } });
    fireEvent.change(screen.getByLabelText("Canal"), { target: { value: "linkedin_inmail" } });
    fireEvent.change(screen.getByLabelText("Edit message"), {
      target: { value: "Hello Alex" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));

    expect(screen.getByText("Alex Morgan")).toBeTruthy();
    expect(screen.getAllByText("Identificado")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Mark ready" }));
    expect(screen.getAllByText("Ready")).toHaveLength(2);
    expect(loadDashboardContacts().contacts[0]?.sentAt).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Mark as sent" }));
    expect(screen.getAllByText("Enviada")).toHaveLength(2);
    expect(screen.getByText("1 LinkedIn InMail credit")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark as replied" }));
    expect(screen.getAllByText("Respondida")).toHaveLength(2);

    const stored = loadDashboardContacts();
    expect(stored.contacts[0]?.applicationId).toBe(scope.applicationId);
    expect(stored.contacts[0]?.repliedAt).toBeDefined();
    expect(stored.contacts[0]?.role).toBe("Talent Partner");
    expect(stored.contacts[0]?.company).toBe("Example Labs");
    expect(stored.interactions.map((item) => item.type)).toEqual(["message", "reply"]);
  });

  it("permite networking job-scoped sem candidatura", () => {
    render(
      <JobDecisionV2NetworkingTab
        jobId={scope.jobId}
        company="Example Labs"
        contacts={[]}
        onPersist={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Adicionar contato" })).toBeTruthy();
  });

  it("exibe contatos da vaga mesmo sem applicationId no viewer", () => {
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

    expect(screen.getByText("Scoped Contact")).toBeTruthy();
  });

  it("migra contato legado para o escopo ao usar ação rápida", () => {
    const legacyContact: Contact = {
      id: "legacy-contact",
      jobId: scope.jobId,
      name: "Legacy Contact",
      role: "Recruiter",
      type: "recruiter",
      status: "not_contacted",
      messageContent: "Hi legacy",
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    };
    persistDashboardContacts([legacyContact], []);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Mark ready" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Mark as replied" }));

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
    fireEvent.change(screen.getByLabelText("Edit message"), { target: { value: "Draft message" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "MESSAGE_PREPARED" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));

    const markSent = screen.getByRole("button", { name: "Mark as sent" });
    fireEvent.click(markSent);
    fireEvent.click(markSent);

    expect(loadDashboardContacts().interactions.filter((item) => item.type === "message")).toHaveLength(1);
  });

  it("não marca Sent quando a confirmação humana é cancelada", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const contact: Contact = {
      id: "confirm-contact",
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      name: "Confirm Contact",
      type: "recruiter",
      status: "MESSAGE_PREPARED",
      messageContent: "Ready to send",
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    };
    persistDashboardContacts([contact], []);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Mark as sent" }));
    expect(loadDashboardContacts().contacts[0]?.status).toBe("MESSAGE_PREPARED");
    expect(loadDashboardContacts().contacts[0]?.sentAt).toBeUndefined();
  });

  it("copia a mensagem atual exatamente sem alterar status para Sent", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const contact: Contact = {
      id: "copy-contact",
      applicationId: scope.applicationId,
      jobId: scope.jobId,
      name: "Copy Contact",
      type: "recruiter",
      status: "MESSAGE_PREPARED",
      messageContent: "Exact outreach copy",
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-20T12:00:00.000Z",
    };
    persistDashboardContacts([contact], []);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));
    expect(writeText).toHaveBeenCalledWith("Exact outreach copy");
    expect(loadDashboardContacts().contacts[0]?.status).toBe("MESSAGE_PREPARED");
    expect(loadDashboardContacts().contacts[0]?.sentAt).toBeUndefined();
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
