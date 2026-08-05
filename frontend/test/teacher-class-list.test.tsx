import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  TeacherClassEmptyState,
  TeacherClassErrorState,
  TeacherClassFilteredEmptyState,
  TeacherClassListFilters,
  TeacherClassListLoading,
  TeacherClassListTable,
  TeacherClassMobileCards,
  TeacherClassNoSchoolState,
  TeacherClassPagination,
} from "@/features/teacher/components/TeacherClassList";
import {
  defaultTeacherClassQuery,
  normalizeTeacherClassListResponse,
  teacherClassDisplayLabel,
  teacherClassStatusOptions,
  teacherClassYearLabel,
} from "@/features/teacher/utils/teacher-class";

const classRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  schoolId: "11111111-1111-4111-8111-111111111111",
  teacherId: "22222222-2222-4222-8222-222222222222",
  className: "Bestari",
  yearLevel: 2,
  academicYear: 2026,
  studentCount: 3,
  accountStatus: "ACTIVE" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

describe("Guru Pengurusan Kelas list", () => {
  it("uses the real guru route, page copy, and sidebar terminology", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherClassPages.tsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/dashboard/Sidebar.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("../src/components/dashboard/DashboardTopbar.tsx", import.meta.url), "utf8");

    expect(routes).toContain('{ path: "kelas", element: <TeacherClassListPage /> }');
    expect(routes).toContain('{ path: "kelas/tambah", element: <TeacherClassCreatePage /> }');
    expect(topbar).toContain('{ path: "/guru/kelas", label: "Kelas" }');
    expect(topbar).not.toContain('{ path: "/guru/kelas", label: "Dashboard" }');
    expect(page).not.toContain("breadcrumb={[");
    expect(page).not.toContain('{ label: "Kelas" }');
    expect(page).toContain('title="Kelas"');
    expect(page).toContain('description="Urus kelas asal murid bagi sekolah anda."');
    expect(page).toContain("Tambah Kelas");
    expect(page).toContain("<TeacherClassListFilters");
    expect(page).toContain("<TeacherClassListTable");
    expect(page).toContain("<TeacherClassPagination");
    expect(page).not.toContain("school selector");
    expect(sidebar).toContain('{ title: "Kelas", url: "/guru/kelas"');
    expect(sidebar).not.toContain('{ title: "Kelas Saya", url: "/guru/kelas"');
  });

  it("renders the real filters and keeps the shared debounced search pattern", () => {
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherClassList.tsx", import.meta.url), "utf8");
    const markup = renderToStaticMarkup(
      <TeacherClassListFilters
        query={{ ...defaultTeacherClassQuery, search: "Bestari", yearLevel: 2, status: "ACTIVE" }}
        academicYearOptions={[2027, 2026, 2025]}
        onChange={() => undefined}
      />,
    );

    expect(source).toContain("useDebouncedSearchInput({");
    expect(source).toContain("value={searchInput}");
    expect(source).toContain("onChange={handleSearchInputChange}");
    expect(source).toContain("teacherYearLevelOptions.map");
    expect(source).toContain('SelectItem value="all">Semua sesi</SelectItem>');
    expect(source).toContain("teacherClassStatusOptions.map");
    expect(source).not.toContain('value={query.search ?? ""}');
    expect(markup).toContain("Cari kelas mengikut nama kelas atau tahun.");
    expect(markup).toContain("Reset");
    expect(teacherClassStatusOptions.map((option) => option.label)).toEqual([
      "Semua status",
      "Aktif",
      "Digantung",
      "Diarkibkan",
    ]);
  });

  it("renders desktop rows with real class data, student count, Malay status, and view navigation", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherClassListTable rows={[classRecord]} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Kelas");
    expect(markup).toContain("Tahun");
    expect(markup).toContain("Sesi Akademik");
    expect(markup).toContain("Bilangan Murid");
    expect(markup).toContain("Status");
    expect(markup).toContain("Tindakan");
    expect(markup).toContain("Bestari");
    expect(markup).toContain("2 Bestari");
    expect(markup).toContain("Tahun 2");
    expect(markup).toContain(">2026<");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Aktif");
    expect(markup).toContain('href="/guru/kelas/33333333-3333-4333-8333-333333333333"');
    expect(markup).toContain('aria-label="Lihat kelas Bestari"');
    expect(markup).not.toContain("Sekolah");
    expect(markup).not.toContain("mock");
  });

  it("renders mobile cards with the required data and full-width action", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherClassMobileCards rows={[classRecord]} />
      </MemoryRouter>,
    );

    expect(markup).toContain("md:hidden");
    expect(markup).toContain("2 Bestari");
    expect(markup).toContain("Tahun 2");
    expect(markup).toContain("Sesi Akademik");
    expect(markup).toContain("Bilangan Murid");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("w-full");
    expect(markup).toContain('href="/guru/kelas/33333333-3333-4333-8333-333333333333"');
  });

  it("renders loading, empty, filtered-empty, no-school, error, and pagination states safely", () => {
    const loading = renderToStaticMarkup(<TeacherClassListLoading />);
    const empty = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherClassEmptyState hasFilters={false} canCreate />
      </MemoryRouter>,
    );
    const filteredEmpty = renderToStaticMarkup(<TeacherClassFilteredEmptyState onReset={() => undefined} />);
    const noSchool = renderToStaticMarkup(<TeacherClassNoSchoolState />);
    const error = renderToStaticMarkup(<TeacherClassErrorState onRetry={() => undefined} />);
    const pagination = renderToStaticMarkup(
      <TeacherClassPagination
        page={1}
        limit={10}
        total={18}
        totalPages={2}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Memuatkan senarai kelas");
    expect(loading).toContain("grid-cols-[1.5fr_0.8fr_0.9fr_0.9fr_0.8fr_auto]");
    expect(empty).toContain("Tiada kelas ditemui");
    expect(empty).toContain("Tambah kelas pertama untuk mula menguruskan murid.");
    expect(empty).toContain("Tambah Kelas");
    expect(filteredEmpty).toContain("Tiada kelas yang sepadan dengan carian atau penapis semasa.");
    expect(filteredEmpty).toContain("Reset Penapis");
    expect(noSchool).toContain("Sekolah belum ditetapkan");
    expect(noSchool).toContain("Guru ini belum dipautkan kepada sekolah. Hubungi pentadbir untuk menetapkan sekolah.");
    expect(noSchool).not.toContain("Tambah Kelas");
    expect(error).toContain("Kelas tidak dapat dimuatkan.");
    expect(error).toContain("Cuba Semula");
    expect(error).not.toContain("Prisma");
    expect(pagination).toContain("Menunjukkan 1-10 daripada 18 kelas");
    expect(pagination).toContain("Baris setiap halaman");
    expect(pagination).toContain("Halaman 1 daripada 2");
  });

  it("normalizes the real classes DTO and keeps display helpers aligned with the UI", () => {
    expect(normalizeTeacherClassListResponse({
      classes: [classRecord],
      pagination: { page: 2, limit: 10, total: 12, totalPages: 2, hasNextPage: false, hasPreviousPage: true },
    })).toEqual({
      classes: [classRecord],
      pagination: { page: 2, limit: 10, total: 12, totalPages: 2, hasNextPage: false, hasPreviousPage: true },
    });
    expect(teacherClassDisplayLabel(classRecord)).toBe("2 Bestari");
    expect(teacherClassYearLabel(6)).toBe("Tahun 6");
  });

  it("does not ship mock class records or a school selector in the real guru class list code", () => {
    const source = readFileSync(new URL("../src/features/teacher/components/TeacherClassList.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/teacher/pages/TeacherClassPages.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("1 Amanah");
    expect(source).not.toContain("Bestari mock");
    expect(source).not.toContain("school selector");
    expect(page).toContain("Boolean(school?.id)");
    expect(page).not.toContain("Belum ditetapkan\"");
  });
});
