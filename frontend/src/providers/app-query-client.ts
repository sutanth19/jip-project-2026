import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

export function shouldRetryAppQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return false;
    }

    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }

  return failureCount < 1;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryAppQuery,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
