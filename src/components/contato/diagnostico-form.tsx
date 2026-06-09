"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  CONTACT_FORM_SUBMIT_LABEL,
  CONTACT_MAIN_PROBLEM_OPTIONS,
} from "@/lib/conversion-copy";
import { trackCtaWhatsAppClick, trackDiagnosticoFormSubmit, trackFunnelCtaClick } from "@/lib/analytics";
import { getWhatsAppOrMailtoUrl, isWhatsAppNumberConfigured } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const labelClass = "df-text-primary mb-1.5 block text-sm font-medium";

const MESSAGE_VOLUME_OPTIONS = [
  "Até 20 mensagens",
  "20 a 50 mensagens",
  "50 a 100 mensagens",
  "100 a 300 mensagens",
  "Mais de 300 mensagens",
] as const;

const CONTACT_TIME_OPTIONS = [
  "Manhã (8h–12h)",
  "Tarde (12h–18h)",
  "Final da tarde (18h–20h)",
  "Qualquer horário",
] as const;

type FormState = {
  nome: string;
  whatsapp: string;
  empresa: string;
  segmento: string;
  volume: string;
  problema: string;
  horario: string;
};

const initialState: FormState = {
  nome: "",
  whatsapp: "",
  empresa: "",
  segmento: "",
  volume: "",
  problema: "",
  horario: "",
};

function buildDiagnosticoMessage(data: FormState): string {
  const lines = [
    "Olá, vim pelo site e quero agendar um diagnóstico da minha operação no WhatsApp.",
    "",
    `Nome: ${data.nome.trim()}`,
    `WhatsApp: ${data.whatsapp.trim()}`,
    `Empresa: ${data.empresa.trim() || "—"}`,
    `Segmento: ${data.segmento.trim() || "—"}`,
    `Volume aproximado/dia: ${data.volume || "—"}`,
    `Principal problema hoje: ${data.problema || "—"}`,
    `Melhor horário para contato: ${data.horario || "—"}`,
  ];
  return lines.join("\n");
}

export function DiagnosticoForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nome.trim() || !form.whatsapp.trim()) {
      setError("Informe seu nome e WhatsApp para solicitar o diagnóstico.");
      return;
    }

    const message = buildDiagnosticoMessage(form);
    const href = getWhatsAppOrMailtoUrl(message);
    trackDiagnosticoFormSubmit({
      hasVolume: Boolean(form.volume),
      hasProblema: Boolean(form.problema),
    });
    trackFunnelCtaClick({ cta: "agendar_diagnostico", surface: "contato_form_whatsapp" });
    trackCtaWhatsAppClick(CONTACT_FORM_SUBMIT_LABEL);
    window.open(href, isWhatsAppNumberConfigured() ? "_blank" : "_self", "noopener,noreferrer");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.2)] sm:p-8"
      aria-labelledby="diagnostico-form-heading"
      noValidate
    >
      <h2 id="diagnostico-form-heading" className="df-text-primary text-lg font-bold tracking-tight">
        Solicitar diagnóstico
      </h2>
      <p className="df-text-secondary mt-2 text-sm leading-relaxed">
        Preencha os dados abaixo. Você será direcionado ao WhatsApp com o briefing pronto para agilizar a conversa.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 sm:max-w-none">
          <label htmlFor="contato-nome" className={labelClass}>
            Nome <span className="text-destructive">*</span>
          </label>
          <input
            id="contato-nome"
            name="nome"
            type="text"
            autoComplete="name"
            required
            value={form.nome}
            onChange={(e) => update("nome")(e.target.value)}
            className={inputClass}
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="contato-whatsapp" className={labelClass}>
            WhatsApp <span className="text-destructive">*</span>
          </label>
          <input
            id="contato-whatsapp"
            name="whatsapp"
            type="tel"
            autoComplete="tel"
            required
            value={form.whatsapp}
            onChange={(e) => update("whatsapp")(e.target.value)}
            className={inputClass}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label htmlFor="contato-empresa" className={labelClass}>
            Empresa
          </label>
          <input
            id="contato-empresa"
            name="empresa"
            type="text"
            autoComplete="organization"
            value={form.empresa}
            onChange={(e) => update("empresa")(e.target.value)}
            className={inputClass}
            placeholder="Nome da empresa ou marca"
          />
        </div>

        <div>
          <label htmlFor="contato-segmento" className={labelClass}>
            Segmento
          </label>
          <input
            id="contato-segmento"
            name="segmento"
            type="text"
            value={form.segmento}
            onChange={(e) => update("segmento")(e.target.value)}
            className={inputClass}
            placeholder="Ex.: delivery, clínica, loja, serviços"
          />
        </div>

        <div>
          <label htmlFor="contato-volume" className={labelClass}>
            Volume aproximado de mensagens por dia
          </label>
          <select
            id="contato-volume"
            name="volume"
            value={form.volume}
            onChange={(e) => update("volume")(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione uma faixa</option>
            {MESSAGE_VOLUME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contato-problema" className={labelClass}>
            Principal problema hoje
          </label>
          <select
            id="contato-problema"
            name="problema"
            value={form.problema}
            onChange={(e) => update("problema")(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione o principal gargalo</option>
            {CONTACT_MAIN_PROBLEM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contato-horario" className={labelClass}>
            Melhor horário para contato
          </label>
          <select
            id="contato-horario"
            name="horario"
            value={form.horario}
            onChange={(e) => update("horario")(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione um horário</option>
            {CONTACT_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className={cn(
          "df-btn-primary mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold",
          "shadow-[0_14px_40px_-6px_rgba(22,163,74,0.45)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        )}
      >
        {CONTACT_FORM_SUBMIT_LABEL}
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </button>

      <p className="df-text-muted mt-3 text-center text-xs leading-relaxed">
        Ao enviar, você abre o WhatsApp com o briefing preenchido. Resposta em minutos em dias úteis.
      </p>
    </form>
  );
}
