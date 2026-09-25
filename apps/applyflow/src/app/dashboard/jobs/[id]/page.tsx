import { JobDecisionV2Panel } from "@/components/dashboard/job-decision-v2-panel";
import { isApplyFlowPersistenceV2Enabled } from "@/lib/persistence-v2/feature-flag";

export default async function JobDecisionV2Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="relative border-b border-[color:var(--af-border)]/80">
      <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-5 sm:py-12">
        <JobDecisionV2Panel jobId={id} persistenceV2Enabled={isApplyFlowPersistenceV2Enabled()} />
      </div>
    </main>
  );
}
