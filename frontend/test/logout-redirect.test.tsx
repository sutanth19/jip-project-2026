import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/contexts/AuthContext";
import { useAuthContext } from "@/contexts/auth-context-value";
import { useAuthStore } from "@/stores/auth-store";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-navigate={to} data-replace={replace ? "true" : "false"} />
    ),
    useNavigate: () => navigateMock,
  };
});

function CaptureLogout({ onReady }: { onReady: (logout: () => void) => void }) {
  const { logout } = useAuthContext();
  onReady(logout);
  return <div>capture</div>;
}

describe("logout redirect regression", () => {
  afterEach(() => {
    navigateMock.mockReset();
    useAuthStore.getState().clearSession();
  });

  it("redirects logout to the public landing page with replace semantics and clears auth cache", () => {
    let capturedLogout: (() => void) | null = null;
    const queryClient = new QueryClient();

    useAuthStore.getState().setSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      rememberMe: false,
      user: {
        id: "admin-user",
        role: "ADMIN",
        email: "admin@example.com",
        accountStatus: "ACTIVE",
        isFirstLogin: false,
      },
      profile: {
        id: "admin-profile",
        fullName: "Admin User",
        schoolId: "school-1",
      },
    });
    queryClient.setQueryData(["auth", "me"], { userId: "admin-user" });

    renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CaptureLogout onReady={(logout) => { capturedLogout = logout; }} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    capturedLogout?.();

    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(queryClient.getQueryCache().findAll()).toHaveLength(0);
  });

});
