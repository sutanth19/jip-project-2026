import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { RequireSchool } from "@/routes/guards";
import type { AuthRole } from "@/types/auth";

type MockState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: AuthRole | null;
  school: { id: string } | null;
};

let mockState: MockState = {
  isLoading: false,
  isAuthenticated: false,
  role: null,
  school: null,
};

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: MockState) => unknown) => selector(mockState),
}));

function renderGuard() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RequireSchool>
        <div>allowed</div>
      </RequireSchool>
    </MemoryRouter>,
  );
}

describe("school guard", () => {
  afterEach(() => {
    mockState = {
      isLoading: false,
      isAuthenticated: false,
      role: null,
      school: null,
    };
  });

  it("does not redirect ADMIN sessions with null school context", () => {
    mockState = { isLoading: false, isAuthenticated: true, role: "ADMIN", school: null };

    expect(renderGuard()).toContain("allowed");
  });

  it("still blocks TEACHER sessions without school context", () => {
    mockState = { isLoading: false, isAuthenticated: true, role: "TEACHER", school: null };

    expect(renderGuard()).not.toContain("allowed");
  });
});
