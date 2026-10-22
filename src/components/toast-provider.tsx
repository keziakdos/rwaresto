"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };
type ToastInput = { message: string; type?: Toast["type"] };

const ToastContext = createContext<{ show: (toast: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message: toast.message, type: toast.type || "info" }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-soft animate-slide-up ${
              toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-900"
                : toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-stone-200 bg-white text-stone-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <Info className="h-5 w-5 shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded-full p-1 hover:bg-black/5"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("ToastProvider absent");
  return context;
}
