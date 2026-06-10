import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

type WhatsappConnectSuccessBannerProps = {
  onDismiss: () => void;
};

export function WhatsappConnectSuccessBanner({ onDismiss }: WhatsappConnectSuccessBannerProps) {
  return (
    <div
      className="df-feedback-success rounded-2xl px-4 py-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-4"
      role="status"
      aria-label="WhatsApp conectado com sucesso"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold df-text-success">WhatsApp conectado com sucesso</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--df-text-secondary)]">
          Seu número já está pronto para receber mensagens aqui no sistema.
        </p>
        <Link
          href="/inbox"
          className={`${buttonClassName("primary")} mt-4 inline-flex text-center sm:mt-3`}
        >
          Ver conversas
        </Link>
      </div>
      <Button variant="secondary" type="button" onClick={onDismiss} className={`${buttonClassName("secondary")} mt-3 shrink-0 sm:mt-0`}>
        Fechar
      </Button>
    </div>
  );
}
