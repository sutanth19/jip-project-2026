import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AssignmentCards } from "@/features/student/components/StudentComponents";
import { listFrom, safeEntries } from "@/features/student/utils/student-record";
import { getDashboardPathForRole } from "@/lib/auth-routes";

describe("Phase 27E student module", () => {
  it("opens the dedicated Student portal after login", () => {
    expect(getDashboardPathForRole("STUDENT")).toBe("/murid");
  });

  it("uses Student assignment list DTOs without preview DTO data", () => {
    const list = listFrom({ assignments: [{ id: "assignment-1", title: "Baca", canOpen: true }] }, "assignments");
    expect(list.records).toHaveLength(1);
    expect(list.records[0].title).toBe("Baca");
  });

  it("removes answer keys, private notes, credentials and filesystem fields", () => {
    const visible = safeEntries({ title: "Tugasan", correctAnswer: "a", isCorrect: true, internalNotes: "private", pinHash: "private", mediaPath: "/private/a" });
    expect(visible).toEqual([["title", "Tugasan"]]);
  });

  it("renders an authorized assignment action only when backend canOpen is true", () => {
    const markup = renderToStaticMarkup(<MemoryRouter><AssignmentCards rows={[{ id: "a1", title: "Baca", canOpen: true, availabilityStatus: "AVAILABLE", activity: { title: "Aktiviti" } }]} /></MemoryRouter>);
    expect(markup).toContain("Mula atau sambung");
    expect(markup).toContain("/murid/tugasan/a1");
  });
});
