import type { AuthRole } from "@/stores/auth-store";

const dashboardPaths: Record<AuthRole, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/guru",
  STUDENT: "/murid",
  PARENT: "/ibu-bapa",
};

export function getDashboardPathForRole(role: AuthRole): string {
  return dashboardPaths[role];
}
