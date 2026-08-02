import type { AuthRole } from "@/types/auth";
import { getDashboardPathForRole } from "@/lib/auth-routes";

export function getUnauthorizedRedirect(role: AuthRole | null): string {
  return role ? getDashboardPathForRole(role) : "/login";
}

export function canAccessRoleRoute(role: AuthRole | null, allowedRoles: readonly AuthRole[]): boolean {
  return Boolean(role && allowedRoles.includes(role));
}

