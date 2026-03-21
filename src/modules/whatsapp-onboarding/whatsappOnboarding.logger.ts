type LogLevel = "info" | "warn" | "error";

function mask(s: string | undefined, keep = 4): string {
  if (!s || s.length <= keep) return "[redacted]";
  return `${s.slice(0, 2)}…${s.slice(-keep)}`;
}

export const onboardingLog = {
  event(
    level: LogLevel,
    op: string,
    data: Record<string, unknown> & {
      token?: string;
      code?: string;
      pin?: string;
    }
  ) {
    const { token, code, pin, ...rest } = data;
    const safe = {
      ...rest,
      ...(token !== undefined && { tokenPreview: mask(token) }),
      ...(code !== undefined && { codeReceived: true }),
      ...(pin !== undefined && { pinSet: true }),
    };
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      scope: "whatsapp-onboarding",
      level,
      op,
      ...safe,
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
};
