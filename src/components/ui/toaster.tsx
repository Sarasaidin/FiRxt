"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let addToast: (toast: Omit<Toast, "id">) => void = () => {};

export function toast(message: string, type: Toast["type"] = "info") {
  addToast({ message, type });
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = (t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4000);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all",
            t.type === "success" && "bg-brand-green",
            t.type === "error" && "bg-brand-red",
            t.type === "info" && "bg-brand-navy"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
