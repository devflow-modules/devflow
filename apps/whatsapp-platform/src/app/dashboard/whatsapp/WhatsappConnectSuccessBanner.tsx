import { buttonClassName } from "@/components/ui/button";

type WhatsappConnectSuccessBannerProps = {
  onDismiss: () => void;
};

export function WhatsappConnectSuccessBanner({ onDismiss }: WhatsappConnectSuccessBannerProps) {
  return (
    <div
      className="rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4"
      role="status"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-emerald-950">Número ligado com sucesso</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-900/90">
          O canal foi atualizado e a lista em baixo reflete o novo número — já pode usar a Inbox e o envio nesta
          linha.
        </p>
      </div>
      <button type="button" onClick={onDismiss} className={`${buttonClassName("secondary")} mt-3 shrink-0 sm:mt-0`}>
        Fechar
      </button>
    </div>
  );
}
