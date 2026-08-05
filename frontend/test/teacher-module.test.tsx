import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SafeDetails, TeacherStats } from "@/features/teacher/components/TeacherComponents";
import { normalizeList, safeEntries } from "@/features/teacher/utils/teacher-record";
import { getDashboardPathForRole } from "@/lib/auth-routes";

describe("Phase 27D teacher module", () => {
  it("routes a teacher into the dedicated protected module", () => {
    expect(getDashboardPathForRole("TEACHER")).toBe("/guru");
  });

  it("normalizes only real paginated DTO collection keys", () => {
    expect(normalizeList({ assignments: [{ id: "a1" }], pagination: { page: 1, limit: 20, total: 1 } }, ["assignments"]).records).toEqual([{ id: "a1" }]);
    expect(normalizeList({ submissions: [{ id: "s1" }] }, ["submissions"]).records).toEqual([{ id: "s1" }]);
  });

  it("never renders authentication, answer-key, or storage-path fields", () => {
    const record = { fullName: "Aina", passwordHash: "secret-password", pinHash: "secret-pin", correctAnswer: "secret-answer", mediaPath: "/private/file" };
    expect(safeEntries(record).map(([key]) => key)).toEqual(["fullName"]);
    const markup = renderToStaticMarkup(<SafeDetails record={record} />);
    expect(markup).toContain("Aina");
    expect(markup).not.toContain("secret-password");
    expect(markup).not.toContain("secret-pin");
    expect(markup).not.toContain("secret-answer");
    expect(markup).not.toContain("/private/file");
  });

  it("renders backend-provided dashboard metrics without placeholder numbers", () => {
    const markup = renderToStaticMarkup(<TeacherStats items={[{ label: "Kelas Saya", value: 2 }, { label: "Semakan Menunggu", value: 4 }]} />);
    expect(markup).toContain("Kelas Saya");
    expect(markup).toContain("Semakan Menunggu");
    expect(markup).toContain("4");
  });
});
