"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const ToastContext = React.createContext<{
  toasts: { id: string; message: string }[];
  toast: (msg: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<{ id: string; message: string }[]>([]);
  const toast = React.useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl bg-foreground text-background px-4 py-2 text-sm shadow-lg">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground", className)} {...props} />;
}