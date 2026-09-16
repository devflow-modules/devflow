import { isOpenableJobUrl } from "@devflow/applyflow-core";

export function DashboardJobUrlCell({ url }: { url?: string }) {
  if (!isOpenableJobUrl(url) || !url) {
    return "—";
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
    >
      abrir
    </a>
  );
}
