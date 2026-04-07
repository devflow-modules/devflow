import { describe, it, expect, vi, beforeEach } from "vitest";
import { WaInboxThreadStatus } from "@/generated/prisma-whatsapp";

const mockFindMany = vi.fn();
const mockListTenants = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    waInboxThread: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

vi.mock("@/modules/tenants", () => ({ listTenants: (...args: unknown[]) => mockListTenants(...args) }));

describe("GET /api/admin/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTenants.mockResolvedValue([{ id: "t1" }]);
    mockFindMany.mockResolvedValue([
      {
        id: "th1",
        phoneNumber: "5511999999999",
        contactName: "Cliente",
        lastMessagePreview: "Oi",
        lastMessageAt: new Date("2025-01-01T12:00:00Z"),
        unreadCount: 0,
        status: WaInboxThreadStatus.OPEN,
      },
    ]);
  });

  it("retorna conversas e total sem filtro de status", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/conversations");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversations).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t1" }),
      })
    );
  });

  it("filtra por status quando query status=OPEN", async () => {
    const { GET } = await import("../route");
    const req = new Request("http://localhost/api/admin/conversations?status=OPEN");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "t1", status: WaInboxThreadStatus.OPEN },
      })
    );
  });
});
