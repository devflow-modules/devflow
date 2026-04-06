/**
 * Rotas que permanecem no portal (marketing / SEO / produto).
 * Não redirecionar para o app quando NEXT_PUBLIC_WHATSAPP_APP_URL estiver definida.
 */
export function isWhatsappLandingOrPublicPath(pathname: string): boolean {
  const path = normalizePath(pathname);

  if (path.startsWith("/produtos/whatsapp-platform")) return true;

  if (
    path === "/automacao-whatsapp" ||
    path.startsWith("/automacao-whatsapp/")
  ) {
    return true;
  }
  if (
    path === "/software-atendimento-whatsapp" ||
    path.startsWith("/software-atendimento-whatsapp/")
  ) {
    return true;
  }
  if (path === "/chatbot-whatsapp" || path.startsWith("/chatbot-whatsapp/")) {
    return true;
  }

  return false;
}

function normalizePath(pathname: string): string {
  if (pathname !== "/" && pathname.endsWith("/")) return pathname.slice(0, -1) || "/";
  return pathname || "/";
}
