import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  SchoolListContent,
  SchoolListError,
  SchoolListFilters,
  SchoolListLoading,
  SchoolListTable,
  SchoolMobileCards,
  SchoolPagination,
  SchoolStatusBadge,
} from "@/features/admin/components/SchoolList";
import { SchoolCreateForm } from "@/features/admin/components/SchoolCreateForm";
import {
  SchoolDetailErrorState,
  SchoolDetailSkeleton,
  SchoolDetailView,
} from "@/features/admin/components/SchoolDetailView";
import {
  SchoolEditSkeleton,
  SchoolEditView,
} from "@/features/admin/components/SchoolEditForm";
import {
  normalizeSchoolDetailRecord,
  type SchoolDetail,
} from "@/features/admin/utils/school-detail";
import {
  getSchoolInitials,
  schoolLimitPatch,
  schoolPageSizeOptions,
  schoolResetPatch,
  schoolSearchPatch,
  schoolStatusLabel,
  schoolStatusPatch,
  toSchoolListItem,
} from "@/features/admin/utils/school-list";
import {
  buildSchoolCreatePayload,
  getSchoolCreateSummary,
  isSchoolCreateSubmitEnabled,
  mapSchoolCreateSubmissionError,
  schoolCreateFormSchema,
  type SchoolCreateValues,
} from "@/features/admin/utils/school-create";
import {
  buildSchoolUpdatePayload,
  getSchoolEditDefaultValues,
  isSchoolEditSaveEnabled,
  mapSchoolEditSubmissionError,
} from "@/features/admin/utils/school-edit";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import { normalizeMediaUploadResponse } from "@/features/admin/api/media.api";
import { getAdminEntity } from "@/features/admin/config";
import { adminBadgeBaseClass } from "@/features/admin/utils/admin-status";
import { getRecordId } from "@/features/admin/utils/record";
import { ApiError } from "@/lib/api";

const schoolRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  schoolCode: "SKA-001",
  schoolName: "Sekolah Kebangsaan Aman",
  logo: null,
  principalName: null,
  address: "Jalan Aman",
  phone: "0123456789",
  contactEmail: "hello@ska.edu.my",
  accountStatus: "ACTIVE",
  createdAt: "2026-07-30T08:45:00.000Z",
  updatedAt: "2026-07-30T08:45:00.000Z",
};

const schoolDetailRecord = {
  ...schoolRecord,
  logo: "/api/media/files/school-logo/2026/08/ska.png",
  principalName: "Puan Aminah",
  counts: {
    admins: 2,
    teachers: 18,
    students: 240,
    classes: 12,
  },
};

const schoolDetail = normalizeSchoolDetailRecord(schoolDetailRecord) as SchoolDetail;

function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

function renderSchoolList(overrides: Partial<Parameters<typeof SchoolListContent>[0]> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SchoolListContent
        rows={[schoolRecord]}
        meta={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        query={{ page: 2, limit: 10 }}
        path="/admin/sekolah"
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

function renderSchoolCreateForm() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SchoolCreateForm path="/admin/sekolah" onSubmit={async () => undefined} />
    </MemoryRouter>,
  );
}

function renderSchoolEditForm(overrides: Partial<SchoolDetail> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SchoolEditView
        detail={{ ...schoolDetail, ...overrides }}
        path="/admin/sekolah"
        onSubmit={async () => undefined}
      />
    </MemoryRouter>,
  );
}

describe("Pengurusan Sekolah list", () => {
  it("uses the approved Pentadbir list page header without a local School breadcrumb", () => {
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityListPage.tsx", import.meta.url), "utf8");
    const schoolBranchStart = page.indexOf('if (entityKey === "schools")');
    const genericListStart = page.indexOf("  return (\n    <PageContainer>", schoolBranchStart + 1);
    const schoolBranch = page.slice(schoolBranchStart, genericListStart);

    expect(schoolBranch).toContain("<PageContainer>");
    expect(schoolBranch).toContain("<AdminPageHeader");
    expect(schoolBranch).toContain('title="Pengurusan Sekolah"');
    expect(schoolBranch).toContain('description="Urus maklumat dan status sekolah yang menggunakan platform Digital MoLIB."');
    expect(schoolBranch).toContain('variant="secondary"');
    expect(schoolBranch).toContain('className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"');
    expect(schoolBranch).not.toContain("ManagementPageLayout");
    expect(schoolBranch).not.toContain("breadcrumb");
    expect(schoolBranch).not.toContain('label: "Home"');
    expect(schoolBranch).not.toContain('label: "Sekolah"');
  });

  it("keeps deeper School pages and routes in place while removing only the list breadcrumb", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const formPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "sekolah/tambah"');
    expect(routes).toContain('path: "sekolah/:id"');
    expect(routes).toContain('path: "sekolah/:id/edit"');
    expect(formPage).toContain('const isSchoolCreate = !isEdit && config.key === "schools";');
    expect(formPage).toContain('{ label: "Home", to: "/admin" }');
    expect(formPage).toContain('{ label: "Sekolah", to: config.path }');
    expect(formPage).toContain('{ label: "Tambah Sekolah" }');
  });

  it("routes School edit to the real Edit Sekolah branch instead of the Pentadbir fallback", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const formPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const schoolEditStart = formPage.indexOf("if (isSchoolEdit)");
    const schoolCreateStart = formPage.indexOf("if (isSchoolCreate)");
    const schoolEditBranch = formPage.slice(schoolEditStart, schoolCreateStart);

    expect(routes).toContain('path: "admin"');
    expect(routes).toContain("<RequireAdmin>");
    expect(routes).toContain('path: "sekolah/:id/edit", element: <AdminEntityFormPage entityKey="schools" mode="edit" />');
    expect(formPage).toContain('const isSchoolEdit = isEdit && config.key === "schools";');
    expect(schoolEditBranch).toContain("normalizeSchoolDetailRecord(record)");
    expect(schoolEditBranch).toContain("<SchoolEditView");
    expect(schoolEditBranch).toContain('title="Edit Sekolah"');
    expect(schoolEditBranch).toContain('description="Kemas kini maklumat asas dan perhubungan sekolah."');
    expect(schoolEditBranch).toContain('{ label: "Butiran Sekolah", to: detailPath }');
    expect(schoolEditBranch).not.toContain("Edit Pentadbir");
    expect(schoolEditBranch).not.toContain("AdminAccountEditView");
    expect(schoolEditBranch).not.toContain("AdminAccountForm");
  });

  it("renders Edit Sekolah with School fields, existing values, and no Pentadbir fields", () => {
    const markup = renderSchoolEditForm();
    const text = visibleText(markup);
    const defaults = getSchoolEditDefaultValues(schoolDetail);
    const expectedOrder = [
      "Maklumat Sekolah",
      "Kod Sekolah",
      "Nama Sekolah",
      "Nama Pengetua",
      "E-mel Perhubungan",
      "Nombor Telefon",
      "Alamat Sekolah",
      "Logo Sekolah",
    ];

    expect(text).toContain("Kemas kini maklumat pendaftaran, perhubungan dan identiti sekolah.");
    expectedOrder.forEach((label) => expect(text).toContain(label));
    expectedOrder.reduce((previousIndex, label) => {
      const currentIndex = text.indexOf(label);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      return currentIndex;
    }, -1);
    expect(defaults).toMatchObject({
      schoolCode: "SKA-001",
      schoolName: "Sekolah Kebangsaan Aman",
      principalName: "Puan Aminah",
      contactEmail: "hello@ska.edu.my",
      phone: "0123456789",
      address: "Jalan Aman",
      logo: "/api/media/files/school-logo/2026/08/ska.png",
    });
    expect(markup).toContain('src="http://localhost:3001/api/media/files/school-logo/2026/08/ska.png"');
    expect(markup).toContain("object-contain");
    expect(text).not.toContain("Edit Pentadbir");
    expect(text).not.toContain("Nama Penuh");
    expect(text).not.toContain("Alamat e-mel ini akan digunakan untuk log masuk");
    expect(text).not.toContain("Maklumat ini digunakan untuk pengurusan dan komunikasi akaun.");
    expect(text).not.toContain("accountStatus");
    expect(text).not.toContain("createdAt");
    expect(text).not.toContain("updatedAt");
    expect(text).not.toContain("11111111-1111-4111-8111-111111111111");
  });

  it("renders nullable School edit fields as empty values instead of placeholders", () => {
    const markup = renderSchoolEditForm({
      principalName: null,
      contactEmail: null,
      logo: null,
    });
    const defaults = getSchoolEditDefaultValues({
      ...schoolDetail,
      principalName: null,
      contactEmail: null,
      logo: null,
    });

    expect(defaults.principalName).toBe("");
    expect(defaults.contactEmail).toBe("");
    expect(defaults.logo).toBe("");
    expect(markup).toContain('id="school-edit-principalName"');
    expect(markup).toContain('id="school-edit-contactEmail"');
    expect(markup).not.toContain("Tidak tersedia");
    expect(markup).not.toContain("<img");
  });

  it("builds School edit PATCH payloads using only changed supported fields", () => {
    const defaults = getSchoolEditDefaultValues(schoolDetail);

    expect(
      buildSchoolUpdatePayload(
        {
          ...defaults,
          schoolCode: " ska-999 ",
          contactEmail: " NEW@SCHOOL.EDU.MY ",
          principalName: "",
          phone: "+60 13-555 7777",
          logo: "",
        },
        {
          schoolCode: true,
          contactEmail: true,
          principalName: true,
          phone: true,
          logo: true,
        },
        defaults,
      ),
    ).toEqual({
      schoolCode: "SKA-999",
      contactEmail: "new@school.edu.my",
      principalName: null,
      phone: "0135557777",
      logo: null,
    });

    expect(buildSchoolUpdatePayload(defaults, {}, defaults)).toEqual({});
    expect(Object.keys(buildSchoolUpdatePayload({ ...defaults, schoolName: "Sekolah Baharu" }, { schoolName: true }, defaults))).toEqual(["schoolName"]);
  });

  it("maps School edit errors and save enablement without changing create validation", () => {
    expect(isSchoolEditSaveEnabled({ isDirty: false, isValid: true, isSubmitting: false })).toBe(false);
    expect(isSchoolEditSaveEnabled({ isDirty: true, isValid: true, isSubmitting: false })).toBe(true);
    expect(isSchoolEditSaveEnabled({ isDirty: true, isValid: false, isSubmitting: false })).toBe(false);
    expect(isSchoolEditSaveEnabled({ isDirty: true, isValid: true, isSubmitting: true })).toBe(false);
    expect(mapSchoolEditSubmissionError(new ApiError("Conflict", 409, "SCHOOL_CODE_EXISTS"))).toEqual({
      field: "schoolCode",
      message: "Kod sekolah ini telah digunakan.",
    });
    expect(mapSchoolEditSubmissionError(new ApiError("Conflict", 409, "SCHOOL_NAME_EXISTS"))).toEqual({
      field: "schoolName",
      message: "Nama sekolah ini telah digunakan.",
    });
    expect(mapSchoolEditSubmissionError(new ApiError("Conflict", 409, "SCHOOL_EMAIL_EXISTS"))).toEqual({
      field: "contactEmail",
      message: "E-mel perhubungan ini telah digunakan oleh sekolah lain.",
    });
    expect(mapSchoolEditSubmissionError(new ApiError("Missing", 404, "SCHOOL_NOT_FOUND")).message).toBe("Sekolah tidak ditemui.");
    expect(mapSchoolEditSubmissionError(new ApiError("Conflict", 409, "SCHOOL_CONFLICT")).message).toBe("Maklumat sekolah bercanggah dengan rekod sedia ada.");
  });

  it("keeps Edit Sekolah confirmation, discard, logo, loading, and API behaviours scoped to Schools", () => {
    const editComponent = readFileSync(new URL("../src/features/admin/components/SchoolEditForm.tsx", import.meta.url), "utf8");
    const createComponent = readFileSync(new URL("../src/features/admin/components/SchoolCreateForm.tsx", import.meta.url), "utf8");
    const sharedFields = readFileSync(new URL("../src/features/admin/components/SchoolFormFields.tsx", import.meta.url), "utf8");
    const logoUtils = readFileSync(new URL("../src/features/admin/utils/school-logo-upload.ts", import.meta.url), "utf8");
    const formPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const skeleton = renderToStaticMarkup(<SchoolEditSkeleton />);

    expect(editComponent).toContain("Simpan perubahan sekolah?");
    expect(editComponent).toContain("Pastikan maklumat sekolah yang dikemas kini adalah betul.");
    expect(editComponent).toContain("Sahkan dan Simpan");
    expect(editComponent).toContain("Menyimpan...");
    expect(editComponent).toContain("Buang perubahan?");
    expect(editComponent).toContain("Perubahan maklumat sekolah yang belum disimpan akan hilang.");
    expect(editComponent).toContain("Terus Mengedit");
    expect(editComponent).toContain("Buang Perubahan");
    expect(editComponent).toContain("form.reset(defaults)");
    expect(editComponent).toContain("onDirtyStateChange?.(false)");
    expect(editComponent).toContain("buildSchoolUpdatePayload(values, form.formState.dirtyFields, defaults)");
    expect(editComponent).toContain('form.setValue("logo", uploaded.url');
    expect(editComponent).toContain('form.setValue("logo", ""');
    expect(editComponent).toContain('purpose: "SCHOOL_LOGO"');
    expect(logoUtils).toContain("normalizeMediaPreviewUrl");
    expect(sharedFields).toContain("onError={onPreviewError}");
    expect(createComponent).toContain("SchoolFormFields");
    expect(editComponent).toContain("SchoolFormFields");
    expect(formPage).toContain("updateMutation.mutateAsync(payload)");
    expect(formPage).toContain('toast.success("Maklumat sekolah berjaya dikemas kini.")');
    expect(formPage).toContain("navigate(`${config.path}/${normalizedUpdated?.id ?? schoolDetail?.id ?? id}`");
    expect(formPage).toContain("Tidak dapat memuatkan maklumat sekolah. Sila cuba lagi.");
    expect(formPage).toContain("Kembali ke Butiran Sekolah");
    expect(formPage).toContain("Sekolah tidak ditemui.");
    expect(formPage).toContain("Kembali ke Senarai Sekolah");
    expect(api).toContain("if (config.key === \"schools\" && isRecord(payload) && isRecord(payload.school))");
    expect(api).toContain("return payload.school as AdminRecord");
    expect(api).toContain("method: \"PATCH\"");
    expect(api).toContain("body: JSON.stringify(values)");
    expect(skeleton).toContain('data-slot="skeleton"');
    expect(skeleton).toContain("h-40 rounded-xl");
  });

  it("allows only platform admin roles through the School entity config", () => {
    const schools = getAdminEntity("schools");

    expect(schools.roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(schools.roles.includes("SUPER_ADMIN")).toBe(true);
    expect(schools.roles.includes("ADMIN")).toBe(true);
    expect(schools.roles.includes("TEACHER")).toBe(false);
    expect(schools.roles.includes("STUDENT")).toBe(false);
    expect(schools.roles.includes("PARENT")).toBe(false);
  });

  it("maps and renders only real School list DTO fields", () => {
    const school = toSchoolListItem(schoolRecord);
    const schoolWithLogo = toSchoolListItem({
      ...schoolRecord,
      logo: "/api/media/files/school-logo/2026/08/11111111-1111-4111-8111-111111111111.png",
    });
    const markup = renderSchoolList();
    const text = visibleText(markup);

    expect(school.schoolName).toBe("Sekolah Kebangsaan Aman");
    expect(school.schoolCode).toBe("SKA-001");
    expect(schoolWithLogo.logo).toBe("http://localhost:3001/api/media/files/school-logo/2026/08/11111111-1111-4111-8111-111111111111.png");
    expect(text).toContain("Sekolah Kebangsaan Aman");
    expect(text).toContain("SKA-001");
    expect(text).toContain("Belum ditetapkan");
    expect(text).toContain("hello@ska.edu.my");
    expect(text).toContain("0123456789");
    expect(text).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(text).not.toContain("2026-07-30T08:45:00.000Z");
  });

  it("omits contact email when the backend returns null", () => {
    const markup = renderSchoolList({
      rows: [{ ...schoolRecord, contactEmail: null }],
    });

    expect(visibleText(markup)).not.toContain("hello@ska.edu.my");
  });

  it("maps School statuses with approved semantic classes", () => {
    expect(schoolStatusLabel("ACTIVE")).toBe("Aktif");
    expect(schoolStatusLabel("SUSPENDED")).toBe("Digantung");
    expect(schoolStatusLabel("ARCHIVED")).toBe("Diarkibkan");

    const active = renderToStaticMarkup(<SchoolStatusBadge status="ACTIVE" />);
    const suspended = renderToStaticMarkup(<SchoolStatusBadge status="SUSPENDED" />);
    const archived = renderToStaticMarkup(<SchoolStatusBadge status="ARCHIVED" />);

    expect(active).toContain(adminBadgeBaseClass);
    expect(active).toContain("bg-emerald-100");
    expect(active).toContain("dark:bg-emerald-400/10");
    expect(suspended).toContain("bg-orange-100");
    expect(suspended).toContain("dark:text-orange-300");
    expect(archived).toContain("bg-slate-200");
  });

  it("calculates dynamic school initials", () => {
    expect(getSchoolInitials("Sekolah Kebangsaan Aman")).toBe("SKA");
    expect(getSchoolInitials("SJK(T) Changlun")).toBe("SC");
    expect(getSchoolInitials("SMK Darul Aman")).toBe("SDA");
  });

  it("uses server query patches for search, status, reset, and rows per page", () => {
    expect(schoolSearchPatch("aman")).toEqual({ search: "aman", page: 1 });
    expect(schoolStatusPatch("ACTIVE")).toEqual({ status: "ACTIVE", page: 1 });
    expect(schoolStatusPatch("all")).toEqual({ status: undefined, page: 1 });
    expect(schoolResetPatch()).toEqual({ search: undefined, status: undefined, page: 1 });
    expect(schoolLimitPatch(20)).toEqual({ limit: 20, page: 1 });
  });

  it("uses backend pagination metadata and approved page sizes", () => {
    const markup = renderToStaticMarkup(
      <SchoolPagination
        meta={{ page: 2, limit: 10, total: 25, totalPages: 3 }}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(visibleText(markup)).toContain("Menunjukkan 11-20 daripada 25 sekolah");
    expect(visibleText(markup)).toContain("Halaman 2 daripada 3");
    expect(markup).toContain("mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between");
    expect(markup).toContain("!bg-background/40 sm:w-24");
    expect(markup).not.toContain("h-10 !bg-background/40");
    expect(schoolPageSizeOptions).toEqual([10, 20, 50]);
  });

  it("matches the approved Pentadbir filter control sizing and rhythm", () => {
    const markup = renderToStaticMarkup(
      <SchoolListFilters
        query={{ page: 1, limit: 10 }}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("mt-6 flex flex-col gap-3 sm:flex-row sm:items-center");
    expect(markup).toContain("!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20");
    expect(markup).toContain("w-full text-sm sm:w-auto");
    expect(markup).toContain("!bg-background/40");
    expect(markup).toContain("w-full sm:w-auto");
    expect(markup).toContain("Cari sekolah mengikut nama, kod, pengetua, e-mel atau telefon.");
    expect(visibleText(markup)).toContain("Reset");
    expect(markup).not.toContain("h-11");
    expect(markup).not.toContain("md:flex-row");
  });

  it("matches the approved Pentadbir table shell, row rhythm, and Lihat button style", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolListTable rows={[toSchoolListItem(schoolRecord)]} path="/admin/sekolah" />
      </MemoryRouter>,
    );

    expect(markup).toContain("mt-5 hidden overflow-hidden rounded-2xl border border-border bg-card md:block");
    expect(markup).toContain("w-full border-collapse text-sm");
    expect(markup).toContain("bg-muted/70 text-muted-foreground");
    expect(markup).toContain("border-t border-border hover:bg-muted/35");
    expect(markup).toContain("px-4 py-3 text-right");
    expect(markup).toContain("h-10 min-w-[96px] gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-primary/30");
    expect(markup).toContain("href=\"/admin/sekolah/11111111-1111-4111-8111-111111111111\"");
    expect(visibleText(markup)).toContain("Lihat");
    expect(markup).not.toContain("bg-primary/10");
    expect(markup).not.toContain("border-primary/35");
    expect(markup).not.toContain("dark:text-blue-300");
  });

  it("renders loading, empty, no-result, and API error states", () => {
    expect(renderToStaticMarkup(<SchoolListLoading />)).toContain("Memuatkan senarai sekolah");
    expect(visibleText(renderSchoolList({ rows: [], query: {} }))).toContain("Belum ada sekolah.");
    expect(renderSchoolList({ rows: [], query: { search: "x" } })).toContain("Reset carian");

    const forbidden = renderToStaticMarkup(<SchoolListError error={new ApiError("forbidden", 403)} onRetry={() => undefined} />);
    const offline = renderToStaticMarkup(<SchoolListError error={new ApiError("offline", 0, "NETWORK_ERROR")} onRetry={() => undefined} />);

    expect(visibleText(forbidden)).toContain("Anda tidak mempunyai kebenaran untuk melihat halaman ini.");
    expect(visibleText(offline)).toContain("Perkhidmatan tidak dapat dihubungi buat sementara waktu.");
    expect(visibleText(forbidden)).toContain("Cuba Semula");
  });

  it("renders mobile cards and expected navigation routes", () => {
    const cards = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolMobileCards rows={[toSchoolListItem(schoolRecord)]} path="/admin/sekolah" />
      </MemoryRouter>,
    );
    const empty = renderSchoolList({ rows: [], query: {} });

    expect(cards).toContain("rounded-lg border border-border bg-card p-4");
    expect(cards).toContain("mt-5 grid gap-3 md:hidden");
    expect(cards).toContain("href=\"/admin/sekolah/11111111-1111-4111-8111-111111111111\"");
    expect(cards).toContain("Lihat");
    expect(empty).toContain("href=\"/admin/sekolah/tambah\"");
    expect(empty).toContain("Tambah Sekolah");
  });

  it("allows SUPER_ADMIN and ADMIN to access Tambah Sekolah while denying other roles", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const guards = readFileSync(new URL("../src/routes/guards.tsx", import.meta.url), "utf8");
    const schools = getAdminEntity("schools");

    expect(routes).toContain('path: "sekolah/tambah"');
    expect(routes).toContain('<AdminEntityFormPage entityKey="schools" mode="create" />');
    expect(routes).toContain("<RequireAdmin>");
    expect(guards).toContain('roles={["SUPER_ADMIN", "ADMIN"]}');
    expect(schools.roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(schools.roles).not.toContain("TEACHER");
    expect(schools.roles).not.toContain("STUDENT");
    expect(schools.roles).not.toContain("PARENT");
  });

  it("allows SUPER_ADMIN and ADMIN to access Butiran Sekolah while denying non-admin roles", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const guards = readFileSync(new URL("../src/routes/guards.tsx", import.meta.url), "utf8");

    expect(routes).toContain("<RequireAdmin>");
    expect(routes).toContain('path: "sekolah/:id"');
    expect(routes).toContain('<AdminEntityDetailPage entityKey="schools" />');
    expect(guards).toContain('roles={["SUPER_ADMIN", "ADMIN"]}');
    expect(guards).not.toContain('roles={["SUPER_ADMIN", "ADMIN", "TEACHER"]}');
    expect(guards).not.toContain('roles={["SUPER_ADMIN", "ADMIN", "STUDENT"]}');
    expect(guards).not.toContain('roles={["SUPER_ADMIN", "ADMIN", "PARENT"]}');
  });

  it("renders real School detail DTO values without raw internals", () => {
    const component = readFileSync(new URL("../src/features/admin/components/SchoolDetailView.tsx", import.meta.url), "utf8");
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView
          detail={schoolDetail}
          currentRole="SUPER_ADMIN"
          statusPending={false}
          onStatusChange={async () => true}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );
    const text = visibleText(markup);

    expect(text).toContain("Sekolah Kebangsaan Aman");
    expect(text).toContain("SKA-001");
    expect(markup).toContain('src="http://localhost:3001/api/media/files/school-logo/2026/08/ska.png"');
    expect(markup).toContain("object-contain");
    expect(component).toContain("onError={() => setLogoOk(false)}");
    expect(text).toContain("Puan Aminah");
    expect(text).toContain("hello@ska.edu.my");
    expect(text).toContain("0123456789");
    expect(text).toContain("Jalan Aman");
    expect(text).toContain("30 Julai 2026");
    expect(text).toContain("Guru18");
    expect(text).toContain("Murid240");
    expect(text).toContain("Kelas12");
    expect(text).not.toContain("Pentadbir");
    expect(text).not.toContain("Ibu Bapa");
    expect(text).not.toContain("Parent");
    expect(text).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(text).not.toContain("2026-07-30T08:45:00.000Z");
    expect(text).not.toContain("Invalid Date");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
    expect((text.match(/Terakhir dikemas kini/g) ?? []).length).toBe(1);
  });

  it("renders Statistik Sekolah as compact horizontal rows without obsolete Pentadbir stats", () => {
    const component = readFileSync(new URL("../src/features/admin/components/SchoolDetailView.tsx", import.meta.url), "utf8");
    const statisticCard = component.slice(component.indexOf("function SchoolStatisticRow"), component.indexOf("function getSchoolStatusAction"));
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView
          detail={schoolDetail}
          currentRole="SUPER_ADMIN"
          statusPending={false}
          onStatusChange={async () => true}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );
    const text = visibleText(markup);

    expect(text).toContain("Guru18");
    expect(text).toContain("Murid240");
    expect(text).toContain("Kelas12");
    expect(text).not.toContain("Pentadbir");
    expect(statisticCard).toContain("flex min-h-[72px] items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3");
    expect(statisticCard).not.toContain("min-h-20");
    expect(statisticCard).not.toContain("min-h-24");
    expect(statisticCard).not.toContain("py-4");
    expect(statisticCard).not.toContain("py-5");
    expect(statisticCard).not.toContain("py-6");
    expect(statisticCard).toContain("space-y-3");
    expect(statisticCard).not.toContain("space-y-4");
    expect(statisticCard).not.toContain("space-y-5");
    expect(statisticCard).not.toContain("space-y-6");
    expect(statisticCard).toContain("size-10");
    expect(statisticCard).toContain("size-5");
    expect(statisticCard).toContain("text-2xl font-semibold tracking-tight text-foreground");
    expect(statisticCard).not.toContain("text-3xl");
    expect(statisticCard).toContain("justify-between");
    expect(markup).toContain("lucide-graduation-cap");
    expect(markup).toContain("lucide-users-round");
    expect(markup).toContain("lucide-book-open");
  });

  it("renders School detail fallbacks and broken-logo fallback support", () => {
    const fallbackDetail = normalizeSchoolDetailRecord({
      ...schoolDetailRecord,
      logo: null,
      principalName: null,
      contactEmail: null,
    }) as SchoolDetail;
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView
          detail={fallbackDetail}
          currentRole="ADMIN"
          statusPending={false}
          onStatusChange={async () => true}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("SKA");
    expect(visibleText(markup)).toContain("Belum ditetapkan");
    expect(markup).not.toContain("<img");
  });

  it("shows the correct School status action by account state and role", () => {
    const active = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView detail={{ ...schoolDetail, accountStatus: "ACTIVE" }} currentRole="ADMIN" statusPending={false} onStatusChange={async () => true} onArchive={async () => true} />
      </MemoryRouter>,
    );
    const suspended = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView detail={{ ...schoolDetail, accountStatus: "SUSPENDED" }} currentRole="ADMIN" statusPending={false} onStatusChange={async () => true} onArchive={async () => true} />
      </MemoryRouter>,
    );
    const archivedSuperAdmin = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView detail={{ ...schoolDetail, accountStatus: "ARCHIVED" }} currentRole="SUPER_ADMIN" statusPending={false} onStatusChange={async () => true} onArchive={async () => true} />
      </MemoryRouter>,
    );
    const archivedAdmin = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView detail={{ ...schoolDetail, accountStatus: "ARCHIVED" }} currentRole="ADMIN" statusPending={false} onStatusChange={async () => true} onArchive={async () => true} />
      </MemoryRouter>,
    );

    expect(active).toContain("Gantung Sekolah");
    expect(active).toContain(warningActionColorClass);
    expect(active).toContain("h-12 w-full min-w-[220px] gap-2 rounded-xl px-6 font-semibold sm:w-auto");
    expect(active).not.toContain("border-amber-300 bg-amber-50");
    expect(active).toContain("Menggantung sekolah akan menghentikan akses sementara tanpa memadam data.");
    expect(suspended).toContain("Aktifkan Sekolah");
    expect(suspended).toContain("Sekolah ini sedang digantung. Aktifkan semula untuk memulihkan akses pengguna.");
    expect(archivedSuperAdmin).toContain("Pulihkan Sekolah");
    expect(archivedSuperAdmin).toContain("Sekolah ini telah diarkibkan.");
    expect(archivedAdmin).toContain("Hanya Super Admin boleh memulihkan sekolah yang telah diarkibkan.");
    expect(archivedAdmin).not.toContain("Pulihkan Sekolah");
  });

  it("uses confirmation dialogs for School status and archive flows", () => {
    const component = readFileSync(new URL("../src/features/admin/components/SchoolDetailView.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");

    expect(component).toContain("Gantung sekolah?");
    expect(component).toContain("Aktifkan sekolah?");
    expect(component).toContain("Pulihkan sekolah?");
    expect(component).toContain("Arkibkan sekolah?");
    expect(component).toContain("tetapi semua data akan dikekalkan.");
    expect(component).toContain("akses pengguna berkaitan akan dihentikan");
    expect(component).toContain("Data sekolah, guru, kelas dan murid tidak akan dipadam.");
    expect(page).toContain("onArchive={() => handleSchoolStatusChange(\"ARCHIVED\")}");
    expect(page).toContain("await statusMutation.mutateAsync({ id: schoolDetail?.id ?? id, status })");
    expect(page).toContain("await record.refetch()");
    expect(page).toContain('toast.success("Status sekolah dikemas kini.")');
    expect(api).toContain("`${config.endpoint}/${id}/status`");
    expect(api).toContain('method: "PATCH"');
    expect(api).toContain("body: JSON.stringify({ status })");
  });

  it("renders School detail loading, error, and not-found states", () => {
    const loading = renderToStaticMarkup(<SchoolDetailSkeleton />);
    const error = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailErrorState
          title="Tidak dapat memuatkan maklumat sekolah. Sila cuba lagi."
          onRetry={() => undefined}
          path="/admin/sekolah"
        />
      </MemoryRouter>,
    );
    const notFound = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailErrorState
          title="Sekolah tidak ditemui"
          description="Rekod sekolah yang diminta tidak wujud atau telah dipadamkan."
          path="/admin/sekolah"
        />
      </MemoryRouter>,
    );

    expect(loading).toContain('data-slot="skeleton"');
    expect(loading).toContain("grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]");
    expect(error).toContain("Tidak dapat memuatkan maklumat sekolah. Sila cuba lagi.");
    expect(error).toContain("Cuba Semula");
    expect(error).toContain('href="/admin/sekolah"');
    expect(notFound).toContain("Sekolah tidak ditemui");
    expect(notFound).toContain("Rekod sekolah yang diminta tidak wujud atau telah dipadamkan.");
    expect(notFound).toContain("Kembali ke Senarai Sekolah");
  });

  it("keeps School detail page header, breadcrumb, actions, and semantic responsive classes aligned", () => {
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const component = readFileSync(new URL("../src/features/admin/components/SchoolDetailView.tsx", import.meta.url), "utf8");
    const adminComponent = readFileSync(new URL("../src/features/admin/components/AdminAccountDetailView.tsx", import.meta.url), "utf8");
    const informationCard = component.slice(component.indexOf("function SchoolInformationCard"), component.indexOf("function displayCount"));
    const statisticCard = component.slice(component.indexOf("function SchoolStatisticRow"), component.indexOf("function getSchoolStatusAction"));

    expect(page).toContain("<ManagementPageLayout");
    expect(page).toContain('{ label: "Home", to: "/admin" }');
    expect(page).toContain('{ label: "Sekolah", to: config.path }');
    expect(page).toContain('{ label: "Butiran Sekolah" }');
    expect(page).toContain('title="Butiran Sekolah"');
    expect(page).toContain('description="Lihat dan urus maklumat sekolah dalam platform Digital MoLIB."');
    expect(page).toContain("Edit Sekolah");
    expect(page).toContain("Pencil");
    expect(component).toContain("rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6");
    expect(component).toContain("grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]");
    expect(informationCard).toContain("grid gap-x-8 gap-y-6 sm:grid-cols-2");
    expect(component).toContain("h-full");
    expect(informationCard).toContain("sm:col-span-2");
    expect(informationCard).not.toContain("divide-y");
    expect(informationCard).not.toContain("divide-x");
    expect(informationCard).not.toContain("sm:border-b");
    expect(informationCard).not.toContain("sm:border-t");
    expect(informationCard).not.toContain("gap-y-10");
    expect(informationCard).not.toContain("gap-y-12");
    expect(informationCard).not.toContain("justify-between");
    expect(informationCard).not.toContain("min-h");
    expect(informationCard).not.toContain("flex-1");
    expect(informationCard).not.toContain("py-4");
    expect(statisticCard).toContain("flex min-h-[72px] items-center justify-between rounded-xl border border-border bg-muted/20 px-5 py-3");
    expect(statisticCard).toContain("space-y-3");
    expect(component).toContain("rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-sm sm:p-6");
    expect(component).toContain("rounded-2xl border border-destructive/35 bg-destructive/5 p-5 shadow-sm sm:p-6");
    expect(component).toContain("sm:flex-row sm:items-center sm:justify-between");
    expect(component).toContain("h-12 w-full min-w-[220px]");
    expect(component).toContain("bg-card");
    expect(component).toContain("text-foreground");
    expect(component).toContain("text-muted-foreground");
    expect(component).toContain("border-border");
    expect(component).toContain("dark:");
    expect(component).toContain("warningActionColorClass");
    expect(adminComponent).toContain("warningActionColorClass");
  });

  it("keeps Maklumat Sekolah fields ordered and open without internal divider lines", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolDetailView
          detail={schoolDetail}
          currentRole="ADMIN"
          statusPending={false}
          onStatusChange={async () => true}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );
    const text = visibleText(markup);
    const expectedOrder = [
      "Maklumat Sekolah",
      "Nama Pengetua",
      "E-mel Perhubungan",
      "Nombor Telefon",
      "Tarikh Dicipta",
      "Alamat Sekolah",
    ];

    expect(markup).toContain("grid gap-x-8 gap-y-6 sm:grid-cols-2");
    expect(markup).toContain("sm:col-span-2");
    expect(markup).not.toContain("divide-y");
    expect(markup).not.toContain("divide-x");
    expect(markup).not.toContain("sm:border-b");
    expect(markup).not.toContain("sm:border-t");
    expectedOrder.reduce((previousIndex, label) => {
      const currentIndex = text.indexOf(label);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      return currentIndex;
    }, -1);
  });

  it("renders Tambah Sekolah with the approved single-column management form pattern", () => {
    const markup = renderSchoolCreateForm();
    const text = visibleText(markup);

    expect(text).toContain("Maklumat Sekolah");
    expect(text).toContain("Maklumat ini digunakan untuk pendaftaran, pengurusan dan komunikasi sekolah.");
    expect(text).toContain("Sekolah akan diaktifkan selepas dicipta");
    expect(text).toContain("Rekod sekolah baharu akan diwujudkan dengan status aktif");
    expect(text).toContain("Batal");
    expect(text).toContain("Cipta Sekolah");
    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("mx-auto w-full max-w-5xl space-y-6");
    expect(markup).not.toContain("md:grid-cols-2");
    expect(markup).not.toContain("grid w-full max-w-5xl");
    expect(markup).toContain("border-t border-border bg-muted/30 p-5 sm:p-6");
    expect(markup).toContain("bg-secondary text-secondary-foreground");
    expect(markup).toContain("dark:");
    expect(markup).not.toContain("district");
    expect(markup).not.toContain("postcode");
  });

  it("renders each supported School create field once without unsupported backend fields", () => {
    const markup = renderSchoolCreateForm();
    const text = visibleText(markup);
    const expectedOrder = [
      "Kod Sekolah",
      "Nama Sekolah",
      "Nama Pengetua",
      "E-mel Perhubungan",
      "Nombor Telefon",
      "Alamat Sekolah",
      "Logo Sekolah",
    ];

    expect((text.match(/Maklumat Sekolah/g) ?? []).length).toBe(1);
    expectedOrder.forEach((label) => expect(text).toContain(label));
    expectedOrder.reduce((previousIndex, label) => {
      const currentIndex = text.indexOf(label);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      return currentIndex;
    }, -1);
    expect(text).not.toContain("Negeri");
    expect(text).not.toContain("Daerah");
    expect(text).not.toContain("Poskod");
    expect(text).not.toContain("Kategori");
    expect(text).not.toContain("GPS");
    expect(text).not.toContain("accountStatus");
    expect(text).not.toContain("createdAt");
    expect(text).not.toContain("updatedAt");
  });

  it("uses image upload for School logo instead of a manually typed URL field", () => {
    const markup = renderSchoolCreateForm();
    const component = readFileSync(new URL("../src/features/admin/components/SchoolCreateForm.tsx", import.meta.url), "utf8");
    const sharedFields = readFileSync(new URL("../src/features/admin/components/SchoolFormFields.tsx", import.meta.url), "utf8");
    const mediaApi = readFileSync(new URL("../src/features/admin/api/media.api.ts", import.meta.url), "utf8");
    const text = visibleText(markup);

    expect(markup).toContain('type="file"');
    expect(markup).toContain('accept="image/png,image/jpeg,.png,.jpg,.jpeg"');
    expect(text).toContain("Seret dan lepaskan logo di sini");
    expect(text).toContain("Pilih Fail");
    expect(text).toContain("PNG, JPG atau JPEG sahaja. Maksimum 5.0 MB.");
    expect(text).toContain("Muat naik satu imej logo sekolah. URL Cloudinary akan disimpan secara automatik.");
    expect(text).not.toContain("Masukkan URL logo sekolah");
    expect(component).toContain("SchoolFormFields");
    expect(sharedFields).toContain("onDragOver={handleDragOver}");
    expect(sharedFields).toContain("onDrop={handleDrop}");
    expect(sharedFields).toContain("Ganti Imej");
    expect(sharedFields).toContain("Buang");
    expect(component).toContain('form.setValue("logo", uploaded.url');
    expect(component).toContain("setLogoPreviewUrl(uploaded.url)");
    expect(sharedFields).toContain("onError={onPreviewError}");
    expect(sharedFields).toContain("Logo tidak dapat dipaparkan. Sila muat naik imej lain.");
    expect(component).toContain('purpose: "SCHOOL_LOGO"');
    expect(mediaApi).toContain('"/media/upload"');
    expect(mediaApi).toContain('formData.append("file", file)');
    expect(mediaApi).toContain('formData.append("purpose", purpose)');
  });

  it("normalizes media upload responses to a preview-safe absolute URL", () => {
    expect(
      normalizeMediaUploadResponse(
        {
          success: true,
          data: {
            file: {
              key: "school-logo/2026/08/logo.png",
              url: "/api/media/files/school-logo/2026/08/logo.png",
              originalName: "logo.png",
              mimeType: "image/png",
              size: 1024,
            },
          },
        },
        "SCHOOL_LOGO",
      ),
    ).toMatchObject({
      url: "http://localhost:3001/api/media/files/school-logo/2026/08/logo.png",
      key: "school-logo/2026/08/logo.png",
      originalName: "logo.png",
      mimeType: "image/png",
      size: 1024,
      purpose: "SCHOOL_LOGO",
    });

    expect(
      normalizeMediaUploadResponse(
        {
          data: {
            secure_url: "https://res.cloudinary.com/demo/image/upload/logo.png",
            url: "https://fallback.example/logo.png",
            public_id: "schools/logo",
          },
        },
        "SCHOOL_LOGO",
      ),
    ).toMatchObject({
      url: "https://res.cloudinary.com/demo/image/upload/logo.png",
      publicId: "schools/logo",
    });

    expect(
      normalizeMediaUploadResponse(
        {
          data: {
            file: {
              secureUrl: "https://res.cloudinary.com/demo/image/upload/logo-v2.png",
            },
          },
        },
        "SCHOOL_LOGO",
      ).url,
    ).toBe("https://res.cloudinary.com/demo/image/upload/logo-v2.png");

    expect(() => normalizeMediaUploadResponse({ data: { file: { key: "school-logo/logo.png" } } }, "SCHOOL_LOGO")).toThrow(
      "MEDIA_UPLOAD_URL_MISSING",
    );
  });

  it("normalizes School create payload to the real backend DTO only", () => {
    const payload = buildSchoolCreatePayload({
      schoolCode: " sk-aman_1 ",
      schoolName: " Sekolah Kebangsaan Aman ",
      principalName: " Puan Aminah ",
      contactEmail: " ADMIN@SKA.EDU.MY ",
      phone: " 012-345 6789 ",
      address: " Jalan Aman 1 ",
      logo: " /logos/ska.svg ",
    });
    const emptyOptionalPayload = buildSchoolCreatePayload({
      schoolCode: "ska",
      schoolName: "Sekolah Kebangsaan Aman",
      principalName: " ",
      contactEmail: "",
      phone: "0123456789",
      address: "Jalan Aman",
      logo: "",
    });

    expect(payload).toEqual({
      schoolCode: "SK-AMAN_1",
      schoolName: "Sekolah Kebangsaan Aman",
      principalName: "Puan Aminah",
      contactEmail: "admin@ska.edu.my",
      phone: "012-345 6789",
      address: "Jalan Aman 1",
      logo: "/logos/ska.svg",
    });
    expect(Object.keys(payload).sort()).toEqual([
      "address",
      "contactEmail",
      "logo",
      "phone",
      "principalName",
      "schoolCode",
      "schoolName",
    ]);
    expect(emptyOptionalPayload).toEqual({
      schoolCode: "SKA",
      schoolName: "Sekolah Kebangsaan Aman",
      phone: "0123456789",
      address: "Jalan Aman",
    });
  });

  it("validates School create values and reports inline-friendly errors", () => {
    const invalid = schoolCreateFormSchema.safeParse({
      schoolCode: "SK Aman!",
      schoolName: "SK",
      principalName: "",
      contactEmail: "not-email",
      phone: "123",
      address: "Jln",
      logo: "ftp://logo",
    } satisfies SchoolCreateValues);
    const valid = schoolCreateFormSchema.safeParse({
      schoolCode: "SK_AMAN-1",
      schoolName: "Sekolah Kebangsaan Aman",
      principalName: "",
      contactEmail: "hello@ska.edu.my",
      phone: "0123456789",
      address: "Jalan Aman 1",
      logo: "/logos/ska.svg",
    } satisfies SchoolCreateValues);

    expect(invalid.success).toBe(false);
    expect(JSON.stringify(invalid.error?.format())).toContain("Kod sekolah hanya boleh mengandungi huruf");
    expect(JSON.stringify(invalid.error?.format())).toContain("Sila masukkan nombor telefon Malaysia yang sah.");
    expect(valid.success).toBe(true);
    expect(isSchoolCreateSubmitEnabled({ isValid: false, isSubmitting: false })).toBe(false);
    expect(isSchoolCreateSubmitEnabled({ isValid: true, isSubmitting: true })).toBe(false);
    expect(isSchoolCreateSubmitEnabled({ isValid: true, isSubmitting: false })).toBe(true);
  });

  it("maps School duplicate and conflict backend errors safely", () => {
    expect(mapSchoolCreateSubmissionError(new ApiError("exists", 409, "SCHOOL_CODE_EXISTS"))).toEqual({
      field: "schoolCode",
      message: "Kod sekolah ini telah digunakan.",
    });
    expect(mapSchoolCreateSubmissionError(new ApiError("exists", 409, "SCHOOL_NAME_EXISTS"))).toEqual({
      field: "schoolName",
      message: "Nama sekolah ini telah digunakan.",
    });
    expect(mapSchoolCreateSubmissionError(new ApiError("exists", 409, "SCHOOL_EMAIL_EXISTS"))).toEqual({
      field: "contactEmail",
      message: "E-mel perhubungan ini telah digunakan oleh sekolah lain.",
    });
    expect(mapSchoolCreateSubmissionError(new ApiError("conflict", 409, "SCHOOL_CONFLICT"))).toEqual({
      message: "Maklumat sekolah bercanggah dengan rekod sedia ada.",
    });
    expect(mapSchoolCreateSubmissionError(new Error("raw"))).toEqual({
      message: "Sekolah tidak dapat dicipta. Sila cuba sekali lagi.",
    });
  });

  it("uses confirmation-first creation and preserves existing create API integration", () => {
    const component = readFileSync(new URL("../src/features/admin/components/SchoolCreateForm.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const hooks = readFileSync(new URL("../src/features/admin/hooks/use-admin-records.ts", import.meta.url), "utf8");

    expect(component).toContain("setConfirmOpen(true)");
    expect(component).toContain("await onSubmit(pendingPayload)");
    expect(component).toContain("Sahkan dan Cipta");
    expect(component).toContain("Mencipta...");
    expect(component).toContain("disabled={pending}");
    expect(component).toContain("form.setError(mapped.field");
    expect(component).toContain("Buang maklumat yang dimasukkan?");
    expect(component).toContain("Maklumat sekolah yang belum disimpan akan hilang.");
    expect(page).toContain("createMutation.mutateAsync(payload)");
    expect(page).toContain('toast.success("Sekolah berjaya dicipta.")');
    expect(page).toContain("navigate(`${config.path}/${createdId}`, { replace: true })");
    expect(api).toContain("apiRequest<AdminRecord>(config.endpoint");
    expect(api).toContain('method: "POST"');
    expect(hooks).toContain('invalidateQueries({ queryKey: ["admin", config.key] })');
  });

  it("uses the unwrapped School ID for status PATCH requests and maps School status errors", () => {
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const hooks = readFileSync(new URL("../src/features/admin/hooks/use-admin-records.ts", import.meta.url), "utf8");
    const detailPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const school = { school: schoolRecord };

    expect(api).toContain('config.key === "schools"');
    expect(api).toContain("payload.school");
    expect(api).toContain("`${config.endpoint}/${id}/status`");
    expect(api).toContain('method: "PATCH"');
    expect(api).toContain("body: JSON.stringify({ status })");
    expect(hooks).toContain("updateAdminRecordStatus(config, id, status)");
    expect(getRecordId(school.school)).toBe("11111111-1111-4111-8111-111111111111");
    expect(detailPage).toContain("entityStatusErrorMessage(entityKey, error)");
    expect(detailPage).toContain('parsed.code === "SCHOOL_NOT_FOUND"');
    expect(detailPage).toContain("Sekolah tidak ditemui.");
    expect(detailPage).toContain('parsed.code === "SCHOOL_STATUS_TRANSITION_INVALID"');
    expect(detailPage).toContain("Status route is not available.");
  });

  it("shows normalized summary values without raw JSON or internal names", () => {
    const summary = getSchoolCreateSummary({
      schoolCode: " ska ",
      schoolName: " Sekolah Kebangsaan Aman ",
      principalName: "",
      contactEmail: "",
      phone: "0123456789",
      address: "Jalan Aman",
      logo: "/logo.svg",
    });

    expect(summary).toEqual([
      { name: "schoolCode", label: "Kod sekolah", value: "SKA" },
      { name: "schoolName", label: "Nama sekolah", value: "Sekolah Kebangsaan Aman" },
      { name: "principalName", label: "Nama pengetua", value: "Tidak tersedia" },
      { name: "contactEmail", label: "E-mel perhubungan", value: "Tidak tersedia" },
      { name: "phone", label: "Nombor telefon", value: "0123456789" },
      { name: "address", label: "Alamat", value: "Jalan Aman" },
    ]);
  });
});
