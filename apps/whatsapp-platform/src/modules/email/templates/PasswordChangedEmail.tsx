import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { emailTheme } from "./emailTheme";

export type PasswordChangedEmailProps = {
  userName?: string;
  supportEmail?: string;
};

export function PasswordChangedEmail({ userName, supportEmail }: PasswordChangedEmailProps) {
  const greeting = userName?.trim() ? `Olá, ${userName.trim()}` : "Olá";
  const contact = supportEmail?.trim() || "suporte@devflowlabs.com.br";

  return (
    <Html>
      <Head />
      <Preview>Sua senha foi alterada</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Section style={emailTheme.card}>
            <Text style={emailTheme.heading}>Senha alterada com sucesso</Text>
            <Text style={emailTheme.text}>
              {greeting}. A palavra-passe da sua conta foi alterada. Se foi você, não precisa fazer mais nada.
            </Text>
            <Text style={emailTheme.text}>
              <strong>Não reconhece esta alteração?</strong> Contacte-nos de imediato em{" "}
              <a href={`mailto:${contact}`} style={{ color: "#2563eb" }}>
                {contact}
              </a>{" "}
              para proteger a sua conta.
            </Text>
          </Section>
          <Text style={emailTheme.footer}>DevFlow — segurança da conta.</Text>
        </Container>
      </Body>
    </Html>
  );
}
