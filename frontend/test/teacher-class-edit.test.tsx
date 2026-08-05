import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { TeacherClassEditForm } from "@/features/teacher/components/TeacherClassEditForm";
import type { TeacherClassDetail } from "@/features/teacher/types/teacher-class.types";
import { ApiError } from "@/lib/api";
import {
  buildTeacherClassCreatePayload,
  mapTeacherClassEditSubmissionError,
} from "@/features/teacher/utils/teacher-class-create";

const detail: TeacherClassDetail = {
  id: "33333333-3333-4333-8333-333333333333",
  schoolId: "11111111-1111-4111-8111-111111111111",
  teacherId: "22222222-2222-4222-8222-222222222222",
  className: "A",
  yearLevel: 1,
  academicYear: 2026,
  studentCount: 2,
  accountStatus: "ACTIVE",
  capacity: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("Guru Edit Kelas", () => {
  it("uses the real edit route and page", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherClassEditPage.tsx", import.meta.url), "utf8");

    expect(routes).toContain('{ path: "kelas/:classId/edit", element: <TeacherClassEditPage /> }');
    expect(page).toContain('{ label: "Guru", to: "/guru" }');
    expect(page).toContain('{ label: "Kelas", to: "/guru/kelas" }');
    expect(page).toContain('{ label: "Edit Kelas" }');
    expect(page).toContain('title="Edit Kelas"');
    expect(page).toContain('description="Kemas kini maklumat kelas asal murid."');
    expect(page).toContain("Maklumat kelas berjaya dikemas kini.");
    expect(page).toContain("queryClient.invalidateQueries({ queryKey: teacherClassKeys.all })");
    expect(page).toContain("navigate(detailPath, { replace: true })");
  });

  it("renders the wide prepopulated form with full-width controls and no school selector", () => {
    const formSource = readFileSync(new URL("../src/features/teacher/components/TeacherClassEditForm.tsx", import.meta.url), "utf8");
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherClassEditForm detail={detail} detailPath="/guru/kelas/33333333-3333-4333-8333-333333333333" submitting={false} onSubmit={async () => undefined} />
      </MemoryRouter>,
    );

    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("Maklumat Kelas");
    expect(markup).toContain("Kemas kini maklumat kelas yang digunakan semasa pendaftaran murid.");
    expect(markup).toContain("Perubahan akan digunakan pada rekod murid berkaitan");
    expect(markup).toContain("Tahun");
    expect(markup).toContain("Nama Kelas");
    expect(markup).toContain("Sesi Akademik");
    expect(formSource).toContain("yearLevel: String(detail.yearLevel)");
    expect(formSource).toContain("className: detail.className");
    expect(formSource).toContain("academicYear: String(detail.academicYear)");
    expect(markup).toContain("h-12 w-full rounded-xl bg-background/60 text-base");
    expect(markup).toContain("h-12 rounded-xl border-input bg-background/60 pr-12 text-base");
    expect(markup).toContain("Simpan Perubahan");
    expect(markup).not.toContain("schoolId");
    expect(markup).not.toContain("Sekolah");
  });

  it("builds the update payload and maps duplicate errors consistently", () => {
    expect(buildTeacherClassCreatePayload({ yearLevel: "2", className: " Bestari ", academicYear: "2027" })).toEqual({
      yearLevel: 2,
      className: "Bestari",
      academicYear: 2027,
    });
    expect(mapTeacherClassEditSubmissionError(new ApiError("duplicate", 409, "CLASS_ALREADY_EXISTS"))).toEqual({
      field: "className",
      message: "Kelas ini telah wujud bagi tahun dan sesi akademik yang dipilih.",
    });
    expect(mapTeacherClassEditSubmissionError(new ApiError("forbidden", 403, "AUTH_OWNER_ACCESS_DENIED"))).toEqual({
      message: "Kelas tidak ditemui atau anda tidak mempunyai kebenaran untuk mengurus rekod ini.",
    });
  });
});
