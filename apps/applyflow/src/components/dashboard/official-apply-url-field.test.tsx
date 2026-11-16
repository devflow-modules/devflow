/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OFFICIAL_APPLY_URL_FIELD_LABEL,
  OFFICIAL_APPLY_URL_INVALID,
  OFFICIAL_APPLY_URL_REMOVE_LABEL,
  OFFICIAL_APPLY_URL_SAVE_LABEL,
} from "./job-inbox-content";
import { OfficialApplyUrlField } from "./official-apply-url-field";
import type { ApplyFlowJob } from "@devflow/applyflow-core";

function baseJob(overrides: Partial<ApplyFlowJob> = {}): ApplyFlowJob {
  return {
    id: "job-official-1",
    title: "Engineer",
    company: "Acme",
    location: "Remote",
    url: "https://remoteok.com/remote-jobs/1",
    source: "remoteok",
    status: "reviewing",
    descriptionSnapshot: "React",
    jobContext: { skills: ["React"] },
    createdAt: "2026-08-18T15:00:00.000Z",
    updatedAt: "2026-08-18T15:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("OfficialApplyUrlField", () => {
  it("renders nothing without onSaveOfficialApplyUrl", () => {
    const { container } = render(<OfficialApplyUrlField job={baseJob()} />);
    expect(container.childElementCount).toBe(0);
  });

  it("blocks invalid URL client-side without calling save", async () => {
    const onSave = vi.fn();
    render(
      <OfficialApplyUrlField
        job={baseJob({
          jobContext: {
            skills: ["React"],
            officialApplyUrl: "https://jobs.ashbyhq.com/acme/saved/apply",
          },
        })}
        onSaveOfficialApplyUrl={onSave}
      />,
    );
    const input = screen.getByTestId("official-apply-url-input-job-official-1") as HTMLInputElement;
    expect(input.value).toBe("https://jobs.ashbyhq.com/acme/saved/apply");
    fireEvent.change(input, { target: { value: "not-a-url" } });
    fireEvent.click(screen.getByRole("button", { name: OFFICIAL_APPLY_URL_SAVE_LABEL }));
    const error = await screen.findByTestId("official-apply-url-error-job-official-1");
    expect(error.textContent).toBe(OFFICIAL_APPLY_URL_INVALID);
    expect(onSave).not.toHaveBeenCalled();
    // Saved value remains until a successful persist; draft is invalid only in the input.
    expect(input.value).toBe("not-a-url");
  });

  it("saves a valid official URL", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<OfficialApplyUrlField job={baseJob()} onSaveOfficialApplyUrl={onSave} />);
    fireEvent.change(screen.getByTestId("official-apply-url-input-job-official-1"), {
      target: { value: "https://jobs.ashbyhq.com/acme/x/apply" },
    });
    fireEvent.click(screen.getByRole("button", { name: OFFICIAL_APPLY_URL_SAVE_LABEL }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("job-official-1", "https://jobs.ashbyhq.com/acme/x/apply");
    });
  });

  it("removes a saved official URL", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <OfficialApplyUrlField
        job={baseJob({
          jobContext: { skills: ["React"], officialApplyUrl: "https://jobs.lever.co/acme/role/apply" },
        })}
        onSaveOfficialApplyUrl={onSave}
      />,
    );
    const input = screen.getByLabelText(OFFICIAL_APPLY_URL_FIELD_LABEL) as HTMLInputElement;
    expect(input.value).toBe("https://jobs.lever.co/acme/role/apply");
    fireEvent.click(screen.getByRole("button", { name: OFFICIAL_APPLY_URL_REMOVE_LABEL }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("job-official-1", null);
    });
  });
});
