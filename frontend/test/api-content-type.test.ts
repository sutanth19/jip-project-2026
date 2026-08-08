import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { prepareApiRequestHeaders } from "@/lib/api";

describe("API content-type handling", () => {
  it("keeps JSON requests on application/json", () => {
    const headers = prepareApiRequestHeaders({ "Content-Type": "application/json" }, { hello: "world" });

    expect(headers["content-type"]).toBe("application/json");
  });

  it("drops the JSON content-type for multipart bodies so the browser can add the boundary", () => {
    const headers = prepareApiRequestHeaders({ "Content-Type": "application/json" }, new FormData());

    expect(headers["content-type"]).toBeUndefined();
  });

  it("removes the manual multipart header from the media upload helper", () => {
    const mediaApiSource = readFileSync(new URL("../src/features/admin/api/media.api.ts", import.meta.url), "utf8");

    expect(mediaApiSource).not.toContain("multipart/form-data");
    expect(mediaApiSource).toContain("apiClient.post<ApiSuccessResponse<unknown>>(");
  });
});
