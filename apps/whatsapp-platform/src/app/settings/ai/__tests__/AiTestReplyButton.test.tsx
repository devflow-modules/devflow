/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiTestReplyButton } from "../AiTestReplyButton";

describe("AiTestReplyButton (settings-ai F0)", () => {
  it("fora do loading: habilitado, label Testar resposta, dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AiTestReplyButton loading={false} onClick={onClick} />);

    const btn = screen.getByRole("button", { name: "Testar resposta" });
    expect(btn).toBeEnabled();
    expect(btn.className).toMatch(/df-btn-primary/);
    expect(btn.className).not.toMatch(/df-btn-disabled/);

    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("em loading: disabled, label A gerar…, não dispara onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AiTestReplyButton loading onClick={onClick} />);

    const btn = screen.getByRole("button", { name: "A gerar…" });
    expect(btn).toBeDisabled();

    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
