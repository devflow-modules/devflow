import { ApplyflowImportClient } from "@/components/applyflow-import-client";

type PageProps = {
  searchParams: Promise<{ from?: string | string[]; handoff?: string | string[] }>;
};

export default async function ImportApplyflowPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const from = sp.from;
  const fromApplyflowHandoff =
    from === "applyflow" || (Array.isArray(from) && from.includes("applyflow"));
  const handoff = sp.handoff;
  const expectPostMessageHandoff =
    handoff === "postMessage" || (Array.isArray(handoff) && handoff.includes("postMessage"));
  return (
    <ApplyflowImportClient fromApplyflowHandoff={fromApplyflowHandoff} expectPostMessageHandoff={expectPostMessageHandoff} />
  );
}
