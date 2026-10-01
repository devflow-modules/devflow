"use client";

import { cn } from "@/lib/cn";
import {
  applyFlowButtonClass,
  type ApplyFlowButtonSize,
} from "@/components/ui/ApplyFlowButton";
import {
  useCallback,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type ApplyFlowTabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  panelId?: string;
  testId?: string;
};

/**
 * Semantic tablist using native buttons (not ApplyFlowButton).
 * Allowed by design-system button check via this primitive file.
 */
export function ApplyFlowTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "sm",
  className,
}: {
  items: readonly ApplyFlowTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  size?: ApplyFlowButtonSize;
  className?: string;
}) {
  const baseId = useId();

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const index = items.findIndex((item) => item.id === value);
      if (index < 0) return;
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % items.length;
      if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = items.length - 1;
      onChange(items[next]!.id);
    },
    [items, onChange, value],
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => {
        const selected = item.id === value;
        const tabId = `${baseId}-tab-${item.id}`;
        return (
          <button
            key={item.id}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={item.panelId}
            tabIndex={selected ? 0 : -1}
            data-testid={item.testId ?? `applyflow-tab-${item.id}`}
            className={applyFlowButtonClass({
              variant: selected ? "primary" : "secondary",
              size,
            })}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
