import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import * as React from "react";
import { WelcomeEmail } from "../templates/WelcomeEmail";
import { ResetPasswordEmail } from "../templates/ResetPasswordEmail";

describe("templates React Email", () => {
  it("WelcomeEmail inclui CTA e nome", async () => {
    const html = await render(
      <WelcomeEmail userName="João" loginUrl="https://app.test/login" />
    );
    expect(html).toContain("Bem-vindo");
    expect(html).toContain("João");
    expect(html).toContain("https://app.test/login");
  });

  it("ResetPasswordEmail inclui botão e URL", async () => {
    const html = await render(
      <ResetPasswordEmail userName="Maria" resetUrl="https://app.test/r?token=x" />
    );
    expect(html).toContain("Redefinição de senha");
    expect(html).toContain("Maria");
    expect(html).toContain("https://app.test/r?token=x");
  });
});
