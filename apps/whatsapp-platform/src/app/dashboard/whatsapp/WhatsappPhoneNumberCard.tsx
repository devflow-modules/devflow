import { buttonClassName } from "@/components/ui/button";
import type { WhatsappPhoneNumberRow } from "./whatsappConnectTypes";
import { formatDisplayLine, statusLabel } from "./whatsappConnectUtils";

type WhatsappPhoneNumberCardProps = {
  number: WhatsappPhoneNumberRow;
  labelDraft: string;
  onLabelChange: (value: string) => void;
  onSaveLabel: () => void;
  patching: boolean;
  removing: boolean;
  onSetPrimary: () => void;
  onSetDefaultOutbound: () => void;
  onRemove: () => void;
};

export function WhatsappPhoneNumberCard({
  number: n,
  labelDraft,
  onLabelChange,
  onSaveLabel,
  patching,
  removing,
  onSetPrimary,
  onSetDefaultOutbound,
  onRemove,
}: WhatsappPhoneNumberCardProps) {
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Etiqueta interna</p>
          <p className="mt-0.5 text-base font-semibold text-slate-900">
            {labelDraft.trim() || "Sem etiqueta"}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatDisplayLine(n)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Estado: {statusLabel(n.status)}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
          {n.isPrimary ? (
            <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-900">
              Número principal
            </span>
          ) : null}
          {n.isDefaultOutbound ? (
            <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold text-teal-900">
              Envio padrão
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex max-w-lg flex-col gap-1 sm:flex-row sm:items-end sm:gap-2">
          <label className="block min-w-0 flex-1 text-xs font-medium text-slate-600">
            Editar etiqueta
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400"
              value={labelDraft}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Ex.: Suporte, Vendas"
            />
          </label>
          <button
            type="button"
            disabled={patching}
            className={`${buttonClassName("secondary")} w-full shrink-0 sm:w-auto`}
            onClick={onSaveLabel}
          >
            {patching ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-slate-500">Ações</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
          {n.status === "ACTIVE" && !n.isPrimary ? (
            <button
              type="button"
              disabled={patching}
              className={`${buttonClassName("secondary")} text-sm`}
              onClick={onSetPrimary}
            >
              Definir como principal
            </button>
          ) : null}
          {n.status === "ACTIVE" && !n.isDefaultOutbound ? (
            <button
              type="button"
              disabled={patching}
              className={`${buttonClassName("secondary")} text-sm`}
              onClick={onSetDefaultOutbound}
            >
              Usar no envio padrão
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className={`${buttonClassName("secondary")} border-red-200 text-sm text-red-700 hover:bg-red-50`}
          >
            {removing ? "A remover…" : "Remover número"}
          </button>
        </div>
      </div>
    </li>
  );
}
