import { apiRequest } from "@/lib/api";
import type { AuthRole } from "@/types/auth";

export async function getAdminDashboard(role: AuthRole): Promise<Record<string, unknown>> {
  const endpoint = role === "SUPER_ADMIN" ? "/dashboard/super-admin" : "/dashboard/admin";
  return apiRequest<Record<string, unknown>>(endpoint);
}

