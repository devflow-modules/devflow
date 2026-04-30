/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsappPhoneNumberStatus } from "@/generated/prisma-whatsapp";
import type { PendingChannelRow } from "@/modules/whatsapp/channelActivationService";
import { ActivationQueueTable } from "../ActivationQueueTable";

function baseRow(over: Partial<PendingChannelRow> & Pick<PendingChannelRow, "id">): PendingChannelRow {
  return {
    tenantId: "t1",
    phoneNumber: "+351",
    phoneNumberId: "pn",
    tenantName: "Acme",
    status: WhatsappPhoneNumberStatus.PENDING_ACTIVATION,
    createdAt: "2026-04-14T10:00:00.000Z",
    updatedAt: "2026-04-14T10:00:00.000Z",
    activatedAt: null,
    minutesInQueue: 10,
    slaStatus: "ok",
    possiblyStuck: false,
    priorityScore: 1,
    autoHealAttempts: 0,
    lastAutoHealAt: null,
    autoHealStatus: "DISABLED",
    ...over,
  };
}

describe("ActivationQueueTable", () => {
  it("canal crítico mostra aviso de ação imediata", () => {
    render(
      <ActivationQueueTable
        filter="all"
        items={[baseRow({ id: "c1", slaStatus: "critical", minutesInQueue: 42 })]}
        onActivate={vi.fn()}
        onRefresh={vi.fn()}
        onOpenTimeline={vi.fn()}
      />
    );
    expect(screen.getByText(/Ação imediata necessária/i)).toBeInTheDocument();
  });

  it("possiblyStuck mostra tag e tooltip", () => {
    render(
      <ActivationQueueTable
        filter="all"
        items={[baseRow({ id: "c2", possiblyStuck: true })]}
        onActivate={vi.fn()}
        onRefresh={vi.fn()}
        onOpenTimeline={vi.fn()}
      />
    );
    const tags = screen.getAllByText("Possível travamento");
    const warningTag = tags.find((el) => el.className.includes("df-badge-warning"));
    expect(warningTag).toBeDefined();
    expect(warningTag).toHaveAttribute("title", "Sem atualização há mais de 15 minutos");
  });

  it("mostra sugestão disponível quando playbookAvailable", () => {
    render(
      <ActivationQueueTable
        filter="all"
        items={[
          baseRow({
            id: "c4",
            playbookAvailable: true,
            lastEvent: { type: "ERROR", message: "invalid token" },
          }),
        ]}
        onActivate={vi.fn()}
        onRefresh={vi.fn()}
        onOpenTimeline={vi.fn()}
      />
    );
    expect(screen.getByTestId("playbook-hint-c4")).toHaveTextContent(/Sugestão disponível/i);
  });

  it("último evento ERROR destaca linha e Timeline chama callback", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <ActivationQueueTable
        filter="all"
        items={[
          baseRow({
            id: "c3",
            lastEvent: { type: "ERROR", message: "Falha na API" },
            alerts: [
              {
                level: "warning",
                message: "Último erro: Falha na API",
              },
            ],
          }),
        ]}
        onActivate={vi.fn()}
        onRefresh={vi.fn()}
        onOpenTimeline={onOpen}
      />
    );
    const row = screen.getByTestId("pending-row-c3");
    expect(row.className).toContain("bg-[color:var(--df-danger-bg)]");
    expect(row.className).toContain("ring-[color:var(--df-danger-border)]");
    await user.click(within(row).getByRole("button", { name: /Timeline/i }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "c3" }));
  });
});
