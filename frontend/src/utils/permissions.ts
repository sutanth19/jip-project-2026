import type { AuthRole, PermissionKey } from "@/types/auth";

export const roleLabels: Record<AuthRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TEACHER: "Guru",
  STUDENT: "Murid",
  PARENT: "Ibu Bapa",
};

const rolePermissions: Record<AuthRole, PermissionKey[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "schools:manage",
    "users:manage",
    "curriculum:manage",
    "activities:manage",
    "assignments:manage",
    "submissions:review",
    "reports:view",
    "notifications:view",
    "announcements:manage",
    "ai:view",
    "settings:manage",
  ],
  ADMIN: [
    "dashboard:view",
    "schools:manage",
    "users:manage",
    "curriculum:manage",
    "activities:manage",
    "assignments:manage",
    "submissions:review",
    "reports:view",
    "notifications:view",
    "announcements:manage",
    "ai:view",
    "settings:manage",
  ],
  TEACHER: [
    "dashboard:view",
    "activities:manage",
    "assignments:manage",
    "submissions:review",
    "reports:view",
    "notifications:view",
    "announcements:manage",
    "ai:view",
  ],
  STUDENT: ["dashboard:view", "notifications:view"],
  PARENT: ["dashboard:view", "reports:view", "notifications:view"],
};

export function getPermissionsForRole(role: AuthRole): PermissionKey[] {
  return rolePermissions[role];
}

export function hasPermission(
  permissions: readonly PermissionKey[],
  permission: PermissionKey,
): boolean {
  return permissions.includes(permission);
}

export function hasRole(role: AuthRole | null, allowedRoles: readonly AuthRole[]): boolean {
  return Boolean(role && allowedRoles.includes(role));
}

export function isAdminRole(role: AuthRole | null): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

