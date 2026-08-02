import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AuthRole } from "@/types/auth";
import { roleLabels } from "@/utils/permissions";

export function RoleBadge({ role }: { role: AuthRole }) {
  return <StatusBadge status={role} label={roleLabels[role]} />;
}

