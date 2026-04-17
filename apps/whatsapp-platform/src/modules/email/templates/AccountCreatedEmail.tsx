import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { emailTheme } from "./emailTheme";

export type AccountCreatedEmailProps = {
  userName?: string;
  loginUrl: string;
  email: string;
  /** @deprecated Preferir `setPasswordUrl` (definição de senha por link seguro). */
  temporaryPassword?: string;
  setPasswordUrl?: string;
};

export function AccountCreatedEmail({
  userName,
  loginUrl,
  email,
  temporaryPassword,
  setPasswordUrl,
}: AccountCreatedEmailProps) {
  const greeting = userName?.trim() ? `Olá, ${userName.trim()}` : "Olá";

  return (
    <Html>
      <Head />
      <Preview>Sua conta foi criada</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Section style={emailTheme.card}>
            <Text style={emailTheme.heading}>Conta criada</Text>
            <Text style={emailTheme.text}>
              {greeting}. A sua conta na plataforma DevFlow foi criada com o e-mail <strong>{email}</strong>.
            </Text>
            {setPasswordUrl ? (
              <>
                <Text style={emailTheme.text}>
                  Defina a sua palavra-passe de forma segura através do botão abaixo.
                </Text>
                <Section style={{ margin: "20px 0" }}>
                  <Button href={setPasswordUrl} style={emailTheme.button}>
                    Definir palavra-passe
                  </Button>
                </Section>
              </>
            ) : temporaryPassword ? (
              <Text style={emailTheme.text}>
                {/* Preferir evolução futura: só setPasswordUrl, sem senha temporária no e-mail. */}
                Utilize a palavra-passe temporária que lhe foi comunicada por um canal seguro e altere-a após o
                primeiro acesso.
              </Text>
            ) : (
              <Text style={emailTheme.text}>Já pode aceder à plataforma com as credenciais que definiu.</Text>
            )}
            <Section style={{ margin: "20px 0" }}>
              <Button href={loginUrl} style={emailTheme.button}>
                Aceder à plataforma
              </Button>
            </Section>
          </Section>
          <Text style={emailTheme.footer}>DevFlow — onboarding.</Text>
        </Container>
      </Body>
    </Html>
  );
}
