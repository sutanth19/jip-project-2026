import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthRole } from "@/types/auth";

type GuardProps = {
  children?: ReactNode;
};

type RoleGuardProps = GuardProps & {
  roles: readonly AuthRole[];
};

function renderGuardChild(children: ReactNode | undefined) {
  return children ?? <Outlet />;
}

export function RequireAuth({ children }: GuardProps) {
  const location = useLocation();
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const requiresPasswordChange = useAuthStore((state) => state.requiresPasswordChange);
  const requiresPinChange = useAuthStore((state) => state.requiresPinChange);

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <LoadingSpinner label="Memulihkan sesi..." />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresPasswordChange && location.pathname !== "/change-first-password") {
    return <Navigate to="/change-first-password" replace />;
  }

  if (requiresPinChange && location.pathname !== "/student/change-first-pin") {
    return <Navigate to="/student/change-first-pin" replace />;
  }

  return renderGuardChild(children);
}

export function RequireRole({ roles, children }: RoleGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !roles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return renderGuardChild(children);
}

export function RequireSchool({ children }: GuardProps) {
  const school = useAuthStore((state) => state.school);
  const role = useAuthStore((state) => state.role);

  // Platform admins are intentionally not school-scoped.
  if (!school && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return <Navigate to="/403" replace />;
  }

  return renderGuardChild(children);
}

export function RequireTeacher(props: GuardProps) {
  return <RequireRole roles={["TEACHER"]}>{renderGuardChild(props.children)}</RequireRole>;
}

export function RequireStudent(props: GuardProps) {
  return <RequireRole roles={["STUDENT"]}>{renderGuardChild(props.children)}</RequireRole>;
}

export function RequireParent(props: GuardProps) {
  return <RequireRole roles={["PARENT"]}>{renderGuardChild(props.children)}</RequireRole>;
}

export function RequireAdmin(props: GuardProps) {
  return <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}>{renderGuardChild(props.children)}</RequireRole>;
}

export function RequireSuperAdmin(props: GuardProps) {
  return <RequireRole roles={["SUPER_ADMIN"]}>{renderGuardChild(props.children)}</RequireRole>;
}
