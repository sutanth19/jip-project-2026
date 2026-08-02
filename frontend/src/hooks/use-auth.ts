import { useAuthContext } from "@/contexts/auth-context-value";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthRole, PermissionKey } from "@/types/auth";

export function useAuth() {
  return useAuthContext();
}

export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

export function usePermissions() {
  return useAuthStore((state) => state.permissions);
}

export function useRequireRole(roles: readonly AuthRole[]): boolean {
  const role = useAuthStore((state) => state.role);
  return Boolean(role && roles.includes(role));
}

export function useLogout() {
  return useAuthContext().logout;
}

export function useHasPermission(permission: PermissionKey): boolean {
  return useAuthContext().hasPermission(permission);
}
