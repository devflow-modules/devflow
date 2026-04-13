import { buttonClassName } from "@/components/ui/button";

type WhatsappConnectCtaProps = {
  connectLoading: boolean;
  onConnect: () => void;
};

export function WhatsappConnectCta({ connectLoading, onConnect }: WhatsappConnectCtaProps) {
  return (
    <section className="rounded-2xl border border-[var(--df-brand-200)]/80 bg-[var(--df-brand-50)]/40 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Ligar outro número</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Ao continuar, abrimos a página de autorização da Meta (Facebook) para associar um WhatsApp Business a esta
        conta. Depois de autorizar, voltará automaticamente para aqui e o número aparece na lista — não precisa de
        copiar códigos nem configurar manualmente o retorno.
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={onConnect}
          disabled={connectLoading}
          className={buttonClassName("primary")}
        >
          {connectLoading ? "A abrir a Meta…" : "Ligar novo número"}
        </button>
      </div>
    </section>
  );
}
