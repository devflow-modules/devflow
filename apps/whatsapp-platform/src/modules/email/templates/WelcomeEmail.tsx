import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { emailTheme } from "./emailTheme";

export type WelcomeEmailProps = {
  userName?: string;
  loginUrl: string;
};

export function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  const greeting = userName?.trim() ? `Bem-vindo, ${userName.trim()}` : "Bem-vindo";

  return (
    <Html>
      <Head />
      <Preview>Bem-vindo à plataforma</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Section style={emailTheme.card}>
            <Text style={emailTheme.heading}>{greeting}</Text>
            <Text style={emailTheme.text}>
              A sua conta está pronta. Aceda à plataforma DevFlow para configurar o WhatsApp Business e começar a
              trabalhar com a sua equipa.
            </Text>
            <Section style={{ margin: "20px 0" }}>
              <Button href={loginUrl} style={emailTheme.button}>
                Entrar na plataforma
              </Button>
            </Section>
            <Text style={emailTheme.muted}>Precisa de ajuda? Responda a este e-mail ou fale com o suporte.</Text>
          </Section>
          <Text style={emailTheme.footer}>DevFlow</Text>
        </Container>
      </Body>
    </Html>
  );
}
