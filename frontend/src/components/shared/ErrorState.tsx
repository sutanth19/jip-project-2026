import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({
  title = "Tidak dapat memuatkan data",
  description = "Sila cuba semula sebentar lagi.",
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border bg-card p-6 text-center text-card-foreground">
      <AlertCircle className="mx-auto size-8 text-destructive" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

