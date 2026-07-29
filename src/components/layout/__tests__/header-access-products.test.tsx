/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderAccessProducts } from "@/components/layout/header-access-products";
import { ACCESS_PRODUCTS_LABEL } from "@/lib/header-product-access";

const trackHeaderCtaClicked = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackHeaderCtaClicked: (...args: unknown[]) => trackHeaderCtaClicked(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("HeaderAccessProducts", () => {
  beforeEach(() => {
    trackHeaderCtaClicked.mockClear();
    delete process.env.NEXT_PUBLIC_WHATSAPP_APP_URL;
    delete process.env.NEXT_PUBLIC_FINANCEIRO_APP_URL;
  });

  it("desktop: Escape fecha o menu e devolve o foco ao botão Acessar produtos", async () => {
    const user = userEvent.setup();
    render(<HeaderAccessProducts surface="desktop" triggerClassName="test-trigger" />);

    const trigger = screen.getByRole("button", { name: /Acessar produtos/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trackHeaderCtaClicked).toHaveBeenCalledWith({
      cta: "acessar_produtos_open",
      surface: "desktop",
    });

    const menu = screen.getByRole("menu", { name: ACCESS_PRODUCTS_LABEL });
    const wa = within(menu).getByRole("menuitem", { name: "WhatsApp Platform" });
    const fin = within(menu).getByRole("menuitem", { name: "Financeiro" });
    expect(wa).toHaveAttribute("href", "/login");
    expect(fin).toHaveAttribute("href", "/ferramentas/financeiro/auth");

    await user.tab();
    expect(wa).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("desktop: clique em destino dispara analytics e fecha o menu", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <HeaderAccessProducts surface="desktop" triggerClassName="t" onNavigate={onNavigate} />
    );

    await user.click(screen.getByRole("button", { name: /Acessar produtos/i }));
    await user.click(screen.getByRole("menuitem", { name: "WhatsApp Platform" }));

    expect(trackHeaderCtaClicked).toHaveBeenCalledWith({
      cta: "acessar_whatsapp",
      surface: "desktop",
    });
    expect(onNavigate).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("mobile: lista ambos os destinos sem dropdown", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <HeaderAccessProducts
        surface="mobile"
        linkClassName="link"
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByTestId("header-access-products-mobile")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Acessar produtos/i })).toBeNull();

    const wa = screen.getByRole("link", { name: "WhatsApp Platform" });
    const fin = screen.getByRole("link", { name: "Financeiro" });
    expect(wa).toHaveAttribute("href", "/login");
    expect(fin).toHaveAttribute("href", "/ferramentas/financeiro/auth");

    await user.click(fin);
    expect(trackHeaderCtaClicked).toHaveBeenCalledWith({
      cta: "acessar_financeiro",
      surface: "mobile",
    });
    expect(onNavigate).toHaveBeenCalled();
  });

  it("desktop: teclado — Tab para o trigger e Enter abre o menu", async () => {
    const user = userEvent.setup();
    render(<HeaderAccessProducts surface="desktop" triggerClassName="t" />);

    await user.tab();
    const trigger = screen.getByRole("button", { name: /Acessar produtos/i });
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
