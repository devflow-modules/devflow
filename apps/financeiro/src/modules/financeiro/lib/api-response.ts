import { NextResponse } from "next/server";
import {
  buildSuccessPayload,
  buildErrorPayload,
  type ApiSuccessPayload,
  type ApiErrorPayload,
} from "./utils";

export type { ApiSuccessPayload, ApiErrorPayload };

export const sendSuccess = <T = unknown>(
  data: T | null = null,
  status = 200,
  message?: string
): NextResponse<ApiSuccessPayload<T>> => {
  const payload = buildSuccessPayload(data, message);
  return NextResponse.json(payload, { status });
};

export const sendError = (
  message: string,
  status = 500,
  details?: unknown,
  code?: string
): NextResponse<ApiErrorPayload> => {
  const payload = buildErrorPayload(message, code, details);
  return NextResponse.json(payload, { status });
};
