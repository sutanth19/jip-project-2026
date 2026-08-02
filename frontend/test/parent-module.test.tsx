import { describe, expect, it } from "vitest";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { parentList, parentSafeEntries } from "@/features/parent/utils/parent-record";

describe("Phase 27F parent module", () => {
  it("routes a parent to the dedicated read-only portal", () => {
    expect(getDashboardPathForRole("PARENT")).toBe("/ibu-bapa");
  });

  it("uses child-scoped list response collections", () => {
    expect(parentList({ assignments: [{ id: "assignment-1", title: "Baca" }] }, "assignments")).toEqual([{ id: "assignment-1", title: "Baca" }]);
  });

  it("does not render answers, credentials, internal notes, or audit fields", () => {
    const entries = parentSafeEntries({ title: "Tugasan", correctAnswer: "jawapan", internalNotes: "rahsia", passwordHash: "rahsia", auditLog: "rahsia" });
    expect(entries).toEqual([["title", "Tugasan"]]);
  });
});
