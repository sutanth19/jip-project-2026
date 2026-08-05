import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TeacherClassCreateForm } from "@/features/teacher/components/TeacherClassCreateForm";
import { ApiError } from "@/lib/api";
import {
  buildTeacherClassCreatePayload,
  mapTeacherClassCreateSubmissionError,
  teacherClassAcademicYearOptions,
  teacherClassCreateDefaultValues,
} from "@/features/teacher/utils/teacher-class-create";

function countOccurrences(value: string, search: string) {
  return value.split(search).length - 1;
}

describe("Guru Tambah Kelas", () => {
  it("uses the real create route and page instead of the placeholder", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const createPage = readFileSync(new URL("../src/features/teacher/pages/TeacherClassCreatePage.tsx", import.meta.url), "utf8");

    expect(routes).toContain('{ path: "kelas/tambah", element: <TeacherClassCreatePage /> }');
    expect(routes).not.toContain("TeacherClassCreatePlaceholderPage");
    expect(createPage).toContain('title="Tambah Kelas"');
    expect(createPage).toContain('description="Daftarkan kelas asal bagi sekolah anda."');
    expect(createPage).toContain('{ label: "Guru", to: "/guru" }');
    expect(createPage).toContain('{ label: "Kelas", to: "/guru/kelas" }');
    expect(createPage).toContain('{ label: "Tambah Kelas" }');
    expect(createPage).toContain('to="/guru/kelas"');
    expect(createPage).toContain("Kembali");
  });

  it("renders the shared create-form layout with only the required fields and actions", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherClassCreateForm onSubmit={async () => undefined} submitting={false} />
      </MemoryRouter>,
    );

    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl items-center gap-4");
    expect(markup).toContain("border-t border-border");
    expect(markup).toContain("mx-auto w-full max-w-5xl space-y-6");
    expect(markup).toContain("w-full border-t border-border bg-muted/30 p-5 sm:p-6");
    expect(markup).toContain("Maklumat Kelas");
    expect(markup).toContain("Maklumat ini digunakan semasa pendaftaran murid.");
    expect(markup).toContain("Kelas akan digunakan untuk pendaftaran murid");
    expect(markup).toContain("Rekod kelas ini akan tersedia semasa guru memilih kelas asal murid dalam proses pendaftaran.");
    expect(markup).toContain("Tahun");
    expect(markup).toContain("Nama Kelas");
    expect(markup).toContain("Sesi Akademik");
    expect(countOccurrences(markup, "h-12 w-full rounded-xl bg-background/60 text-base")).toBe(2);
    expect(markup).toContain("h-12 rounded-xl border-input bg-background/60 pr-12 text-base");
    expect(markup).toContain("Batal");
    expect(markup).toContain("Tambah Kelas");
    expect(markup).not.toContain("Sekolah");
    expect(markup).not.toContain("schoolId");
    expect(markup).toContain('placeholder="Contoh: A, Bestari, Cemerlang"');
  });

  it("builds the teacher-scoped payload and duplicate error mapping correctly", () => {
    expect(teacherClassCreateDefaultValues.academicYear).toBe(String(new Date().getFullYear()));
    expect(buildTeacherClassCreatePayload({ yearLevel: "2", className: "  A  ", academicYear: "2026" })).toEqual({
      yearLevel: 2,
      className: "A",
      academicYear: 2026,
    });
    expect(teacherClassAcademicYearOptions()).toContain(new Date().getFullYear());
    expect(mapTeacherClassCreateSubmissionError(new ApiError("duplicate", 409, "CLASS_ALREADY_EXISTS"))).toEqual({
      field: "className",
      message: "Kelas ini telah wujud bagi tahun dan sesi akademik yang dipilih.",
    });
  });

  it("keeps breadcrumbs off the kelas list page and on the create page", () => {
    const listPage = readFileSync(new URL("../src/features/teacher/pages/TeacherClassPages.tsx", import.meta.url), "utf8");
    const createPage = readFileSync(new URL("../src/features/teacher/pages/TeacherClassCreatePage.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("../src/components/dashboard/DashboardTopbar.tsx", import.meta.url), "utf8");

    expect(listPage).not.toContain("breadcrumb={[");
    expect(listPage).not.toContain('{ label: "Kelas" }');
    expect(createPage).toContain("breadcrumb={[");
    expect(createPage).toContain('{ label: "Guru", to: "/guru" }');
    expect(createPage).toContain('{ label: "Kelas", to: "/guru/kelas" }');
    expect(createPage).toContain('{ label: "Tambah Kelas" }');
    expect(topbar).toContain('{ path: "/guru", label: "Guru" }');
    expect(topbar).toContain('{ path: "/guru/kelas", label: "Kelas" }');
    expect(topbar).toContain('{ path: "/guru/kelas/tambah", label: "Tambah Kelas" }');
  });
});
