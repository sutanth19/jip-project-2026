import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { RequireRole } from "@/routes/guards";
import type { AuthRole } from "@/types/auth";

type MockState = {
  isAuthenticated: boolean;
  role: AuthRole | null;
};

let mockState: MockState = {
  isAuthenticated: false,
  role: null,
};

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector?: (state: MockState) => unknown) => (
    selector ? selector(mockState) : mockState
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-navigate={to} data-replace={replace ? "true" : "false"} />
    ),
  };
});

function renderGuard() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RequireRole roles={["ADMIN"]}>
        <div>allowed</div>
      </RequireRole>
    </MemoryRouter>,
  );
}

describe("role guard auth-state handling", () => {
  afterEach(() => {
    mockState = {
      isAuthenticated: false,
      role: null,
    };
  });

  it("redirects unauthenticated access to login", () => {
    mockState = {
      isAuthenticated: false,
      role: null,
    };

    const markup = renderGuard();

    expect(markup).toContain('data-navigate="/login"');
    expect(markup).not.toContain("allowed");
  });

  it("keeps authenticated role mismatches on the 403 route", () => {
    mockState = {
      isAuthenticated: true,
      role: "TEACHER",
    };

    const markup = renderGuard();

    expect(markup).toContain('data-navigate="/403"');
    expect(markup).not.toContain("allowed");
  });
});
