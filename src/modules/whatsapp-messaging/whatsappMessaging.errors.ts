export interface ParsedMetaApiError {
  code: string | null;
  message: string | null;
  metaCode: number | null;
  subcode: number | null;
  fbtraceId: string | null;
}

export function parseMetaApiError(status: number, bodyText: string): ParsedMetaApiError {
  let metaCode: number | null = null;
  let subcode: number | null = null;
  let message: string | null = null;
  let fbtraceId: string | null = null;
  try {
    const j = JSON.parse(bodyText) as {
      error?: {
        code?: number;
        error_subcode?: number;
        message?: string;
        fbtrace_id?: string;
      };
    };
    if (j.error) {
      metaCode = typeof j.error.code === "number" ? j.error.code : null;
      subcode = typeof j.error.error_subcode === "number" ? j.error.error_subcode : null;
      message = typeof j.error.message === "string" ? j.error.message : null;
      fbtraceId = typeof j.error.fbtrace_id === "string" ? j.error.fbtrace_id : null;
    }
  } catch {
    message = bodyText.slice(0, 200) || `HTTP ${status}`;
  }
  const code =
    status === 401 || status === 403
      ? "META_PERMISSION_DENIED"
      : status === 400
        ? "META_BAD_REQUEST"
        : status >= 500
          ? "META_SERVER_ERROR"
          : "META_API_ERROR";
  return {
    code,
    message: message || `HTTP ${status}`,
    metaCode,
    subcode,
    fbtraceId,
  };
}
