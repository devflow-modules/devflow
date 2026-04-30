import { buttonClassName } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

type WhatsappConnectCtaProps = {
  connectLoading: boolean;
  onConnect: () => void;
};

export function WhatsappConnectCta({ connectLoading, onConnect }: WhatsappConnectCtaProps) {
  return (
    <div className="mt-6">
      <Button variant="disabled"
        type="button"
        onClick={onConnect}
        disabled={connectLoading}
        className={buttonClassName("primary")}
      >
        {connectLoading ? "A preparar…" : "Conectar meu WhatsApp"}
      </Button>
      <p className="mt-2 text-xs text-[var(--df-text-muted)]">Abrirá a página oficial da Meta</p>
    </div>
  );
}
