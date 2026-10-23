"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

export function Sheet({
  open,
  onClose,
  children,
  title,
  label,
  className,
  closeLabel = "Fermer",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  label: string;
  className?: string;
  closeLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-stone-950/55 backdrop-blur-[3px]"
      />
      <div
        className={cn(
          "relative flex max-h-[94dvh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-t-[2rem] bg-surface shadow-soft sm:rounded-[2rem]",
          className,
        )}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-line/70 px-5 py-4">
            <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-muted hover:text-ink" aria-label={closeLabel}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
