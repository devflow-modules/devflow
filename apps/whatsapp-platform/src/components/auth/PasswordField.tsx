"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  id?: string;
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
};

export function PasswordField({
  id: extId,
  label,
  name = "password",
  value,
  onChange,
  autoComplete,
  disabled,
  required,
  minLength,
  placeholder,
}: Props) {
  const genId = useId();
  const id = extId ?? genId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium df-text-secondary">
          {label}
        </label>
        <Button
          variant="secondary"
          type="button"
          aria-pressed={visible}
          className="text-xs font-medium text-[var(--df-brand-400)] underline-offset-2 hover:text-[var(--df-brand-300)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--df-brand-500)]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--df-bg-elevated)]"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </Button>
      </div>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-md border df-border-dark bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
      />
    </div>
  );
}
