"use client";

import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  text: string;
  exiting?: boolean;
}

interface ToastContextValue {
  success: (text: string) => void;
  error: (text: string) => void;
  warning: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

const MAX_TOASTS = 5;

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const STYLES: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-600 text-white",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, text: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => {
        const next = [{ id, type, text }, ...prev];
        // Trim to max, dismiss overflow
        if (next.length > MAX_TOASTS) {
          const overflow = next.slice(MAX_TOASTS);
          overflow.forEach((t) => {
            const timer = timersRef.current.get(t.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(t.id);
            }
          });
          return next.slice(0, MAX_TOASTS);
        }
        return next;
      });
      const timer = setTimeout(() => dismiss(id), DURATIONS[type]);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const contextValue: ToastContextValue = {
    success: useCallback((text: string) => addToast("success", text), [addToast]),
    error: useCallback((text: string) => addToast("error", text), [addToast]),
    warning: useCallback((text: string) => addToast("warning", text), [addToast]),
    info: useCallback((text: string) => addToast("info", text), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg
              ${STYLES[toast.type]}
              transition-all duration-300 ease-in-out
              ${toast.exiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
              animate-slide-in-right
            `}
          >
            <span className="text-lg font-bold leading-none mt-0.5">{ICONS[toast.type]}</span>
            <span className="flex-1 text-sm font-medium">{toast.text}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
