import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingSpinner, RoleBadge, StatusBadge } from "@/components/shared";
import LoginForm from "@/components/auth/LoginForm";
import { PasswordStrengthInput } from "@/components/auth/PasswordStrengthInput";
import { ApiError, parseApiError } from "@/lib/api";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { canAccessRoleRoute, getUnauthorizedRedirect } from "@/routes/route-policy";
import { useAuthStore } from "@/stores/auth-store";
import { formatDuration } from "@/utils/date";
import { getPermissionsForRole, hasPermission, isAdminRole } from "@/utils/permissions";
import { getStatusTone } from "@/utils/status";
import { ServerErrorPage } from "@/pages/errors/ErrorPage";
import { MemoryRouter } from "react-router-dom";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import { readFileSync } from "node:fs";

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

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

  it("normalizes the backend error envelope used by auth reset responses", () => {
    const error = parseApiError({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: "PASSWORD_RESET_TOKEN_EXPIRED",
            message: "Pautan tetapan semula kata laluan telah tamat tempoh.",
          },
        },
      },
    });

    expect(error.status).toBe(400);
    expect(error.code).toBe("PASSWORD_RESET_TOKEN_EXPIRED");
    expect(error.message).toBe("Pautan tetapan semula kata laluan telah tamat tempoh.");
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

  it("renders the real forgot-password email form and student PIN guidance", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("Lupa Kata Laluan?");
    expect(markup).toContain("Masukkan alamat e-mel yang didaftarkan.");
    expect(markup).toContain("Hantar Pautan Tetapan Semula");
    expect(markup).toContain("Murid menggunakan PIN");
    expect(markup).toContain("Sila hubungi guru untuk menetapkan semula PIN.");
    expect(markup).toContain('href="/login"');
    expect(countOccurrences(markup, "Kembali ke Log Masuk")).toBe(1);
    expect(markup).not.toContain("setup-password?token");
  });

  it("renders reset-password missing-token and normal form states safely", () => {
    const missing = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );
    const form = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/reset-password?token=raw-url-token"]}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    expect(missing).toContain("Pautan tidak sah");
    expect(missing).toContain("Pautan tetapan semula kata laluan tidak lengkap atau tidak sah.");
    expect(form).toContain("Tetapkan Kata Laluan Baharu");
    expect(form).toContain("Kata Laluan Baharu");
    expect(form).toContain("Sahkan Kata Laluan Baharu");
    expect(form).toContain("Simpan Kata Laluan");
    expect(form).toContain("Sekurang-kurangnya 8 aksara");
    expect(form).toContain("Sekurang-kurangnya 1 aksara khas");
    expect(form).not.toContain("raw-url-token");
  });

  it("renders password strength requirements with non-colour status indicators", () => {
    const markup = renderToStaticMarkup(
      <PasswordStrengthInput
        id="password"
        name="password"
        label="Kata Laluan Baharu"
        value="NewPass@123"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Kekuatan kata laluan");
    expect(markup).toContain("Sangat kuat");
    expect(markup).toContain("Sekurang-kurangnya 1 huruf besar");
    expect(markup).toContain("Sekurang-kurangnya 1 huruf kecil");
    expect(markup).toContain("Sekurang-kurangnya 1 nombor");
    expect(markup).toContain("Tunjukkan kata laluan");
    expect(markup).toContain("lucide-check");
  });

  it("keeps forgot-password login integration role-aware and excludes Next.js", () => {
    const loginMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    const loginSource = readFileSync(new URL("../src/components/auth/LoginForm.tsx", import.meta.url), "utf8");
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const authService = readFileSync(new URL("../src/services/auth.service.ts", import.meta.url), "utf8");
    const resetPage = readFileSync(new URL("../src/pages/auth/ResetPasswordPage.tsx", import.meta.url), "utf8");
    const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");

    expect(loginMarkup).toContain("Lupa Kata Laluan?");
    expect(loginMarkup).toContain('href="/forgot-password"');
    expect(loginSource).toContain('activeUserType !== "student"');
    expect(routes).toContain('path: "forgot-password"');
    expect(routes).toContain('path: "reset-password"');
    expect(routes).toContain("<ResetPasswordPage />");
    expect(authService).toContain('"/auth/forgot-password"');
    expect(authService).toContain('"/auth/reset-password"');
    expect(resetPage).toContain("useSearchParams");
    expect(resetPage).not.toContain("localStorage");
    expect(resetPage).not.toContain("sessionStorage");
    expect(resetPage).not.toContain("console.log");
    expect(packageJson).not.toContain('"next"');
    expect(loginSource).not.toContain("next/link");
    expect(resetPage).not.toContain("next/link");
  });
});
