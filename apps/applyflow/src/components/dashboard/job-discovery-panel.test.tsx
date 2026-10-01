// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { JobDiscoveryHitCard, JobDiscoveryPanel, buildDiscoveryCriteria } from "./job-discovery-panel";
import {
  JOB_DISCOVERY_ADD_DESCRIPTION,
  JOB_DISCOVERY_ANALYZE,
  JOB_DISCOVERY_CANCEL,
  JOB_DISCOVERY_DESCRIPTION_EMPTY,
  JOB_DISCOVERY_DESCRIPTION_LABEL,
  JOB_DISCOVERY_DIRECT_APPLY,
  JOB_DISCOVERY_KEYWORD,
  JOB_DISCOVERY_MISSING_DESCRIPTION,
  JOB_DISCOVERY_SAVE,
  JOB_DISCOVERY_SEARCH,
  JOB_DISCOVERY_SOURCE,
  JOB_DISCOVERY_SOURCE_REMOTEOK,
  JOB_DISCOVERY_SOURCE_THEIRSTACK,
  JOB_DISCOVERY_TITLE,
  JOB_DISCOVERY_VIEW_LISTING,
  JOB_DISCOVERY_VIEW_LISTING_GENERIC,
  JOB_DISCOVERY_VIEW_LISTING_REMOTEOK,
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
          provider: "jobgether",
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
      provider: "jobgether",
      keyword: "full stack",
      experience: "senior",
      remote: "full_remote",
      page: 1,
      limit: 10,
    });
    expect(
      buildDiscoveryCriteria(
        {
          provider: "theirstack",
          keyword: "react",
          location: "",
          experience: "",
          remote: "",
          contract: "",
          salaryMin: "",
          salaryMax: "",
          currency: "",
          sort: "",
        },
        1,
      ),
    ).toMatchObject({ provider: "theirstack", limit: 5, page: 1 });
  });

  it("withHitDescription rejects blank input and preserves provider metadata", () => {
    expect(withHitDescription(hit(undefined), "  ")).toBeNull();
    expect(withHitDescription(hit(undefined), sampleDescription)).toEqual({
      ...hit(undefined),
      description: sampleDescription,
    });
  });

  it("defaults to Jobgether and does not search when only the provider changes", async () => {
    const onSearch = vi.fn(async () => ({
      ok: true as const,
      cached: false,
      page: { provider: "jobgether" as const, page: 1, limit: 10, hasMore: false, hits: [] },
    }));
    render(<JobDiscoveryPanel matchAvailable onSearch={onSearch} />);
    const jobgether = screen.getByRole("radio", { name: /Jobgether/i }) as HTMLInputElement;
    expect(jobgether.checked).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /TheirStack/i }));
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(JOB_DISCOVERY_KEYWORD), { target: { value: "react" } });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it("searches only the selected provider after explicit Buscar", async () => {
    const onSearch = vi.fn(async (criteria: Record<string, unknown>) => ({
      ok: true as const,
      cached: false,
      page: {
        provider: (criteria.provider as "jobgether" | "theirstack") ?? "jobgether",
        page: 1,
        limit: Number(criteria.limit ?? 10),
        hasMore: false,
        hits: [],
      },
    }));
    render(<JobDiscoveryPanel matchAvailable onSearch={onSearch} />);
    fireEvent.click(screen.getByRole("radio", { name: /TheirStack/i }));
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_SEARCH }));
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ provider: "theirstack", limit: 5, page: 1 });
  });

  it("shows Guardar e analisar for TheirStack description and Candidatura direta only with final_url", () => {
    const tsHit: JobSearchHit = {
      externalId: "1",
      source: "theirstack",
      title: "Engineer",
      description: sampleDescription,
      sourceUrl: "https://example.com/listing",
      directApplyUrl: "https://boards.greenhouse.io/acme/jobs/1",
    };
    const html = renderToStaticMarkup(<JobDiscoveryHitCard hit={tsHit} matchAvailable />);
    expect(html).toContain(JOB_DISCOVERY_SOURCE_THEIRSTACK);
    expect(html).toContain(JOB_DISCOVERY_SAVE);
    expect(html).toContain(JOB_DISCOVERY_DIRECT_APPLY);
    expect(html).toContain(JOB_DISCOVERY_VIEW_LISTING_GENERIC);
    expect(html).not.toContain(JOB_DISCOVERY_ADD_DESCRIPTION);

    const withoutDirect = renderToStaticMarkup(
      <JobDiscoveryHitCard hit={{ ...tsHit, directApplyUrl: undefined }} matchAvailable />,
    );
    expect(withoutDirect).not.toContain(JOB_DISCOVERY_DIRECT_APPLY);
  });

  it("falls back to description completion when TheirStack omits description", () => {
    const html = renderToStaticMarkup(
      <JobDiscoveryHitCard
        hit={{
          externalId: "2",
          source: "theirstack",
          title: "Engineer",
          sourceUrl: "https://example.com/listing",
        }}
        matchAvailable
      />,
    );
    expect(html).toContain(JOB_DISCOVERY_ADD_DESCRIPTION);
    expect(html).not.toContain(JOB_DISCOVERY_SAVE);
    expect(html).not.toContain(JOB_DISCOVERY_DIRECT_APPLY);
  });

  it("shows Remote OK attribution without nofollow and without direct apply", () => {
    const remoteListing = "https://remoteok.com/remote-jobs/remote-software-engineer-acme-1";
    const remoteHit: JobSearchHit = {
      externalId: "1",
      source: "remoteok",
      title: "Software Engineer",
      company: "Acme",
      description: sampleDescription,
      sourceUrl: remoteListing,
      technologies: ["react", "node", "typescript", "aws", "docker", "k8s", "extra"],
    };
    const html = renderToStaticMarkup(<JobDiscoveryHitCard hit={remoteHit} matchAvailable />);
    expect(html).toContain(JOB_DISCOVERY_SOURCE_REMOTEOK);
    expect(html).toContain(JOB_DISCOVERY_VIEW_LISTING_REMOTEOK);
    expect(html).toContain(`href="${remoteListing}"`);
    expect(html).toContain(JOB_DISCOVERY_SAVE);
    expect(html).not.toContain(JOB_DISCOVERY_DIRECT_APPLY);
    expect(html).not.toContain("nofollow");
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("react · node · typescript · aws · docker · k8s");
    expect(html).not.toContain("extra");
  });

  it("selecting Remote OK alone does not search; Buscar uses remoteok limit 10", async () => {
    const onSearch = vi.fn(async (criteria: Record<string, unknown>) => ({
      ok: true as const,
      cached: false,
      page: {
        provider: (criteria.provider as "jobgether" | "theirstack" | "remoteok") ?? "jobgether",
        page: 1,
        limit: Number(criteria.limit ?? 10),
        hasMore: false,
        hits: [],
      },
    }));
    render(<JobDiscoveryPanel matchAvailable onSearch={onSearch} />);
    fireEvent.click(screen.getByRole("radio", { name: /Remote OK/i }));
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(JOB_DISCOVERY_KEYWORD), { target: { value: "react" } });
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: JOB_DISCOVERY_SEARCH }));
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    expect(onSearch.mock.calls[0]?.[0]).toMatchObject({ provider: "remoteok", limit: 10, page: 1, keyword: "react" });
    expect(onSearch.mock.calls[0]?.[0]).not.toHaveProperty("salaryMin");
    expect(onSearch.mock.calls[0]?.[0]).not.toHaveProperty("contract");
  });
});
