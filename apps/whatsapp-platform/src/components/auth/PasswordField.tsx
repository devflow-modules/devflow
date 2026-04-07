"use client";

import { useId, useState } from "react";

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
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <button
          type="button"
          className="text-xs font-medium text-blue-600 hover:text-blue-800"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
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
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
      />
    </div>
  );
}
