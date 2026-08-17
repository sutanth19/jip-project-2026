import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SafeDetails, TeacherStats } from "@/features/teacher/components/TeacherComponents";
import { normalizeList, safeEntries } from "@/features/teacher/utils/teacher-record";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import {
  teacherAssignmentCreateErrorMessage,
  teacherAssignmentDetailSummary,
  teacherAssignmentListSummaries,
} from "@/features/teacher/utils/teacher-assignment";
import { ApiError } from "@/lib/api";

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

  it("maps stale assignment creation failures to a controlled teacher message", () => {
    expect(
      teacherAssignmentCreateErrorMessage(
        new ApiError("Aktiviti mesti diterbitkan.", 400, "ASSIGNMENT_ACTIVITY_NOT_PUBLISHED"),
      ),
    ).toBe("Aktiviti ini tidak lagi tersedia untuk ditugaskan.");

    expect(
      teacherAssignmentCreateErrorMessage(
        new ApiError("Anda tidak dibenarkan mengakses tugasan ini.", 403, "ASSIGNMENT_ACCESS_DENIED"),
      ),
    ).toBe("Anda tidak dibenarkan menugaskan aktiviti ini.");
  });

  it("derives teacher assignment list and detail summaries from persisted assignment DTOs", () => {
    const rows = [
      {
        id: "assignment-1",
        title: "Seret Suku Kata Tahun 2",
        status: "ACTIVE",
        createdAt: "2026-08-15T09:00:00.000Z",
        updatedAt: "2026-08-15T09:00:00.000Z",
        startAt: "2026-08-15T09:00:00.000Z",
        dueAt: "2026-08-20T09:00:00.000Z",
        activity: { id: "activity-1", title: "Seret Suku Kata", rendererKey: "arrange-syllables", status: "PUBLISHED" },
        assignedBy: { teacherId: "teacher-1", name: "Cikgu Aina" },
        school: { id: "school-1", schoolName: "SK Taman" },
        availability: { status: "AVAILABLE", isAvailableNow: true, isUpcoming: false, isOverdue: false, isClosed: false },
        targets: {
          classCount: 1,
          studentCount: 2,
          effectiveStudentCount: 2,
          classes: [{ id: "class-1", className: "2 Bestari" }],
          students: [
            { id: "student-1", fullName: "Ali", className: "2 Bestari" },
            { id: "student-2", fullName: "Siti", className: "2 Bestari" },
          ],
        },
      },
    ];

    expect(teacherAssignmentListSummaries(rows)).toEqual([
      {
        id: "assignment-1",
        title: "Seret Suku Kata",
        summary: "1 kelas • 2 murid dipilih",
        status: "ACTIVE",
      },
    ]);

    expect(teacherAssignmentDetailSummary(rows[0])).toEqual({
      title: "Seret Suku Kata",
      status: "ACTIVE",
      studentCount: 2,
      classCount: 1,
      teacherName: "Cikgu Aina",
    });
  });

  it("keeps teacher tugasan pages on assignment-specific read-back UI instead of generic fallback only", () => {
    const pageSource = readFileSync(
      new URL("../src/features/teacher/pages/TeacherPages.tsx", import.meta.url),
      "utf8",
    );
    const assignmentUtilSource = readFileSync(
      new URL("../src/features/teacher/utils/teacher-assignment.ts", import.meta.url),
      "utf8",
    );

    expect(pageSource).toContain("TeacherAssignmentListSection");
    expect(pageSource).toContain("TeacherAssignmentDetailSection");
    expect(assignmentUtilSource).toContain("teacherAssignmentCreateErrorMessage");
    expect(assignmentUtilSource).toContain("Aktiviti ini tidak lagi tersedia untuk ditugaskan.");
    expect(pageSource).toContain("Murid Ditugaskan");
    expect(pageSource).toContain("Ringkasan Tugasan");
    expect(pageSource).toContain('resource === "assignments" ? (');
    expect(pageSource).toContain('resource === "assignments" ? <TeacherAssignmentDetailSection record={query.data} /> : <SafeDetails record={query.data} />');
  });
});
