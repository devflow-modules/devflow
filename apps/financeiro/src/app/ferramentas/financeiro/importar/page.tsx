"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useHousehold } from "@/modules/financeiro/lib/household/HouseholdProvider";
import { Breadcrumbs } from "@/modules/financeiro/components/Breadcrumbs";
import type { FinancialContext } from "@/modules/financeiro/schemas";
import { Button } from "@/components/ui/button";

type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  valid: boolean;
  error?: string;
};

type Source = { id: string; name: string; sourceType: "PJ" | "PF" };

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return [];

  const rows: ParsedRow[] = [];
  const header = lines[0].split(/[;,\t]/).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));

  const dateIdx = header.findIndex((h) => ["data", "date", "dt"].some((k) => h.includes(k)));
  const descIdx = header.findIndex((h) => ["desc", "hist", "name", "nome", "descri"].some((k) => h.includes(k)));
  const amtIdx  = header.findIndex((h) => ["valor", "amount", "value", "vlr"].some((k) => h.includes(k)));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[;,\t]/).map((c) => c.trim().replace(/["']/g, ""));

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : cols[0];
    const rawDesc = descIdx >= 0 ? cols[descIdx] : cols[1];
    const rawAmt  = amtIdx  >= 0 ? cols[amtIdx]  : cols[2];

    const cleanAmount = rawAmt
      ?.replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const amount = Number(cleanAmount);

    let date = rawDate ?? "";
    // Normalizar dd/mm/yyyy → yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [d, m, y] = date.split("/");
      date = `${y}-${m}-${d}`;
    }
    // dd/mm/yy → yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(date)) {
      const [d, m, y] = date.split("/");
      date = `20${y}-${m}-${d}`;
    }

    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const isValidAmount = !isNaN(amount) && Math.abs(amount) > 0;

    rows.push({
      date,
      description: rawDesc ?? `Linha ${i}`,
      amount: Math.abs(amount),
      valid: isValidDate && isValidAmount,
      error: !isValidDate ? "Data inválida" : !isValidAmount ? "Valor inválido" : undefined,
    });
  }
  return rows;
}

const SAMPLE_CSV = `data;descricao;valor
01/01/2026;Supermercado Extra;350.00
05/01/2026;Conta de luz;89.50
10/01/2026;Netflix;55.90
15/01/2026;Uber;32.00
20/01/2026;Farmácia Drogasil;120.00`;

export default function ImportarPage() {
  const { household, isLoading: householdLoading } = useHousehold();
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [context, setContext] = useState<FinancialContext>("PERSONAL");
  const [sourceId, setSourceId] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!household?.id) return;
    fetch("/api/sources").then((r) => r.json()).then((p) => setSources(p.data ?? [])).catch(() => {});
  }, [household?.id]);

  const handleParse = useCallback(() => {
    if (!csvText.trim()) { toast.error("Cole o conteúdo CSV no campo acima"); return; }
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) { toast.error("Nenhuma linha encontrada no CSV"); return; }
    setRows(parsed);
    const valid = parsed.filter((r) => r.valid).length;
    toast.success(`${parsed.length} linha(s) lida(s) · ${valid} válida(s)`);
  }, [csvText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const parsed = parseCSV(text);
      setRows(parsed);
      const valid = parsed.filter((r) => r.valid).length;
      toast.success(`Arquivo lido: ${parsed.length} linha(s) · ${valid} válida(s)`);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) { toast.error("Nenhuma linha válida para importar"); return; }

    setImporting(true);
    try {
      const body = {
        rows: validRows.map((r) => ({ date: r.date, description: r.description, amount: r.amount })),
        defaultContext: context,
        ...(sourceId ? { defaultSourceId: sourceId } : {}),
      };
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (payload.success) {
        const { created, skipped, total } = payload.data;
        toast.success(`✅ ${created} de ${total} despesa(s) importada(s)${skipped > 0 ? ` (${skipped} ignorada(s))` : ""}`);
        setRows([]);
        setCsvText("");
      } else {
        toast.error(payload.error?.message ?? "Erro ao importar");
      }
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  if (householdLoading || !household) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 text-foreground md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <Breadcrumbs />

        <header>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Importação</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Importar CSV</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe despesas de extratos bancários ou planilhas. Formato esperado: data · descrição · valor.
          </p>
        </header>

        {/* Instruções */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
          <p className="font-semibold">Formatos suportados:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            <li>Separadores: <code>;</code>, <code>,</code> ou <code>tab</code></li>
            <li>Data: <code>dd/mm/aaaa</code> ou <code>aaaa-mm-dd</code></li>
            <li>Valor: <code>350.00</code> ou <code>350,00</code> (aceita negativos)</li>
            <li>Colunas: <strong>data;descricao;valor</strong> (aceita variações)</li>
          </ul>
          <Button variant="secondary"
            type="button"
            onClick={() => setCsvText(SAMPLE_CSV)}
            className="mt-3 text-xs font-semibold underline"
          >
            Usar exemplo
          </Button>
        </div>

        {/* Upload ou colar */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border df-border-dark px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60"
            >
              📁 Carregar arquivo
            </Button>
            <span className="text-xs text-muted-foreground">ou cole o conteúdo abaixo</span>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </div>
          <textarea
            rows={8}
            placeholder={`data;descricao;valor\n01/01/2026;Supermercado;350.00\n...`}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-xs df-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={csvText}
            onChange={(e) => { setCsvText(e.target.value); setRows([]); }}
          />
          <Button variant="disabled"
            type="button"
            onClick={handleParse}
            disabled={!csvText.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Analisar CSV
          </Button>
        </div>

        {rows.length > 0 && (
          <>
            {/* Prévia */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Prévia ({rows.length} linha{rows.length !== 1 ? "s" : ""})
                </h2>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600">✓ {validCount} válida{validCount !== 1 ? "s" : ""}</span>
                  {invalidCount > 0 && (
                    <span className="text-red-500">✗ {invalidCount} inválida{invalidCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Data</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Descrição</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
                      <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                      <tr key={idx} className={row.valid ? "" : "bg-red-50"}>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.date}</td>
                        <td className="max-w-[200px] truncate px-3 py-1.5">{row.description}</td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(row.amount)}
                        </td>
                        <td className="px-3 py-1.5">
                          {row.valid ? (
                            <span className="text-emerald-600">✓</span>
                          ) : (
                            <span className="text-red-500" title={row.error}>✗ {row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Configurações da importação */}
            <section className="rounded-xl border border-border bg-muted/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Configurações da importação</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium df-text-secondary">Contexto padrão</label>
                  <select
                    value={context}
                    onChange={(e) => setContext(e.target.value as FinancialContext)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="PERSONAL">👤 Pessoal</option>
                    <option value="BUSINESS">🏢 Empresa (PJ)</option>
                    <option value="SHARED">🤝 Estúdio / Sociedade</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium df-text-secondary">Fonte padrão (opcional)</label>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  >
                    <option value="">Sem fonte</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                A categoria será detectada automaticamente pelo nome da descrição.
              </p>
            </section>

            {/* Botão importar */}
            <Button variant="disabled"
              type="button"
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98]"
            >
              {importing
                ? "Importando..."
                : `Importar ${validCount} despesa${validCount !== 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
