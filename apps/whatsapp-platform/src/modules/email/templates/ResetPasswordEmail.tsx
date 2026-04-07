import { Body, Button, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import * as React from "react";
import { emailTheme } from "./emailTheme";

export type ResetPasswordEmailProps = {
  userName?: string;
  resetUrl: string;
};

export function ResetPasswordEmail({ userName, resetUrl }: ResetPasswordEmailProps) {
  const greeting = userName?.trim() ? `Olá, ${userName.trim()}` : "Olá";

  return (
    <Html>
      <Head />
      <Preview>Redefina sua senha</Preview>
      <Body style={emailTheme.main}>
        <Container style={emailTheme.container}>
          <Section style={emailTheme.card}>
            <Text style={emailTheme.heading}>Redefinição de senha</Text>
            <Text style={emailTheme.text}>
              {greeting}. Recebemos um pedido para redefinir a senha da sua conta na plataforma DevFlow.
            </Text>
            <Text style={emailTheme.text}>O link abaixo expira em cerca de 1 hora por motivos de segurança.</Text>
            <Section style={{ margin: "20px 0" }}>
              <Button href={resetUrl} style={emailTheme.button}>
                Redefinir senha
              </Button>
            </Section>
            <Text style={emailTheme.muted}>
              Se o botão não funcionar, copie e cole este endereço no navegador (sem partilhar com terceiros):
            </Text>
            <Text style={{ ...emailTheme.muted, wordBreak: "break-all" as const }}>{resetUrl}</Text>
            <Text style={emailTheme.muted}>
              Se não foi você, pode ignorar este e-mail. A sua palavra-passe não será alterada.
            </Text>
          </Section>
          <Text style={emailTheme.footer}>DevFlow — mensagem transacional automática.</Text>
        </Container>
      </Body>
    </Html>
  );
}
