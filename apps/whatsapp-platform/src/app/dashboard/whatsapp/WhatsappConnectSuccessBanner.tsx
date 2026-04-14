import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

type WhatsappConnectSuccessBannerProps = {
  onDismiss: () => void;
};

export function WhatsappConnectSuccessBanner({ onDismiss }: WhatsappConnectSuccessBannerProps) {
  return (
    <div
      className="rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-4 shadow-sm sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-950">WhatsApp conectado com sucesso</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-900/90">
          Seu número já está pronto para receber mensagens aqui no sistema.
        </p>
        <Link
          href="/inbox"
          className={`${buttonClassName("primary")} mt-4 inline-flex text-center sm:mt-3`}
        >
          Ver conversas
        </Link>
      </div>
      <button type="button" onClick={onDismiss} className={`${buttonClassName("secondary")} mt-3 shrink-0 sm:mt-0`}>
        Fechar
      </button>
    </div>
  );
}
