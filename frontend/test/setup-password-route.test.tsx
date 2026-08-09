import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import SetupPasswordPage from "@/pages/auth/SetupPasswordPage";

describe("setup-password route flow", () => {
  it("keeps the setup-password route registered in the browser router", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "setup-password"');
    expect(routes).toContain("<SetupPasswordPage />");
    expect(routes).toContain('path: "login"');
    expect(routes).toContain("<LoginPage />");
  });

  it("reads the token query parameter and renders the setup form when present", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/setup-password?token=real-setup-token"]}>
        <SetupPasswordPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("Lengkapkan akaun");
    expect(markup).toContain("Kata laluan baharu");
    expect(markup).not.toContain("Pautan penyediaan tidak sah");
    expect(markup).not.toContain("real-setup-token");
  });

  it("shows the existing invalid-link state when the token query parameter is missing", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/setup-password"]}>
        <SetupPasswordPage />
      </MemoryRouter>,
    );

    expect(markup).toContain("Pautan penyediaan tidak sah");
    expect(markup).toContain('href="/login"');
  });
});
