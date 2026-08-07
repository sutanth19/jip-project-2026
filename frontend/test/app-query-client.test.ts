import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { shouldRetryAppQuery } from "@/providers/app-query-client";

describe("app query client retry policy", () => {
  it("does not retry rate-limited or other client errors", () => {
    expect(shouldRetryAppQuery(0, new ApiError("Too many requests", 429, "RATE_LIMITED"))).toBe(false);
    expect(shouldRetryAppQuery(0, new ApiError("Bad request", 400, "BAD_REQUEST"))).toBe(false);
    expect(shouldRetryAppQuery(0, new ApiError("Unauthorized", 401, "UNAUTHORIZED"))).toBe(false);
  });

  it("still retries non-client errors once", () => {
    expect(shouldRetryAppQuery(0, new Error("Network failure"))).toBe(true);
    expect(shouldRetryAppQuery(1, new Error("Network failure"))).toBe(false);
  });
});
