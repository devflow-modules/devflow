import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createInternalNote: vi.fn(),
  getAuth: vi.fn(),
  listInternalNotes: vi.fn(),
}));

vi.mock("@/modules/auth", () => ({
  getAuthFromRequest: (...args: unknown[]) => mocks.getAuth(...args),
}));

vi.mock("@/modules/inbox", () => ({
  createInternalNote: (...args: unknown[]) => mocks.createInternalNote(...args),
  listInternalNotes: (...args: unknown[]) => mocks.listInternalNotes(...args),
}));

const auth = {
  payload: {
    tenantId: "tenant-1",
    sub: "operator-1",
    role: "operator",
  },
};

const note = {
  id: "note-1",
  body: "Confirmar prazo",
  userId: "operator-1",
  authorName: "Operador",
  createdAt: "2026-07-27T15:00:00.000Z",
  updatedAt: "2026-07-27T15:00:00.000Z",
};

function request(method: "GET" | "POST", body?: unknown) {
  return new NextRequest("http://localhost/api/inbox/conversations/thread-1/internal-notes", {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

describe("/api/inbox/conversations/[id]/internal-notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuth.mockResolvedValue(auth);
    mocks.listInternalNotes.mockResolvedValue([note]);
    mocks.createInternalNote.mockResolvedValue(note);
  });

  it("GET retorna 401 sem autenticação", async () => {
    mocks.getAuth.mockResolvedValue(null);
    const { GET } = await import("../route");

    const response = await GET(request("GET"), {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.listInternalNotes).not.toHaveBeenCalled();
  });

  it("GET lista notas usando tenant e thread da sessão", async () => {
    const { GET } = await import("../route");

    const response = await GET(request("GET"), {
      params: Promise.resolve({ id: "thread-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.listInternalNotes).toHaveBeenCalledWith("tenant-1", "thread-1");
    expect(json).toEqual({
      success: true,
      data: { notes: [note] },
    });
  });

  it("POST retorna 401 sem autenticação", async () => {
    mocks.getAuth.mockResolvedValue(null);
    const { POST } = await import("../route");

    const response = await POST(request("POST", { body: "Nota" }), {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.createInternalNote).not.toHaveBeenCalled();
  });

  it("POST retorna 400 para body inválido", async () => {
    const { POST } = await import("../route");

    const response = await POST(request("POST", { body: "" }), {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.createInternalNote).not.toHaveBeenCalled();
  });

  it("POST retorna 404 quando a conversa não pertence ao tenant", async () => {
    mocks.createInternalNote.mockResolvedValue(null);
    const { POST } = await import("../route");

    const response = await POST(request("POST", { body: "Nota interna" }), {
      params: Promise.resolve({ id: "thread-other-tenant" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.createInternalNote).toHaveBeenCalledWith(
      "tenant-1",
      "thread-other-tenant",
      "operator-1",
      "Nota interna"
    );
  });

  it("POST cria nota com autor e tenant derivados da sessão", async () => {
    const { POST } = await import("../route");

    const response = await POST(request("POST", { body: "Confirmar prazo" }), {
      params: Promise.resolve({ id: "thread-1" }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.createInternalNote).toHaveBeenCalledWith(
      "tenant-1",
      "thread-1",
      "operator-1",
      "Confirmar prazo"
    );
    expect(json).toEqual({
      success: true,
      data: { note },
    });
  });
});
