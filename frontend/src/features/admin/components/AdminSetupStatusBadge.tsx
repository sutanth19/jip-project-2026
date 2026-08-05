import { cn } from "@/lib/utils";
import { adminBadgeBaseClass, adminSetupBadgeToneClasses } from "@/features/admin/utils/admin-status";

const labels: Record<string, string> = {
  PENDING: "Menunggu Setup",
  EXPIRED: "Pautan Tamat Tempoh",
  COMPLETED: "Selesai",
  ARCHIVED: "Diarkibkan",
  WAITING: "Menunggu",
  DONE: "Selesai",
};

export function AdminSetupStatusBadge({ status }: { status?: string }) {
  const key = status ?? "UNKNOWN";

  return (
    <span className={cn(adminBadgeBaseClass, adminSetupBadgeToneClasses[key] ?? adminSetupBadgeToneClasses.UNKNOWN)}>
      {labels[key] ?? "-"}
    </span>
  );
}
