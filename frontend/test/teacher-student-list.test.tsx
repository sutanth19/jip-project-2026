import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  TeacherStudentListFilters,
  TeacherStudentListTable,
  TeacherStudentMobileCards,
  TeacherStudentNoSchoolState,
} from "@/features/teacher/components/TeacherStudentList";
import type { TeacherStudentListItem } from "@/features/teacher/types/teacher-student.types";
import {
  normalizeTeacherStudentListResponse,
  teacherStudentClassLabel,
  teacherStudentInitials,
  teacherStudentResetQuery,
  teacherStudentYearLabel,
} from "@/features/teacher/utils/teacher-student";

const student: TeacherStudentListItem = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "user-1",
  schoolId: "11111111-1111-4111-8111-111111111111",
  classId: "22222222-2222-4222-8222-222222222222",
  studentId: "MURID-001",
  fullName: "Kumar Raj",
  avatar: null,
  accountStatus: "ACTIVE",
  remedialLevel: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  class: {
    id: "22222222-2222-4222-8222-222222222222",
    className: "C",
    yearLevel: 2,
    academicYear: 2026,
  },
};

describe("Guru Murid list", () => {
  it("uses the real protected route, page, topbar metadata, and real create route", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("../src/components/dashboard/DashboardTopbar.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherStudentPages.tsx", import.meta.url), "utf8");

    expect(routes).toContain('import { TeacherStudentCreatePage }');
    expect(routes).toContain('{ path: "murid", element: <TeacherStudentListPage /> }');
    expect(routes).toContain('{ path: "murid/tambah", element: <TeacherStudentCreatePage /> }');
    expect(topbar).toContain('{ path: "/guru/murid", label: "Murid" }');
    expect(page).toContain('title="Murid"');
    expect(page).toContain('description="Urus murid Program Pemulihan Khas bagi sekolah anda."');
    expect(page).toContain("useTeacherStudentList(query, Boolean(school?.id))");
  });

  it("renders desktop and mobile student rows with real school-scoped DTO fields", () => {
    const tableMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherStudentListTable rows={[student]} />
      </MemoryRouter>,
    );
    const mobileMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherStudentMobileCards rows={[student]} />
      </MemoryRouter>,
    );

    expect(tableMarkup).toContain("Murid");
    expect(tableMarkup).toContain("Tahun");
    expect(tableMarkup).toContain("Kelas Asal");
    expect(tableMarkup).toContain("Tahap Pemulihan");
    expect(tableMarkup).toContain("Status");
    expect(tableMarkup).toContain("Tindakan");
    expect(tableMarkup).toContain("Kumar Raj");
    expect(tableMarkup).toContain("MURID-001");
    expect(tableMarkup).toContain("Tahun 2");
    expect(tableMarkup).toContain("2 C");
    expect(tableMarkup).toContain("Belum ditetapkan");
    expect(tableMarkup).toContain("/guru/murid/33333333-3333-4333-8333-333333333333");
    expect(mobileMarkup).toContain("Kumar Raj");
    expect(mobileMarkup).toContain("Kelas Asal");
    expect(mobileMarkup).toContain("Lihat");
  });

  it("keeps filters mounted, reuses real class options, and disables unavailable remedial filtering", () => {
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherStudentList.tsx", import.meta.url), "utf8");
    const utilsSource = readFileSync(new URL("../src/features/teacher/utils/teacher-student.ts", import.meta.url), "utf8");
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherStudentListFilters
          query={{ page: 1, limit: 10, sortBy: "fullName", sortOrder: "asc", yearLevel: 2 }}
          classes={[{
            id: "class-1",
            className: "A",
            yearLevel: 2,
            academicYear: 2026,
            studentCount: 4,
            accountStatus: "ACTIVE",
            teacherId: "teacher-1",
            schoolId: "school-1",
            createdAt: "",
            updatedAt: "",
          }]}
          classOptionsLoading={false}
          onChange={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Cari murid mengikut nama, ID murid atau kelas asal.");
    expect(source).toContain("Semua tahun");
    expect(source).toContain("Semua kelas");
    expect(source).toContain("teacherClassDisplayLabel(item)");
    expect(source).toContain("Belum tersedia");
    expect(utilsSource).toContain("Semua status");
    expect(markup).toContain("Reset");
    expect(teacherStudentResetQuery()).toEqual({ search: undefined, yearLevel: undefined, classId: undefined, status: undefined, page: 1 });
  });

  it("normalizes API responses and safe display fallbacks without mock remedial values", () => {
    const normalized = normalizeTeacherStudentListResponse({
      students: [student],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    expect(normalized.students).toHaveLength(1);
    expect(normalized.students[0]?.remedialLevel).toBeNull();
    expect(teacherStudentInitials("Kumar Raj")).toBe("KR");
    expect(teacherStudentYearLabel(2)).toBe("Tahun 2");
    expect(teacherStudentYearLabel(undefined)).toBe("Belum ditetapkan");
    expect(teacherStudentClassLabel(student)).toBe("2 C");
    expect(teacherStudentClassLabel({ class: null })).toBe("Belum ditetapkan");
  });

  it("renders the teacher-without-school state", () => {
    const markup = renderToStaticMarkup(<TeacherStudentNoSchoolState />);

    expect(markup).toContain("Sekolah belum ditetapkan");
    expect(markup).toContain("Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah.");
  });
});
