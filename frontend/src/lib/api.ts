import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_BASE_URL, API_TIMEOUT_MS } from "@/constants/env";

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data?: T;
};

export type ApiFailureResponse = {
  success?: false;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
  error?: {
    message?: string;
    code?: string;
    errors?: Record<string, string[]>;
  };
};

export class ApiError extends Error {
  status: number;
  code: string | null;
  errors: Record<string, string[]> | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function setStoredToken(
  accessToken: string,
  rememberMe: boolean,
  refreshToken?: string | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);

  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

function dispatchApiAuthEvent(status: 401 | 403, error: ApiError): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("auth:api-error", {
      detail: {
        status,
        message: error.message,
        code: error.code,
      },
    }),
  );
}

function mapAxiosError(error: AxiosError<ApiFailureResponse>): ApiError {
  if (error.code === "ERR_CANCELED") {
    return new ApiError("Permintaan dibatalkan.", 0, "REQUEST_CANCELED");
  }

  if (!error.response) {
    return new ApiError(
      "Rangkaian tidak tersedia. Sila semak sambungan internet anda.",
      0,
      "NETWORK_ERROR",
    );
  }

  const payload = error.response.data;
  const nestedError = payload?.error;
  return new ApiError(
    nestedError?.message ?? payload?.message ?? "Permintaan gagal.",
    error.response.status,
    nestedError?.code ?? payload?.code ?? null,
    nestedError?.errors ?? payload?.errors ?? null,
  );
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiSuccessResponse<unknown>>) => response,
  (error: AxiosError<ApiFailureResponse>) => {
    const apiError = mapAxiosError(error);

    if (apiError.status === 401) {
      clearStoredToken();
      dispatchApiAuthEvent(401, apiError);
    }

    if (apiError.status === 403) {
      dispatchApiAuthEvent(403, apiError);
    }

    return Promise.reject(apiError);
  },
);

function requestBodyFromInit(init: RequestInit): unknown {
  if (typeof init.body !== "string") {
    return init.body;
  }

  try {
    return JSON.parse(init.body);
  } catch {
    return init.body;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  const config: AxiosRequestConfig = {
    url: path,
    method: init.method ?? "GET",
    data: requestBodyFromInit(init),
    signal: init.signal ?? undefined,
    headers: Object.fromEntries(headers.entries()),
  };

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await apiClient.request<ApiSuccessResponse<T>>(config);

  if (response.data && "data" in response.data) {
    return response.data.data as T;
  }

  return undefined as T;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return mapAxiosError(error as AxiosError<ApiFailureResponse>);
  }

  return new ApiError("Ralat tidak dijangka.", 0, "UNKNOWN_ERROR");
}
