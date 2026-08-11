import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { TeacherStudentCreateForm } from "@/features/teacher/components/TeacherStudentCreateForm";
import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import { ApiError } from "@/lib/api";
import { ToastContext, type ToastContextValue } from "@/providers/toast-context-value";
import {
  buildTeacherStudentCreatePayload,
  filterActiveTeacherClassesByYear,
  mapTeacherStudentCreateSubmissionError,
  teacherStudentCreateDefaultValues,
} from "@/features/teacher/utils/teacher-student-create";

const activeYearTwoClass: TeacherClassListItem = {
  id: "22222222-2222-4222-8222-222222222222",
  className: "C",
  yearLevel: 2,
  academicYear: 2026,
  studentCount: 0,
  accountStatus: "ACTIVE",
  teacherId: "teacher-1",
  schoolId: "school-1",
  createdAt: "",
  updatedAt: "",
};
const toastValue: ToastContextValue = {
  notify: () => undefined,
  success: () => undefined,
  error: () => undefined,
  warning: () => undefined,
  info: () => undefined,
};

describe("Guru Tambah Murid", () => {
  it("replaces the staged route with the real create page and breadcrumb", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherStudentCreatePage.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("../src/components/dashboard/DashboardTopbar.tsx", import.meta.url), "utf8");

    expect(routes).toContain('import { TeacherStudentCreatePage }');
    expect(routes).toContain('{ path: "murid/tambah", element: <TeacherStudentCreatePage /> }');
    expect(routes).not.toContain("TeacherStudentCreateStagedPage");
    expect(page).toContain('title="Tambah Murid"');
    expect(page).toContain('description="Daftarkan murid Program Pemulihan Khas bagi sekolah anda."');
    expect(page).toContain('{ label: "Guru", to: "/guru" }');
    expect(page).toContain('{ label: "Murid", to: "/guru/murid" }');
    expect(page).toContain('{ label: "Tambah Murid" }');
    expect(page).toContain('to="/guru/murid"');
    expect(topbar).toContain('{ path: "/guru/murid/tambah", label: "Tambah Murid" }');
  });

  it("renders the shared create layout with supported real student fields only", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ToastContext.Provider value={toastValue}>
            <TeacherStudentCreateForm
              classes={[activeYearTwoClass]}
              classesLoading={false}
              classesError={false}
              onRetryClasses={() => undefined}
              onSubmit={async () => ({
                student: {
                  id: "student-1",
                  studentId: "MURID-ABC12345",
                  fullName: "Kumar Raj",
                  accountStatus: "ACTIVE",
                  remedialSkill: {
                    id: "skill-1",
                    code: "KP04",
                    name: "Suku kata KV",
                    sequence: 4,
                  },
                  class: activeYearTwoClass,
                },
                credentials: { studentId: "MURID-ABC12345", temporaryPin: "0274" },
              })}
              submitting={false}
            />
          </ToastContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl items-center gap-4");
    expect(markup).toContain("mx-auto w-full max-w-5xl space-y-6");
    expect(markup).toContain("Maklumat Murid");
    expect(markup).toContain("Masukkan maklumat asas dan penempatan kelas murid.");
    expect(markup).not.toContain("Kelas asal akan digunakan dalam rekod murid");
    expect(markup).toContain("Nama Penuh");
    expect(markup).toContain("Tahun");
    expect(markup).toContain("Kelas Asal");
    expect(markup).toContain("Jantina");
    expect(markup).toContain("Kemahiran Pemulihan");
    expect(markup).toContain("grid gap-6 md:grid-cols-2");
    expect(markup).toContain("Pilih tahun terlebih dahulu. Senarai kelas aktif akan dipaparkan mengikut tahun tersebut.");
    expect(markup).toContain("Maklumat log masuk dijana oleh sistem");
    expect(markup).toContain("Sistem akan menghasilkan ID Murid dan PIN 4 digit selepas pendaftaran berjaya.");
    expect(markup).toContain("Maklumat tersebut hanya dipaparkan sekali dan perlu diserahkan kepada murid.");
    expect(markup).toContain("ID Murid automatik");
    expect(markup).toContain("PIN sekali papar");
    expect(markup).not.toContain("teacher-student-id");
    expect(markup).not.toContain("Tarikh Lahir");
    expect(markup).not.toContain("PIN Murid *");
    expect(markup).not.toContain("schoolId");
    expect(markup).not.toContain("Pilih sekolah");
  });

  it("builds a teacher-scoped payload without generated credential fields and maps safe errors", () => {
    expect(teacherStudentCreateDefaultValues).toEqual({
      fullName: "",
      yearLevel: "",
      classId: "",
      remedialSkillId: "",
      gender: "",
    });
    expect(buildTeacherStudentCreatePayload({
      fullName: "  Kumar Raj  ",
      yearLevel: "2",
      classId: activeYearTwoClass.id,
      remedialSkillId: "33333333-3333-4333-8333-333333333333",
      gender: "MALE",
    })).toEqual({
      fullName: "Kumar Raj",
      yearLevel: 2,
      classId: activeYearTwoClass.id,
      remedialSkillId: "33333333-3333-4333-8333-333333333333",
      gender: "MALE",
    });
    expect(JSON.stringify(buildTeacherStudentCreatePayload({
      fullName: "Kumar Raj",
      yearLevel: "2",
      classId: activeYearTwoClass.id,
      remedialSkillId: "33333333-3333-4333-8333-333333333333",
      gender: "MALE",
    }))).not.toMatch(/studentId|pin|birthDate|schoolId/);
    expect(mapTeacherStudentCreateSubmissionError(new ApiError("inactive", 400, "SCHOOL_CLASS_INACTIVE"))).toEqual({
      field: "classId",
      message: "Kelas yang dipilih tidak aktif.",
    });
    expect(mapTeacherStudentCreateSubmissionError(new ApiError("generation", 500, "STUDENT_ID_GENERATION_FAILED"))).toEqual({
      message: "ID murid tidak dapat dijana. Sila cuba lagi.",
    });
    expect(mapTeacherStudentCreateSubmissionError(new ApiError("skill", 400, "REMEDIAL_SKILL_UNAVAILABLE"))).toEqual({
      field: "remedialSkillId",
      message: "Kemahiran pemulihan yang dipilih tidak sah.",
    });
  });

  it("filters active real classes by selected year and keeps create API on /students", () => {
    const api = readFileSync(new URL("../src/features/teacher/api/teacher-student.api.ts", import.meta.url), "utf8");
    const form = readFileSync(new URL("../src/features/teacher/components/TeacherStudentCreateForm.tsx", import.meta.url), "utf8");
    const archivedYearTwo = { ...activeYearTwoClass, id: "archived", accountStatus: "ARCHIVED" as const };
    const activeYearThree = { ...activeYearTwoClass, id: "year-three", yearLevel: 3 };

    expect(filterActiveTeacherClassesByYear([activeYearTwoClass, archivedYearTwo, activeYearThree], "2")).toEqual([activeYearTwoClass]);
    expect(api).toContain('apiRequest<TeacherStudentCreateResult>("/students"');
    expect(api).not.toContain("schoolId");
    expect(form).toContain("filterActiveTeacherClassesByYear(classes, selectedYearLevel)");
    expect(form).toContain('form.setValue("classId", ""');
    expect(form).toContain("Pilih tahun dahulu");
    expect(form).toContain("Tiada kelas aktif bagi tahun ini");
    expect(form).toContain("grid gap-6 md:grid-cols-2");
    expect(form).not.toContain("xl:grid-cols-3");
    expect(form).toContain('to="/guru/kelas"');
    expect(form).toContain("Murid berjaya didaftarkan");
    expect(form).toContain("PIN ini hanya dipaparkan sekali.");
    expect(form).toContain("Salin Maklumat Log Masuk");
    expect(form).toContain("navigator.clipboard.writeText");
    expect(form).toContain("setCreatedResult(null)");
    expect(form).not.toContain("localStorage");
    expect(form).not.toContain("sessionStorage");
  });
});
