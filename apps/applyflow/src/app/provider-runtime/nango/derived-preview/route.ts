import { NextRequest, NextResponse } from "next/server";
import { readApplyFlowNangoConnectSessionEnv } from "@/lib/provider-runtime/nango-connect-session-launcher";
import { createNangoConnectionVerificationProvider } from "@/lib/provider-runtime/nango-connection-verification-provider";
import {
  createApplyFlowProviderDerivedRuntimePreviewVerifiers,
  createBlockedProviderDerivedRuntimePreviewResult,
  handleProviderDerivedRuntimePreview,
  parseProviderDerivedRuntimePreviewRequest,
  resolveProviderDerivedRuntimePreviewHttpStatus,
} from "@/lib/provider-runtime/provider-derived-runtime-preview-boundary";
import { createEmptyProviderDerivedSignalSummary } from "@devflow/career-sync";
import { resolveNangoPersonalRoute, buildApplyFlowNangoAccountEndUserId } from "@/lib/provider-runtime/nango-account-identity";

/**
 * Server-side provider-derived runtime preview boundary.
 * Verifies Gmail and Calendar connections independently on the server.
 * Client-provided connection state is never trusted for authorization.
 * Returns client-safe composition result only — never secrets, metadata, or raw provider payloads.
 */

export async function POST(request: NextRequest) {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    const result = createBlockedProviderDerivedRuntimePreviewResult("invalid_json");
    return NextResponse.json(result, { status: 400 });
  }

  const parsed = parseProviderDerivedRuntimePreviewRequest(body);

  if (!parsed.ok) {
    const result = createBlockedProviderDerivedRuntimePreviewResult(parsed.error);
    return NextResponse.json(result, {
      status: resolveProviderDerivedRuntimePreviewHttpStatus({ requestError: parsed.error }),
    });
  }

  try {
    const env = readApplyFlowNangoConnectSessionEnv();
    const owner = await resolveNangoPersonalRoute({ request, env });
    if (!owner.ok) {
      return NextResponse.json(
        {
          runtime: "nango",
          status: "blocked",
          safeForClient: true,
          readOnly: true,
          userReviewRequired: true,
          gmailStatus: "blocked",
          calendarStatus: "blocked",
          processedMessageCount: 0,
          processedEventCount: 0,
          importedRawProviderData: false,
          retainedRawPayload: false,
          retainedBodies: false,
          retainedSnippets: false,
          retainedDescriptions: false,
          retainedLocations: false,
          retainedMeetingLinks: false,
          retainedProviderIdentifiers: false,
          retainedAttendeeAddresses: false,
          hasToken: false,
          signals: [],
          summary: createEmptyProviderDerivedSignalSummary(),
          warnings: [owner.reason],
          messages: ["An authenticated ApplyFlow account is required before provider preview."],
        },
        { status: owner.httpStatus },
      );
    }

    const requestedAt = new Date().toISOString();
    const gmailEndUserId = buildApplyFlowNangoAccountEndUserId("gmail", owner.accountId);
    const calendarEndUserId = buildApplyFlowNangoAccountEndUserId("calendar", owner.accountId);
    const verificationDeps = env.NANGO_SECRET_KEY?.trim()
      ? {
          verificationProvider: createNangoConnectionVerificationProvider({
            secretKey: env.NANGO_SECRET_KEY,
            accountId: owner.accountId,
          }),
        }
      : {};

    const verifiers = createApplyFlowProviderDerivedRuntimePreviewVerifiers({
      env,
      requestedAt,
      verificationDeps,
    });

    const result = await handleProviderDerivedRuntimePreview(parsed.request, {
      env,
      requestedAt,
      gmailEndUserId,
      calendarEndUserId,
      ...verifiers,
    });

    return NextResponse.json(result, {
      status: resolveProviderDerivedRuntimePreviewHttpStatus({ result }),
    });
  } catch {
    return NextResponse.json(
      {
        runtime: "nango",
        status: "error",
        safeForClient: true,
        readOnly: true,
        userReviewRequired: true,
        gmailStatus: "error",
        calendarStatus: "error",
        processedMessageCount: 0,
        processedEventCount: 0,
        importedRawProviderData: false,
        retainedRawPayload: false,
        retainedBodies: false,
        retainedSnippets: false,
        retainedDescriptions: false,
        retainedLocations: false,
        retainedMeetingLinks: false,
        retainedProviderIdentifiers: false,
        retainedAttendeeAddresses: false,
        hasToken: false,
        signals: [],
        summary: createEmptyProviderDerivedSignalSummary(),
        warnings: ["provider_derived_runtime_preview_failed"],
        messages: ["Provider preview failed safely. No provider data was stored."],
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    createBlockedProviderDerivedRuntimePreviewResult("invalid_json"),
    { status: 405 },
  );
}