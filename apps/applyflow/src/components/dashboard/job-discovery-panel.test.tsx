// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobDiscoveryHitCard, buildDiscoveryCriteria } from "./job-discovery-panel";
import {
  JOB_DISCOVERY_ADD_DESCRIPTION,
  JOB_DISCOVERY_ANALYZE,
  JOB_DISCOVERY_CANCEL,
  JOB_DISCOVERY_DESCRIPTION_EMPTY,
  JOB_DISCOVERY_DESCRIPTION_LABEL,
  JOB_DISCOVERY_MISSING_DESCRIPTION,
  JOB_DISCOVERY_SAVE,
  JOB_DISCOVERY_SOURCE,
  JOB_DISCOVERY_TITLE,
  JOB_DISCOVERY_VIEW_LISTING,
  JOB_INBOX_SUBMIT_LABEL,
} from "./job-inbox-content";
import { JobInboxPanel } from "./job-inbox-panel";
import type { JobSearchHit } from "@/lib/job-sources/types";
import { withHitDescription } from "@/lib/job-sources/save-hit";

const listing = "https://jobgether.com/offer/abc123-senior-full-stack";
const sampleDescription = "Senior full stack role. React, TypeScript, Node.js and PostgreSQL. Remote.";

function hit(description?: string): JobSearchHit {
  return {
    externalId: "abc123",
    source: "jobgether",
    title: "Senior Full Stack Engineer",
    company: "Acme",
    description,
    location: "Brazil",
    sourceUrl: listing,
    remote: "Full Remote",
    experience: "Senior (5-10 years)",
    salaryRange: "80000-120000 USD",
  };
}

afterEach(() => {
  cleanup();
});

describe("Job discovery UI", () => {
  it("places search above the manual paste flow", () => {
    const html = renderToStaticMarkup(
      <JobInboxPanel jobs={[]} error={null} matchAvailable onEvaluatePaste={() => undefined} />,
    );
    expect(html.indexOf(JOB_DISCOVERY_TITLE)).toBeGreaterThan(-1);
    expect(html.indexOf(JOB_DISCOVERY_TITLE)).toBeLessThan(html.indexOf(JOB_INBOX_SUBMIT_LABEL));
    expect(html).not.toContain("Direct Apply");
  });

  it("offers description completion when the provider omits description", () => {
    const html = renderToStaticMarkup(
      <JobDiscoveryHitCard hit={hit(undefined)} matchAvailable onSave={() => undefined} />,
    );
    expect(html).toContain(JOB_DISCOVERY_SOURCE);
    expect(html).toContain(JOB_DISCOVERY_VIEW_LISTING);
    expect(html).toContain(`href="${listing}"`);
    expect(html).toContain(JOB_DISCOVERY_ADD_DESCRIPTION);
    expect(html).toContain(JOB_DISCOVERY_MISSING_DESCRIPTION);
    expect(html).not.toContain(JOB_DISCOVERY_SAVE);
    expect(html).not.toContain("Direct Apply");
  });

  it("offers direct save when the hit already has description text", () => {
    const html = renderToStaticMarkup(
      <JobDiscoveryHitCard hit={hit(sampleDescription)} matchAvailable />,
    );
    expect(html).toContain(JOB_DISCOVERY_SAVE);
    expect(html).not.toContain(JOB_DISCOVERY_ADD_DESCRIPTION);
    expect(html).toContain("80000-120000 USD");
  });

  it("pastes a real description into ingestion without inventing content", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<JobDiscoveryHitCard hit={hit(undefined)} matchAvailable onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_ADD_DESCRIPTION }));
    fireEvent.change(screen.getByLabelText(JOB_DISCOVERY_DESCRIPTION_LABEL), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_ANALYZE }));
    expect(await screen.findByText(JOB_DISCOVERY_DESCRIPTION_EMPTY)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(JOB_DISCOVERY_DESCRIPTION_LABEL), {
      target: { value: sampleDescription },
    });
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_ANALYZE }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      ...hit(undefined),
      description: sampleDescription,
    });
  });

  it("cancels the description editor without saving", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<JobDiscoveryHitCard hit={hit(undefined)} matchAvailable onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_ADD_DESCRIPTION }));
    fireEvent.change(screen.getByLabelText(JOB_DISCOVERY_DESCRIPTION_LABEL), {
      target: { value: sampleDescription },
    });
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_CANCEL }));
    expect(screen.queryByLabelText(JOB_DISCOVERY_DESCRIPTION_LABEL)).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("builds provider-independent criteria without Jobgether enums", () => {
    expect(
      buildDiscoveryCriteria(
        {
          keyword: "full stack",
          location: "Brazil",
          experience: "senior",
          remote: "full_remote",
          contract: "full_time",
          salaryMin: "",
          salaryMax: "",
          currency: "",
          sort: "date",
        },
        1,
      ),
    ).toMatchObject({
      keyword: "full stack",
      experience: "senior",
      remote: "full_remote",
      page: 1,
      limit: 10,
    });
  });

  it("withHitDescription rejects blank input and preserves provider metadata", () => {
    expect(withHitDescription(hit(undefined), "  ")).toBeNull();
    expect(withHitDescription(hit(undefined), sampleDescription)).toEqual({
      ...hit(undefined),
      description: sampleDescription,
    });
  });
});
