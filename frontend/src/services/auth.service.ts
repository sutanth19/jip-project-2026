import { apiRequest } from "@/lib/api";
import type { AuthProfile, AuthRole, AuthUser } from "@/types/auth";

export type StaffLoginResponse = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: string;
  requiresPasswordChange: boolean;
  user: AuthUser & {
    role: Exclude<AuthRole, "STUDENT">;
    isFirstLogin: boolean;
  };
  profile: Extract<AuthProfile, { fullName: string }>;
};

export type StudentLoginResponse = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: string;
  requiresPinChange: boolean;
  user: {
    id: string;
    role: "STUDENT";
    accountStatus: string;
  };
  profile: Extract<AuthProfile, { studentId: string }>;
};

export type CurrentSessionResponse = {
  userId: string;
  role: AuthRole;
  profileId: string;
  schoolId: string | null;
  isFirstLogin: boolean;
  requiresPinChange?: boolean;
};

export async function staffLogin(input: {
  role: Exclude<AuthRole, "STUDENT">;
  loginId: string;
  password: string;
  rememberMe: boolean;
}): Promise<StaffLoginResponse> {
  return apiRequest<StaffLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function studentLogin(input: {
  schoolId: string;
  studentId: string;
  pin: string;
}): Promise<StudentLoginResponse> {
  return apiRequest<StudentLoginResponse>("/auth/student/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCurrentSession(): Promise<CurrentSessionResponse> {
  return apiRequest<CurrentSessionResponse>("/auth/me");
}

export async function changeFirstPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string | null;
  requiresPasswordChange: false;
  user: AuthUser & { role: Exclude<AuthRole, "STUDENT">; isFirstLogin: false };
}> {
  return apiRequest("/auth/change-first-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function setupPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  return apiRequest("/auth/setup-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<void> {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function changeFirstPin(input: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string | null;
  requiresPinChange: false;
  user: {
    id: string;
    role: "STUDENT";
    accountStatus: string;
  };
}> {
  return apiRequest("/auth/student/change-first-pin", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
