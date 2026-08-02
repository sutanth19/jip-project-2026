import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ToastContext, type ToastContextValue, type ToastInput, type ToastTone } from "./toast-context-value";

type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};


const toneIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50",
  info: "border-border bg-card text-card-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = React.useState<ToastMessage[]>([]);

  const notify = React.useCallback((message: ToastInput) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { ...message, id }].slice(-4));
    window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== id));
    }, 5_000);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ tone: "success", title, description }),
      error: (title, description) => notify({ tone: "error", title, description }),
      warning: (title, description) => notify({ tone: "warning", title, description }),
      info: (title, description) => notify({ tone: "info", title, description }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {messages.map((message) => {
          const Icon = toneIcons[message.tone];

          return (
            <div
              key={message.id}
              className={cn("rounded-lg border p-3 shadow-sm", toneClasses[message.tone])}
              role="status"
            >
              <div className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{message.title}</p>
                  {message.description ? (
                    <p className="mt-1 text-sm opacity-80">{message.description}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Tutup mesej"
                  onClick={() =>
                    setMessages((current) => current.filter((item) => item.id !== message.id))
                  }
                >
                  <X className="size-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

