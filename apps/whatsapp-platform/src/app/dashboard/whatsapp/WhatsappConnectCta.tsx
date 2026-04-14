import { buttonClassName } from "@/components/ui/button";

type WhatsappConnectCtaProps = {
  connectLoading: boolean;
  onConnect: () => void;
};

export function WhatsappConnectCta({ connectLoading, onConnect }: WhatsappConnectCtaProps) {
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onConnect}
        disabled={connectLoading}
        className={buttonClassName("primary")}
      >
        {connectLoading ? "A preparar…" : "Conectar meu WhatsApp"}
      </button>
      <p className="mt-2 text-xs text-slate-500">Abrirá a página oficial da Meta</p>
    </div>
  );
}
