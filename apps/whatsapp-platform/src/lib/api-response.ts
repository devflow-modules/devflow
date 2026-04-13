/**
 * Formato único de resposta JSON para APIs internas.
 * Rotas públicas externas (ex.: webhook Meta) podem manter corpo mínimo e enviar só `X-Trace-Id`.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export type ApiErrorBody = {
  success: false;
  data: null;
  error: { code: string; message: string };
  trace_id: string;
};

export type ApiSuccessBody<T = unknown> = {
  success: true;
  data: T;
  error: null;
  trace_id: string;
};

export function newTraceId(): string {
  return randomUUID();
}

function mergeTraceHeaders(traceId: string, extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  h.set("X-Trace-Id", traceId);
  return h;
}

export function jsonSuccess<T>(
  data: T,
  init?: { status?: number; traceId?: string; headers?: HeadersInit }
): NextResponse<ApiSuccessBody<T>> {
  const trace_id = init?.traceId ?? newTraceId();
  return NextResponse.json(
    { success: true, data, error: null, trace_id },
    { status: init?.status ?? 200, headers: mergeTraceHeaders(trace_id, init?.headers) }
  );
}

/** Mensagem segura para cliente — sem stack nem detalhes internos. */
export function jsonError(
  code: string,
  message: string,
  status: number,
  init?: { traceId?: string; headers?: HeadersInit }
): NextResponse<ApiErrorBody> {
  const trace_id = init?.traceId ?? newTraceId();
  return NextResponse.json(
    { success: false, data: null, error: { code, message }, trace_id },
    { status, headers: mergeTraceHeaders(trace_id, init?.headers) }
  );
}

/** Anexa X-Trace-Id a uma resposta JSON existente (ex.: webhook Meta com `{ ok: true }`). */
export function withTraceHeaders(res: NextResponse, traceId: string): NextResponse {
  res.headers.set("X-Trace-Id", traceId);
  return res;
}
