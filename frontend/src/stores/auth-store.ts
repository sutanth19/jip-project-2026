import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  clearStoredToken,
  getStoredRefreshToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/api";
import type { AuthProfile, AuthRole, AuthSession, AuthUser, PermissionKey } from "@/types/auth";
import { getPermissionsForRole } from "@/utils/permissions";

export type { AuthProfile, AuthRole, AuthSession, AuthUser, PermissionKey };

type SessionInput = {
  accessToken: string;
  refreshToken?: string | null;
  user: AuthUser;
  profile: AuthProfile;
  rememberMe: boolean;
  permissions?: PermissionKey[];
  requiresPasswordChange?: boolean;
  requiresPinChange?: boolean;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  profile: AuthProfile | null;
  role: AuthRole | null;
  permissions: PermissionKey[];
  school: AuthSession["school"];
  rememberMe: boolean;
  requiresPasswordChange: boolean;
  requiresPinChange: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastError: string | null;
  setSession: (input: SessionInput) => void;
  hydrateTokens: () => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  clearSession: () => void;
};

function getSchoolFromProfile(profile: AuthProfile): AuthSession["school"] {
  if (!profile.schoolId) {
    return null;
  }

  return {
    id: profile.schoolId,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: getStoredToken(),
      refreshToken: getStoredRefreshToken(),
      user: null,
      profile: null,
      role: null,
      permissions: [],
      school: null,
      rememberMe: false,
      requiresPasswordChange: false,
      requiresPinChange: false,
      isAuthenticated: false,
      isLoading: true,
      lastError: null,
      setSession: ({
        accessToken,
        refreshToken = null,
        user,
        profile,
        rememberMe,
        permissions,
        requiresPasswordChange = false,
        requiresPinChange = false,
      }) => {
        const rolePermissions = permissions ?? getPermissionsForRole(user.role);
        setStoredToken(accessToken, rememberMe, refreshToken);
        set({
          accessToken,
          refreshToken,
          user,
          profile,
          role: user.role,
          permissions: rolePermissions,
          school: getSchoolFromProfile(profile),
          rememberMe,
          requiresPasswordChange,
          requiresPinChange,
          isAuthenticated: true,
          isLoading: false,
          lastError: null,
        });
      },
      hydrateTokens: () => {
        set({
          accessToken: getStoredToken(),
          refreshToken: getStoredRefreshToken(),
        });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (lastError) => set({ lastError }),
      clearSession: () => {
        clearStoredToken();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          profile: null,
          role: null,
          permissions: [],
          school: null,
          rememberMe: false,
          requiresPasswordChange: false,
          requiresPinChange: false,
          isAuthenticated: false,
          isLoading: false,
          lastError: null,
        });
      },
    }),
    {
      name: "literasi-digital-auth",
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        role: state.role,
        permissions: state.permissions,
        school: state.school,
        rememberMe: state.rememberMe,
        requiresPasswordChange: state.requiresPasswordChange,
        requiresPinChange: state.requiresPinChange,
        isAuthenticated: state.isAuthenticated,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

