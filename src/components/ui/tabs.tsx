"use client";

import { cn } from "./cn";

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  items: { value: T; label: string; icon?: React.ComponentType<{ className?: string }>; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line/70 bg-surface/80 p-1 shadow-card", className)}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition",
              active ? "bg-forest text-white shadow-card" : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {item.label}
            {typeof item.count === "number" ? (
              <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-white/15" : "bg-ink/5")}>
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
