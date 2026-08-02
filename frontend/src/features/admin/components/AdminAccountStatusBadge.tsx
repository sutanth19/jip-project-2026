import { cn } from "@/lib/utils";
import { adminAccountBadgeToneClasses, adminBadgeBaseClass } from "@/features/admin/utils/admin-status";

const labels: Record<string, string> = {
  ACTIVE: "Aktif",
  PENDING: "Menunggu",
  SUSPENDED: "Digantung",
  ARCHIVED: "Diarkibkan",
  LOCKED: "Dikunci",
};

export function AdminAccountStatusBadge({ status }: { status?: string }) {
  const key = status ?? "UNKNOWN";

  return (
    <span className={cn(adminBadgeBaseClass, adminAccountBadgeToneClasses[key] ?? adminAccountBadgeToneClasses.UNKNOWN)}>
      {labels[key] ?? "-"}
    </span>
  );
}
