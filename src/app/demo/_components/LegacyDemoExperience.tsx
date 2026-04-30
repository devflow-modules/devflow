"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { WhatsAppCta } from "@/components/shared/whatsapp-cta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BOT_RESPONSES: Record<string, string> = {
  morango: "Temos! Morango clássico e morango com menta. Qual você prefere? Também fazemos entrega.",
  essência: "Temos diversas essências: morango, menta, uva, maracujá e mais. Quer saber os preços?",
  entrega: "Fazemos entrega! Motoboy até as 18h ou app de delivery. Qual opção você prefere?",
  horário: "Funcionamos de segunda a sábado, das 9h às 19h. Domingo até 14h.",
  cardápio: "Temos frango grelhado, filé ao molho e opção vegana. Quer ver os preços ou anotar pedido?",
  pedido: "Claro! O que você gostaria? Posso anotar e passar para a cozinha.",
  atendente: "Sem problemas! Conectando você com nossa equipe agora.",
  preço: "Os preços variam por item. Qual produto ou prato te interessa?",
  pagamento: "Aceitamos PIX, cartão e dinheiro. No delivery, PIX ou cartão.",
  "quero ver preços": "Os preços variam por item. Qual produto ou prato te interessa? Ou prefere que eu conecte você com nossa equipe para uma proposta?",
  "quero falar com humano": "Sem problemas! Conectando você com nossa equipe agora. Um atendente deve responder em instantes.",
  "quero testar automação": "Esta conversa já é a demonstração! O bot respondeu automaticamente. Na operação real, sua equipe recebe o handoff quando o cliente pede. Quer ver o site completo? https://devflowlabs.com.br",
  default: "Ótima pergunta! Nossa equipe pode te ajudar com isso. Quer que eu conecte você com um atendente?",
};

const QUICK_CHOICES = [
  { label: "Quero ver preços", value: "Quero ver preços" },
  { label: "Quero falar com humano", value: "Quero falar com humano" },
  { label: "Quero testar automação", value: "Quero testar automação" },
];

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(BOT_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return BOT_RESPONSES.default;
}

export function LegacyDemoExperience() {
  const [messages, setMessages] = useState<{ type: "user" | "bot"; text: string }[]>([
    {
      type: "bot",
      text: "Olá! Sou o bot da DevFlow. Digite uma pergunta como \"tem essência de morango?\" ou \"qual o cardápio?\" para ver a automação em ação.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { type: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getBotResponse(trimmed.toLowerCase());
      setMessages((prev) => [...prev, { type: "bot", text: response }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 500);
  };

  const handleSend = () => sendMessage(input);

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-primary" aria-hidden />
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simule um atendimento automatizado
            </h1>
            <p className="mt-4 df-text-secondary">
              Digite uma pergunta e veja como a IA responde. Ex: &quot;tem essência de morango?&quot; ou &quot;qual o
              cardápio?&quot;
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-md">
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-border bg-card shadow-lg",
                "flex flex-col"
              )}
            >
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <MessageCircle className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">DevFlow Bot</p>
                  <p className="flex items-center gap-1.5 text-xs text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    online
                  </p>
                </div>
              </div>

              <div className="flex h-80 flex-col overflow-y-auto p-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn("mb-3 flex", msg.type === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        msg.type === "user"
                          ? "rounded-tr-md bg-primary text-primary-foreground"
                          : "rounded-tl-md border border-border bg-muted/50 text-foreground"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="mb-3 flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-border bg-muted/50 px-4 py-2">
                      <span
                        className="size-2 animate-pulse rounded-full bg-muted-foreground/35"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="size-2 animate-pulse rounded-full bg-muted-foreground/35"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="size-2 animate-pulse rounded-full bg-muted-foreground/35"
                        style={{ animationDelay: "300ms" }}
                      />
                      <span className="text-xs df-text-muted">DevFlow Bot está digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border px-3 py-2">
                <p className="mb-2 text-xs text-muted-foreground">Ou clique:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHOICES.map((choice) => (
                    <Button
                      key={choice.value}
                      type="button"
                      variant="secondary"
                      onClick={() => sendMessage(choice.value)}
                      className={cn(
                        "h-auto min-h-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-none",
                        "text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {choice.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 border-t border-border p-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Digite uma pergunta..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSend}
                  className="size-10 rounded-lg p-0 hover:bg-primary/90"
                  aria-label="Enviar"
                >
                  <Send className="size-5" />
                </Button>
              </div>
            </div>

            <p className="mt-4 text-center text-sm df-text-secondary">
              Esta é uma demonstração. Na operação real, o bot usa IA e se integra ao seu atendimento.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-md text-center">
            <p className="text-sm font-medium text-foreground">Pronto para automatizar de verdade?</p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <WhatsAppCta
                label="Testar no WhatsApp"
                size="lg"
                text="Vi a demonstração e quero automatizar meu negócio."
              />
              <Link
                href="/automacao-whatsapp"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                Ver automação
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center">
            <Link href="/" className="text-sm df-text-secondary hover:text-foreground">
              ← Voltar ao início
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
