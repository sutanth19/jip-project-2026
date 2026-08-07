import * as React from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentSession } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth-store";
import { hasPermission } from "@/utils/permissions";
import { AuthContext, type AuthContextValue } from "./auth-context-value";


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const refreshInFlightRef = React.useRef<Promise<void> | null>(null);
  const {
    accessToken,
    role,
    permissions,
    isAuthenticated,
    isLoading,
    setLoading,
    hydrateTokens,
    clearSession,
    setError,
  } = useAuthStore();

  const logout = React.useCallback(() => {
    clearSession();
    navigate("/login", { replace: true });
  }, [clearSession, navigate]);

  const refreshSession = React.useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      hydrateTokens();

      const token = useAuthStore.getState().accessToken;
      if (!token) {
        clearSession();
        return;
      }

      setLoading(true);

      try {
        const session = await getCurrentSession();
        const current = useAuthStore.getState();
        const profile =
          current.profile ??
          ({
            id: session.profileId,
            fullName: "Pengguna",
            schoolId: session.schoolId,
          } as const);

        useAuthStore.getState().setSession({
          accessToken: token,
          refreshToken: current.refreshToken,
          user: current.user ?? {
            id: session.userId,
            role: session.role,
            email: null,
            accountStatus: "ACTIVE",
            isFirstLogin: session.isFirstLogin,
          },
          profile,
          rememberMe: current.rememberMe,
          requiresPasswordChange: session.isFirstLogin && session.role !== "STUDENT",
          requiresPinChange: Boolean(session.requiresPinChange),
        });
      } catch (error) {
        setError(error instanceof Error ? error.message : "Sesi tamat.");
        clearSession();
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    })();

    refreshInFlightRef.current = refreshPromise;

    try {
      await refreshPromise;
    } finally {
      if (refreshInFlightRef.current === refreshPromise) {
        refreshInFlightRef.current = null;
      }
    }
  }, [clearSession, hydrateTokens, setError, setLoading]);

  React.useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  React.useEffect(() => {
    const handleApiError = (event: Event) => {
      const detail = (event as CustomEvent<{ status: number }>).detail;

      if (detail.status === 401) {
        logout();
      }
    };

    window.addEventListener("auth:api-error", handleApiError);

    return () => {
      window.removeEventListener("auth:api-error", handleApiError);
    };
  }, [logout]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken && isAuthenticated),
      loading: isLoading,
      role,
      permissions,
      hasPermission: (permission) => hasPermission(permissions, permission),
      refreshSession,
      logout,
    }),
    [accessToken, isAuthenticated, isLoading, role, permissions, refreshSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
