import { ApplyflowImportClient } from "@/components/applyflow-import-client";

type PageProps = {
  searchParams: Promise<{ from?: string | string[] }>;
};

export default async function ImportApplyflowPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const from = sp.from;
  const fromApplyflowHandoff =
    from === "applyflow" || (Array.isArray(from) && from.includes("applyflow"));
  return <ApplyflowImportClient fromApplyflowHandoff={fromApplyflowHandoff} />;
}
