export function inboxLog(
  event: string,
  data: Record<string, string | number | boolean | undefined>
): void {
  console.log(
    JSON.stringify({
      scope: "whatsapp_inbox",
      event,
      ...data,
      ts: new Date().toISOString(),
    })
  );
}
