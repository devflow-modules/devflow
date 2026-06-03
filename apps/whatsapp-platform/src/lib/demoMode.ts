/**
 * Modo vitrine (portfólio / recrutadores): UI e APIs mockadas.
 * Distinto de `WHATSAPP_DEMO_MODE` (resposta rule-based "demo" no webhook).
 *
 * Ativar: `NEXT_PUBLIC_DEMO_MODE=true` no build/dev (reiniciar `pnpm dev`).
 */
export function isShowcaseDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
