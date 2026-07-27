import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createNote: vi.fn(),
  findNotes: vi.fn(),
  findThread: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxInternalNote: {
      create: (...args: unknown[]) => mocks.createNote(...args),
      findMany: (...args: unknown[]) => mocks.findNotes(...args),
    },
    waInboxThread: {
      findFirst: (...args: unknown[]) => mocks.findThread(...args),
    },
  },
}));

vi.mock("../auditService", () => ({
  logAction: (...args: unknown[]) => mocks.logAction(...args),
}));

const createdAt = new Date("2026-07-27T15:00:00.000Z");
const updatedAt = new Date("2026-07-27T15:01:00.000Z");

const noteRow = {
  id: "note-1",
  tenantId: "tenant-1",
  threadId: "thread-1",
  userId: "operator-1",
  body: "Confirmar prazo com o cliente",
  createdAt,
  updatedAt,
  user: { name: "Operador" },
};

describe("internalNoteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findNotes.mockResolvedValue([noteRow]);
    mocks.findThread.mockResolvedValue({ id: "thread-1" });
    mocks.createNote.mockResolvedValue(noteRow);
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("lista notas por tenant e thread em ordem decrescente", async () => {
    const { listInternalNotes } = await import("../internalNoteService");

    const notes = await listInternalNotes("tenant-1", "thread-1");

    expect(mocks.findNotes).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", threadId: "thread-1" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
      take: 200,
    });
    expect(notes).toEqual([
      {
        id: "note-1",
        body: "Confirmar prazo com o cliente",
        userId: "operator-1",
        authorName: "Operador",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ]);
  });

  it("cria nota trimada no tenant da conversa e audita apenas preview", async () => {
    const { createInternalNote } = await import("../internalNoteService");

    const note = await createInternalNote(
      "tenant-1",
      "thread-1",
      "operator-1",
      "  Confirmar prazo com o cliente  "
    );

    expect(mocks.findThread).toHaveBeenCalledWith({
      where: { id: "thread-1", tenantId: "tenant-1" },
      select: { id: true },
    });
    expect(mocks.createNote).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        threadId: "thread-1",
        userId: "operator-1",
        body: "Confirmar prazo com o cliente",
      },
      include: { user: { select: { name: true } } },
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      "tenant-1",
      "thread-1",
      "operator-1",
      "internal_note_create",
      {
        noteId: "note-1",
        preview: "Confirmar prazo com o cliente",
      }
    );
    expect(note).toEqual({
      id: "note-1",
      body: "Confirmar prazo com o cliente",
      userId: "operator-1",
      authorName: "Operador",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });

  it("não cria nota quando a conversa não pertence ao tenant", async () => {
    mocks.findThread.mockResolvedValue(null);
    const { createInternalNote } = await import("../internalNoteService");

    const note = await createInternalNote(
      "tenant-1",
      "thread-other-tenant",
      "operator-1",
      "Nota interna"
    );

    expect(note).toBeNull();
    expect(mocks.findThread).toHaveBeenCalledWith({
      where: { id: "thread-other-tenant", tenantId: "tenant-1" },
      select: { id: true },
    });
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalled();
  });

  it("ignora texto vazio sem consultar ou persistir", async () => {
    const { createInternalNote } = await import("../internalNoteService");

    const note = await createInternalNote("tenant-1", "thread-1", "operator-1", "   ");

    expect(note).toBeNull();
    expect(mocks.findThread).not.toHaveBeenCalled();
    expect(mocks.createNote).not.toHaveBeenCalled();
    expect(mocks.logAction).not.toHaveBeenCalled();
  });
});
