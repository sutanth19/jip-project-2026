import * as React from "react";

import { ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { accountStatuses } from "@/features/admin/config";

type AdminLifecycleActionsProps = {
  currentStatus?: string;
  loading?: boolean;
  onStatusChange: (status: string) => void;
};

export function AdminLifecycleActions({
  currentStatus,
  loading = false,
  onStatusChange,
}: AdminLifecycleActionsProps) {
  const [nextStatus, setNextStatus] = React.useState<string | null>(null);
  const statusLabel = accountStatuses.find((status) => status.value === nextStatus)?.label ?? nextStatus;

  return (
    <div className="flex flex-wrap gap-2">
      {accountStatuses
        .filter((status) => status.value !== currentStatus)
        .map((status) => (
          <Button
            key={status.value}
            type="button"
            variant={status.value === "ARCHIVED" ? "destructive" : "outline"}
            disabled={loading}
            onClick={() => setNextStatus(status.value)}
          >
            {status.label}
          </Button>
        ))}
      <ConfirmDialog
        open={Boolean(nextStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setNextStatus(null);
          }
        }}
        title="Tukar status rekod?"
        description={`Status semasa: ${currentStatus ?? "-"}. Status baharu: ${statusLabel}.`}
        confirmLabel={loading ? "Memproses..." : "Sahkan"}
        variant={nextStatus === "ARCHIVED" ? "destructive" : "default"}
        isLoading={loading}
        onConfirm={() => {
          if (nextStatus) {
            onStatusChange(nextStatus);
          }
          setNextStatus(null);
        }}
      />
    </div>
  );
}

