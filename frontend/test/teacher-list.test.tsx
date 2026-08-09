import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  TeacherListContent,
  TeacherListFilters,
  TeacherListLoading,
  TeacherListTable,
  TeacherMobileCards,
  TeacherPagination,
} from "@/features/admin/components/TeacherList";
import { getAdminEntity } from "@/features/admin/config";
import {
  teacherLimitPatch,
  teacherResetPatch,
  teacherSearchPatch,
  teacherStatusFilterOptions,
  teacherStatusPatch,
  toTeacherListItem,
} from "@/features/admin/utils/teacher-list";
import { toSearchParams } from "@/features/admin/api/admin.api";

const teacherRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "77777777-7777-4777-8777-777777777777",
  schoolId: "11111111-1111-4111-8111-111111111111",
  teacherId: "GURU001",
  fullName: "Cikgu Aisyah",
  email: "aisyah@example.edu.my",
  phone: "0123456789",
  avatar: "/api/media/files/avatar/guru.png",
  accountStatus: "ACTIVE",
  isFirstLogin: true,
  lastLogin: "2026-07-30T08:45:00.000Z",
  school: {
    id: "11111111-1111-4111-8111-111111111111",
    schoolCode: "SKDA",
    schoolName: "Sekolah Kebangsaan Darul Aman",
    logo: "/api/media/files/school-logo/skda.png",
  },
};

const neverLoggedInTeacherRecord = {
  ...teacherRecord,
  id: "44444444-4444-4444-8444-444444444444",
  teacherId: "GURU002",
  fullName: "Cikgu Badrul",
  email: "badrul@example.edu.my",
  phone: null,
  avatar: null,
  accountStatus: "PENDING",
  isFirstLogin: false,
  lastLogin: null,
  school: {
    id: null,
    schoolCode: null,
    schoolName: null,
    logo: null,
  },
};

function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

function renderTeacherList(overrides: Partial<Parameters<typeof TeacherListContent>[0]> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <TeacherListContent
        rows={[teacherRecord, neverLoggedInTeacherRecord]}
        meta={{ page: 1, limit: 10, total: 24, totalPages: 3 }}
        query={{ page: 1, limit: 10 }}
        path="/admin/guru"
        isLoading={false}
        isError={false}
        canCreate={true}
        onQueryChange={() => undefined}
        onRetry={() => undefined}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe("Pengurusan Guru list", () => {
  it("uses the real Guru admin entity route and production list branch", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityListPage.tsx", import.meta.url), "utf8");
    const config = getAdminEntity("teachers");

    expect(config.endpoint).toBe("/teachers");
    expect(config.roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(config.description).toBe("Urus akaun guru yang menggunakan platform DIGITAL MAIN-LiT.");
    expect(config.columns.map((column) => column.label)).toEqual([
      "Guru",
      "E-mel",
      "Sekolah",
      "Status",
      "Log Masuk Terakhir",
    ]);
    expect(config.columns.map((column) => column.label)).not.toContain("Telefon");
    expect(config.fields.map((field) => field.name)).toContain("phone");
    expect(config.columns.map((column) => column.label)).not.toContain("ID Guru");
    expect(routes).toContain('path: "guru", element: <AdminEntityListPage entityKey="teachers" />');
    expect(page).toContain('if (entityKey === "teachers")');
    expect(page).toContain("<TeacherListContent");
    expect(page).toContain('title="Guru"');
    expect(page).toContain('description="Urus akaun guru yang menggunakan platform DIGITAL MAIN-LiT."');
  });

  it("renders the Guru page header, action, filters, table columns, records, and pagination", () => {
    const markup = renderTeacherList();
    const text = visibleText(markup);

    expect(markup).toContain("Cari guru mengikut nama, e-mel atau sekolah.");
    expect(markup).not.toContain("Cari guru mengikut nama, e-mel, telefon atau sekolah.");
    expect(teacherStatusFilterOptions.map((option) => option.label)).toContain("Semua status");
    expect(markup).toContain("Reset");
    expect(markup).toContain("Guru");
    expect(markup).toContain("E-mel");
    expect(markup).toContain("Sekolah");
    expect(markup).not.toContain("Telefon");
    expect(markup).not.toContain("Status Penyediaan");
    expect(markup).toContain("Log Masuk Terakhir");
    expect(markup).toContain("Tindakan");
    expect(markup).not.toContain("<th scope=\"col\" class=\"px-4 py-3 text-left font-medium\">ID Guru</th>");
    expect(text).toContain("Cikgu Aisyah");
    expect(text).toContain("GURU001");
    expect(text.indexOf("GURU001")).toBeGreaterThan(text.indexOf("Cikgu Aisyah"));
    expect(markup).toContain("aisyah@example.edu.my");
    expect(markup).toContain("Sekolah Kebangsaan Darul Aman");
    expect(markup).not.toContain("SKDA");
    expect(markup).not.toContain("school-logo/skda.png");
    expect(markup).not.toContain("lucide-building-2");
    expect(markup).not.toContain("0123456789");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Menunggu");
    expect(markup).not.toContain("Selesai");
    expect(markup).toContain("Belum pernah");
    expect(markup).toContain('href="/admin/guru/33333333-3333-4333-8333-333333333333"');
    expect(markup).toContain("Menunjukkan 1-10 daripada 24 guru");
    expect(markup).toContain("Halaman 1 daripada 3");
  });

  it("renders mobile cards with required teacher information and full-width action", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherMobileCards rows={[toTeacherListItem(teacherRecord)]} path="/admin/guru" />
      </MemoryRouter>,
    );

    expect(markup).toContain("md:hidden");
    expect(markup).toContain("Cikgu Aisyah");
    expect(markup).toContain("GURU001");
    expect(markup).toContain("aisyah@example.edu.my");
    expect(markup).toContain("Sekolah Kebangsaan Darul Aman");
    expect(markup).not.toContain("SKDA");
    expect(markup).not.toContain("Telefon");
    expect(markup).not.toContain("0123456789");
    expect(markup).toContain("Log Masuk Terakhir");
    expect(markup).not.toContain("Selesai");
    expect(markup).toContain("w-full");
    expect(markup).toContain('href="/admin/guru/33333333-3333-4333-8333-333333333333"');
  });

  it("uses shared badge, table, and view button styling from Pentadbir/Sekolah", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherListTable rows={[toTeacherListItem(teacherRecord)]} path="/admin/guru" />
      </MemoryRouter>,
    );

    expect(markup).toContain("rounded-2xl border border-border bg-card");
    expect(markup).toContain("bg-muted/70");
    expect(markup).toContain("hover:bg-muted/35");
    expect(markup).toContain("inline-flex h-8 min-w-[112px]");
    expect(markup).toContain("h-10 min-w-[96px]");
    expect(markup).toContain("rounded-lg");
    expect(markup).toContain("bg-primary");
    expect(markup).toContain("text-primary-foreground");
    expect(markup).toContain("hover:bg-primary/90");
    expect(markup).toContain("focus-visible:ring-primary/30");
    expect(markup).toContain("aria-label=\"Lihat Cikgu Aisyah\"");
    expect(markup).not.toContain("Status Penyediaan");
    expect(markup).not.toContain("Selesai");
  });

  it("renders fallback values without fabricating teacher or school data", () => {
    const teacher = toTeacherListItem({
      ...neverLoggedInTeacherRecord,
      teacherId: null,
      email: null,
    });
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherListTable rows={[teacher]} path="/admin/guru" />
      </MemoryRouter>,
    );

    expect(markup).toContain("Cikgu Badrul");
    expect(markup).toContain("Belum ditetapkan");
    expect(markup).toContain("—");
    expect(markup).not.toContain("lucide-building-2");
    expect(markup).not.toContain("TCH001");
  });

  it("keeps filter, reset, page-size, and request query behaviour server-side", () => {
    const markup = renderToStaticMarkup(
      <TeacherListFilters
        query={{ page: 2, limit: 20, search: "aisyah", status: "ACTIVE" }}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Cari guru mengikut nama, e-mel atau sekolah.");
    expect(markup).not.toContain("telefon atau sekolah");
    expect(markup).toContain("Reset");
    expect(teacherStatusFilterOptions.map((option) => option.label)).toEqual([
      "Semua status",
      "Aktif",
      "Menunggu",
      "Digantung",
      "Diarkibkan",
    ]);
    expect(teacherSearchPatch("aisyah")).toEqual({ search: "aisyah", page: 1 });
    expect(teacherStatusPatch("PENDING")).toEqual({ status: "PENDING", page: 1 });
    expect(teacherStatusPatch("all")).toEqual({ status: undefined, page: 1 });
    expect(teacherResetPatch()).toEqual({ search: undefined, status: undefined, schoolId: undefined, position: undefined, page: 1 });
    expect(teacherLimitPatch(20)).toEqual({ limit: 20, page: 1 });
    expect(toSearchParams({ page: 1, limit: 10, search: "SKDA", status: "ACTIVE" })).toBe("?page=1&limit=10&search=SKDA&status=ACTIVE");
  });

  it("renders shared pagination controls with real totals and disabled boundaries", () => {
    const markup = renderToStaticMarkup(
      <TeacherPagination
        meta={{ page: 1, limit: 10, total: 84, totalPages: 9 }}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain("Menunjukkan 1-10 daripada 84 guru");
    expect(markup).toContain("Baris setiap halaman");
    expect(markup).toContain("Sebelum");
    expect(markup).toContain("Halaman 1 daripada 9");
    expect(markup).toContain("Seterus");
    expect(markup).toContain("disabled");
  });

  it("renders loading, empty unfiltered, empty filtered, and error states safely", () => {
    const loading = renderToStaticMarkup(<TeacherListLoading />);
    const empty = renderTeacherList({ rows: [] });
    const filteredEmpty = renderTeacherList({ rows: [], query: { page: 1, limit: 10, search: "tiada" } });
    const error = renderTeacherList({ isError: true });

    expect(loading).toContain("aria-busy=\"true\"");
    expect(loading).toContain("Memuatkan senarai guru");
    expect(loading).toContain("grid-cols-[1.5fr_1.35fr_1.15fr_auto_1fr_auto]");
    expect(loading).not.toContain("grid-cols-7");
    expect(empty).toContain("Belum ada guru");
    expect(empty).toContain("Tambah guru pertama untuk mula mengurus akaun guru.");
    expect(empty).toContain("Tambah Guru");
    expect(filteredEmpty).toContain("Tiada guru ditemui");
    expect(filteredEmpty).toContain("Cuba ubah kata carian atau penapis status.");
    expect(filteredEmpty).toContain("Reset Penapis");
    expect(error).toContain("Maklumat guru tidak dapat dimuatkan.");
    expect(error).toContain("Cuba Lagi");
    expect(error).not.toContain("Prisma");
    expect(error).not.toContain("stack");
  });

  it("does not render setup-status display on the main Guru list", () => {
    const component = readFileSync(new URL("../src/features/admin/components/TeacherList.tsx", import.meta.url), "utf8");
    const markup = renderTeacherList();

    expect(component).not.toContain("AdminSetupStatusBadge");
    expect(component).not.toContain("setupStatusForTeacher");
    expect(markup).not.toContain("Status Penyediaan");
    expect(markup).not.toContain("Selesai");
  });

  it("removes phone only from the main Guru list presentation", () => {
    const list = readFileSync(new URL("../src/features/admin/components/TeacherList.tsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../src/features/admin/components/TeacherDetailView.tsx", import.meta.url), "utf8");
    const create = readFileSync(new URL("../src/features/admin/components/TeacherCreateForm.tsx", import.meta.url), "utf8");
    const edit = readFileSync(new URL("../src/features/admin/components/TeacherEditForm.tsx", import.meta.url), "utf8");

    expect(list).not.toContain(">Telefon<");
    expect(list).not.toContain("teacher.phone");
    expect(detail).toContain('label="Nombor Telefon"');
    expect(create).toContain('name="phone" label="Nombor Telefon"');
    expect(edit).toContain('name="phone" label="Nombor Telefon"');
  });

  it("does not ship hardcoded mock teacher rows in production Guru list code", () => {
    const component = readFileSync(new URL("../src/features/admin/components/TeacherList.tsx", import.meta.url), "utf8");
    const utility = readFileSync(new URL("../src/features/admin/utils/teacher-list.ts", import.meta.url), "utf8");

    expect(component).not.toContain("Arvind Kumar");
    expect(component).not.toContain("TCH001");
    expect(component).not.toContain("mock");
    expect(utility).not.toContain("Arvind Kumar");
    expect(utility).not.toContain("TCH001");
    expect(utility).not.toContain("mock");
  });
});
