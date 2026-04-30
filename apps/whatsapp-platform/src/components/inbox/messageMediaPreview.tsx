import type { WaInboxMessageRow } from "./inboxTypes";

function typeLabel(messageType: string): string {
  const u = messageType.toUpperCase();
  if (u === "IMAGE" || u.includes("IMAGE")) return "Imagem";
  if (u === "AUDIO" || u.includes("AUDIO")) return "Áudio";
  if (u === "VIDEO" || u.includes("VIDEO")) return "Vídeo";
  if (u === "DOCUMENT" || u.includes("DOCUMENT")) return "Documento";
  if (u.includes("STICKER")) return "Sticker";
  if (u.includes("LOCATION")) return "Localização";
  if (u.includes("CONTACT")) return "Contacto";
  if (u === "UNKNOWN") return "Mídia";
  return messageType.replace(/_/g, " ");
}

function pickString(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const r = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function findHttpUrl(obj: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (typeof obj === "string" && /^https?:\/\//i.test(obj)) return obj;
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const x of obj) {
      const u = findHttpUrl(x, depth + 1);
      if (u) return u;
    }
    return null;
  }
  const r = obj as Record<string, unknown>;
  for (const v of Object.values(r)) {
    const u = findHttpUrl(v, depth + 1);
    if (u) return u;
  }
  return null;
}

export function isNonTextMessage(message: WaInboxMessageRow): boolean {
  const t = message.messageType.toUpperCase();
  return t !== "TEXT" && t !== "";
}

export function MessageMediaPreview({
  message,
  outbound,
}: {
  message: WaInboxMessageRow;
  outbound: boolean;
}) {
  const j = message.contentJson;
  const caption =
    message.contentText?.trim() ||
    pickString(j, ["caption", "body", "filename", "name", "title"]) ||
    null;
  const url = findHttpUrl(j);

  const label = typeLabel(message.messageType);
  const boxClass = outbound
    ? "border-white/25 bg-card/10 text-white"
    : "border-border/90 bg-muted/60 df-text-primary";

  return (
    <div
      className={`mb-2 rounded-xl border px-3 py-2.5 text-left text-sm shadow-inner ${boxClass}`}
      data-testid="message-attachment"
    >
      <div className="flex items-start gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
            outbound ? "bg-card/15" : "bg-card df-text-secondary shadow-sm ring-1 ring-slate-200/80"
          }`}
          aria-hidden
        >
          {label === "Imagem" ? "🖼" : label === "Áudio" ? "🎧" : label === "Vídeo" ? "▶" : "📎"}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${outbound ? "text-white/90" : "df-text-muted"}`}>
            {label}
          </p>
          {caption ? (
            <p className={`mt-0.5 break-words text-[13px] leading-snug ${outbound ? "text-white/95" : "df-text-secondary"}`}>
              {caption}
            </p>
          ) : (
            <p className={`mt-0.5 text-xs ${outbound ? "text-white/75" : "df-text-muted"}`}>
              Pré-visualização não disponível — o ficheiro foi recebido via WhatsApp.
            </p>
          )}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1.5 inline-block max-w-full truncate text-xs font-semibold underline decoration-2 underline-offset-2 ${
                outbound ? "text-white hover:text-white/90" : "text-[var(--df-brand-700)] hover:text-[var(--df-brand-800)]"
              }`}
            >
              Abrir ligação
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
