import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ResponseDetection } from "@devflow/applyflow-core";

import {
  INBOUND_RESPONSE_BIND_LEGACY_HINT,
  INBOUND_RESPONSE_BIND_LEGACY_LABEL,
  INBOUND_RESPONSE_CONFIRM_LABEL,
  INBOUND_RESPONSE_DESCRIPTION,
  INBOUND_RESPONSE_EMPTY,
  INBOUND_RESPONSE_SCAN_DISABLED,
  INBOUND_RESPONSE_NO_AUTO,
  INBOUND_RESPONSE_TITLE,
  formatInboundAccountLabel,
  formatInboundAnalysisNotice,
} from "./inbound-application-response-content";
import { InboundApplicationResponsePanelView } from "./inbound-application-response-panel";
import { inboundEmailsFromProviderPreview } from "./inbound-signals-from-preview";

const noop = () => undefined;

const detection: ResponseDetection = {
  id: "detect-app-bluelight",
  emailId: "gmail-1",
  applicationId: "app-bluelight",
  companyName: "Bluelight Consulting",
  jobTitle: "Senior Product Engineer",
  headline: "Bluelight Consulting respondeu → possível entrevista",
  matchStatus: "matched",
  matchConfidence: "high",
  matchEvidence: ["domínio do remetente relacionado a Bluelight Consulting"],
  classification: "interview",
  classificationConfidence: "high",
  classificationEvidence: ["texto contém convite ou menção explícita a entrevista"],
  suggestedStatus: "screening",
  fromStatus: "applied",
  pipelineChange: true,
  state: "pending_review",
  detectedAt: "2026-09-15T18:00:00.000Z",
  receivedAt: "2026-09-15T18:00:00.000Z",
  senderDomain: "bluelightconsulting.com",
  autoApply: false,
  reviewRequired: true,
};

describe("inbound-application-response-content", () => {
  it("não promete auto-status nem envio de e-mail", () => {
    expect(INBOUND_RESPONSE_DESCRIPTION.toLowerCase()).toContain("ainda não foi alterado");
    expect(INBOUND_RESPONSE_NO_AUTO.toLowerCase()).toContain("detecção não é confirmação");
    expect(INBOUND_RESPONSE_DESCRIPTION.toLowerCase()).toContain("não responde a e-mails");
  });

  it("distinguishes analyzed, discarded, created and reused detections", () => {
    expect(
      formatInboundAnalysisNotice({
        analyzedCount: 4,
        discardedCount: 2,
        detectionsCreated: 1,
        detectionsReused: 1,
      }),
    ).toBe("Analisadas 4. Descartadas 2. Novas detecções 1. Já existentes 1.");
    expect(formatInboundAccountLabel("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 0)).toBe("Conta Gmail 1 · aaaaaaaa");
  });
});

describe("InboundApplicationResponsePanelView", () => {
  it("mostra detecção pendente com evidência e exige confirmação explícita", () => {
    const html = renderToStaticMarkup(
      <InboundApplicationResponsePanelView
        detections={[detection]}
        applications={[]}
        selectedStatusById={{}}
        selectedApplicationById={{}}
        persistError={null}
        notice={null}
        hasAppliedApplications
        isScanning={false}
        gmailRuntimeEnabled={false}
        onClassify={noop}
        onScanGmail={noop}
        onConfirm={noop}
        onDismiss={noop}
        onStatusChange={noop}
        onApplicationChange={noop}
        senderDomain=""
        subjectHint=""
        onSenderDomainChange={noop}
        onSubjectHintChange={noop}
      />,
    );

    expect(html).toContain(INBOUND_RESPONSE_TITLE);
    expect(html).toContain("Bluelight Consulting respondeu → possível entrevista");
    expect(html).toContain("domínio do remetente relacionado a Bluelight Consulting");
    expect(html).toContain(INBOUND_RESPONSE_CONFIRM_LABEL);
    expect(html).toContain("inbound-response-confirm-detect-app-bluelight");
    expect(html).not.toMatch(/mailto:|send email|auto-apply/i);
  });

  it("mostra vazio sem fingir que já classificou sozinho", () => {
    const html = renderToStaticMarkup(
      <InboundApplicationResponsePanelView
        detections={[]}
        applications={[]}
        selectedStatusById={{}}
        selectedApplicationById={{}}
        persistError={null}
        notice={null}
        hasAppliedApplications
        isScanning={false}
        gmailRuntimeEnabled={false}
        onClassify={noop}
        onScanGmail={noop}
        onConfirm={noop}
        onDismiss={noop}
        onStatusChange={noop}
        onApplicationChange={noop}
        senderDomain=""
        subjectHint=""
        onSenderDomainChange={noop}
        onSubjectHintChange={noop}
      />,
    );
    expect(html).toContain(INBOUND_RESPONSE_EMPTY);
    expect(html).toContain(INBOUND_RESPONSE_SCAN_DISABLED);
    expect(html).not.toContain(INBOUND_RESPONSE_CONFIRM_LABEL);
  });

  it("pede confirmação explícita antes de associar o legado a uma conta", () => {
    const html = renderToStaticMarkup(
      <InboundApplicationResponsePanelView
        detections={[detection]}
        applications={[]}
        selectedStatusById={{}}
        selectedApplicationById={{}}
        persistError={null}
        notice={null}
        hasAppliedApplications
        isScanning={false}
        gmailRuntimeEnabled={false}
        onClassify={noop}
        onScanGmail={noop}
        onConfirm={noop}
        onDismiss={noop}
        onStatusChange={noop}
        onApplicationChange={noop}
        senderDomain=""
        subjectHint=""
        onSenderDomainChange={noop}
        onSubjectHintChange={noop}
        accountScopes={["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]}
        selectedAccountScope="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        onAccountScopeChange={noop}
        pendingLegacyBindScope="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        onConfirmLegacyOwnership={noop}
      />,
    );
    expect(html).toContain(INBOUND_RESPONSE_BIND_LEGACY_HINT);
    expect(html).toContain(INBOUND_RESPONSE_BIND_LEGACY_LABEL);
    expect(html).toContain("inbound-response-account-scope");
    expect(html).toContain("Conta Gmail 2 · bbbbbbbb");
  });
});

describe("inboundEmailsFromProviderPreview", () => {
  it("copia só campos derivados e não inventa subject", () => {
    const mapped = inboundEmailsFromProviderPreview([
      {
        id: "sig-1",
        occurredAt: "2026-09-15T18:00:00.000Z",
        company: "bluelightconsulting.com",
        kind: "provider_email_activity",
        reason: "Rule A",
      },
    ]);
    expect(mapped).toEqual([
      {
        id: "sig-1",
        receivedAt: "2026-09-15T18:00:00.000Z",
        senderDomain: "bluelightconsulting.com",
      },
    ]);
    expect(JSON.stringify(mapped)).not.toContain("subject");
  });
});
