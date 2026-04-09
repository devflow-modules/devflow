"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { SupportModal } from "./SupportModal";

type SupportContextValue = {
  openSupport: () => void;
};

const SupportContext = createContext<SupportContextValue | null>(null);

export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext);
  if (!ctx) {
    throw new Error("useSupport deve ser usado dentro de SupportProvider");
  }
  return ctx;
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSupport = useCallback(() => setOpen(true), []);

  const value = useMemo(() => ({ openSupport }), [openSupport]);

  return (
    <SupportContext.Provider value={value}>
      {children}
      <SupportModal open={open} onClose={() => setOpen(false)} />
    </SupportContext.Provider>
  );
}
