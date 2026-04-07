import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Esqueci minha senha | WhatsApp Platform",
  description: "Pedir link para redefinir senha",
  robots: "noindex, nofollow",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
