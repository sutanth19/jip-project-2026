import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingSpinner, RoleBadge, StatusBadge } from "@/components/shared";
import { ApiError, parseApiError } from "@/lib/api";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { canAccessRoleRoute, getUnauthorizedRedirect } from "@/routes/route-policy";
import { useAuthStore } from "@/stores/auth-store";
import { formatDuration } from "@/utils/date";
import { getPermissionsForRole, hasPermission, isAdminRole } from "@/utils/permissions";
import { getStatusTone } from "@/utils/status";
import { ServerErrorPage } from "@/pages/errors/ErrorPage";
import { MemoryRouter } from "react-router-dom";

describe("Phase 27A frontend foundation", () => {
  it("maps role dashboards, permissions, and unauthorized redirects", () => {
    expect(getDashboardPathForRole("TEACHER")).toBe("/guru");
    expect(canAccessRoleRoute("ADMIN", ["SUPER_ADMIN", "ADMIN"])).toBe(true);
    expect(canAccessRoleRoute("PARENT", ["TEACHER"])).toBe(false);
    expect(getUnauthorizedRedirect(null)).toBe("/login");
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(hasPermission(getPermissionsForRole("TEACHER"), "submissions:review")).toBe(true);
    expect(hasPermission(getPermissionsForRole("STUDENT"), "settings:manage")).toBe(false);
  });

  it("sets and clears frontend sessions without storing credentials", () => {
    const store = useAuthStore.getState();

    store.setSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      rememberMe: false,
      user: {
        id: "user-1",
        role: "STUDENT",
        email: null,
        accountStatus: "ACTIVE",
      },
      profile: {
        id: "student-1",
        studentId: "STD-001",
        fullName: "Aina",
        schoolId: "school-1",
        classId: "class-1",
        className: "1 Amanah",
        yearLevel: 1,
      },
      requiresPinChange: true,
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().role).toBe("STUDENT");
    expect(useAuthStore.getState().school?.id).toBe("school-1");
    expect(JSON.stringify(useAuthStore.getState())).not.toContain("1234");

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("normalizes API, status, and duration helpers", () => {
    const apiError = parseApiError(new ApiError("Tidak dibenarkan", 403, "DENIED"));

    expect(apiError.status).toBe(403);
    expect(apiError.code).toBe("DENIED");
    expect(getStatusTone("COMPLETED")).toBe("success");
    expect(getStatusTone("REVISION_REQUIRED")).toBe("warning");
    expect(formatDuration(125)).toBe("2m 05s");
  });

  it("renders shared loading and badge components safely", () => {
    const markup = renderToStaticMarkup(
      <div>
        <LoadingSpinner label="Memuatkan sesi" />
        <RoleBadge role="PARENT" />
        <StatusBadge status="PENDING" />
      </div>,
    );

    expect(markup).toContain("Memuatkan sesi");
    expect(markup).toContain("Ibu Bapa");
    expect(markup).toContain("PENDING");
  });

  it("renders a safe router-level recovery state", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><ServerErrorPage /></MemoryRouter>);
    expect(markup).toContain("Ralat pelayan");
    expect(markup).toContain("href=\"/\"");
  });
});
