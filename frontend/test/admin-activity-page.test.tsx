import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  AdminActivityCard,
  AdminActivityFilters,
  AdminActivityManagementView,
  AdminActivityResultsHeader,
  AdminActivitySummarySection,
} from "@/features/admin/components/AdminActivityManagement";
import {
  AdminActivityGalleryPlaceholder,
  AdminActivityTypePage,
} from "@/features/admin/components/AdminActivityTypeSelection";
import {
  AdminReadingTemplateGallery,
  ReadingTemplatePreviewContent,
} from "@/features/admin/components/AdminReadingTemplateGallery";
import {
  adminActivityCategoryTabs,
  adminActivityQueryFromSearchParams,
  getAdminActivityResetQuery,
  getAdminActivityResultRange,
  getAdminActivityStatusLabel,
  getAdminActivityTemplateLabel,
  getAdminActivityTemplateOptionLabel,
  getAdminActivityThumbnail,
  type AdminActivityListResult,
  type AdminActivityRecord,
  type AdminActivitySummary,
  type AdminActivityTemplateOption,
} from "@/features/admin/utils/admin-activity";
import { adminActivityTypeOptions } from "@/features/admin/utils/admin-activity-type";
import {
  availableReadingTemplates,
  defaultReadingTemplateGalleryFilters,
  filterReadingTemplates,
  hasActiveReadingTemplateFilters,
  roadmapReadingTemplates,
} from "@/features/admin/utils/admin-reading-template-gallery";
import {
  activityBasicInfoDefaults,
  activityWizardSteps,
  buildSeretSukuKataCreatePayload,
  buildSeretSukuKataUpdatePayload,
  getActivityWizardProgress,
  getActivityWizardStepStates,
  findPemulihanProgramme,
  findSeretSukuKataTemplate,
  getActivityBasicInfoFormValues,
  PEMULIHAN_KHAS_PROGRAMME_CODE,
  SERET_SUKU_KATA_RENDERER_KEY,
  SERET_SUKU_KATA_TEMPLATE_CODE,
} from "@/features/admin/utils/admin-activity-create";
import {
  activityScoringModeOptions,
  buildActivitySettingsUpdatePayload,
  getActivitySettingsFormValues,
  getActivitySettingsProgress,
  getActivitySettingsScoringSyncState,
  getActivitySettingsTemplateSupport,
} from "@/features/admin/utils/admin-activity-settings";
import {
  buildActivityCurriculumLinkPayload,
  deriveMappedContentStandards,
  deriveMappedLearningStandards,
  formatCurriculumSummary,
  type AdminContentStandardOption,
  type AdminLearningStandardOption,
  type AdminSkillLearningStandardMapping,
} from "@/features/admin/utils/admin-activity-curriculum";
import { ToastContext, type ToastContextValue } from "@/providers/toast-context-value";
import { PencilLine } from "lucide-react";

const toastValue: ToastContextValue = {
  notify: () => undefined,
  success: () => undefined,
  error: () => undefined,
  warning: () => undefined,
  info: () => undefined,
};

function renderWithProviders(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={toastValue}>
        {node}
      </ToastContext.Provider>
    </QueryClientProvider>,
  );
}

const sampleActivity: AdminActivityRecord = {
  id: "activity-1",
  title: "Baca dan Susun",
  status: "PUBLISHED",
  updatedAt: "2026-08-04T09:00:00.000Z",
  createdAt: "2026-08-01T09:00:00.000Z",
  publishedAt: "2026-08-04T10:00:00.000Z",
  difficulty: "BASIC",
  template: {
    id: "template-1",
    name: "Arrange Syllables",
    category: "ARRANGEMENT",
    rendererKey: "arrange-syllables",
  },
  curriculumLinks: [
    {
      isPrimary: true,
      curriculumYear: { yearLevel: 2, name: "Tahun 2" },
      remedialSkill: { name: "Mengecam suku kata" },
    },
  ],
  items: [{ id: "item-1" }, { id: "item-2" }],
  media: [
    {
      id: "media-1",
      mediaRole: "COVER_IMAGE",
      url: "/media/activity-cover.png",
      altText: "Kulit aktiviti",
      label: "Cover",
    },
  ],
};

const sampleDraftActivity: AdminActivityRecord = {
  ...sampleActivity,
  id: "activity-draft",
  status: "DRAFT",
  publishedAt: null,
};

const sampleArchivedActivity: AdminActivityRecord = {
  ...sampleActivity,
  id: "activity-archived",
  status: "ARCHIVED",
};

const sampleSummary: AdminActivitySummary = {
  total: 24,
  published: 12,
  draft: 8,
  archived: 4,
};

const sampleTemplates: AdminActivityTemplateOption[] = [
  { id: "template-1", name: "Arrange Syllables", category: "READING", rendererKey: "arrange-syllables" },
  { id: "template-2", name: "Latihan Menulis", category: "WRITING", rendererKey: "copy-writing" },
];

const sampleListResult: AdminActivityListResult = {
  items: [sampleActivity],
  meta: {
    page: 1,
    limit: 12,
    total: 24,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

describe("Admin activity management page", () => {
  it("keeps the admin route protected and preserves existing activity routes", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const guards = readFileSync(new URL("../src/routes/guards.tsx", import.meta.url), "utf8");

    expect(routes).toContain('{ path: "aktiviti", element: <AdminActivityPage /> }');
    expect(routes).toContain('{ path: "aktiviti/cipta", element: <AdminActivityTypePage /> }');
    expect(routes).toContain('{ path: "aktiviti/cipta/membaca", element: <AdminReadingTemplateGalleryPage /> }');
    expect(routes).toContain('{ path: "aktiviti/cipta/membaca/seret-suku-kata", element: <AdminReadingTemplateWizardPlaceholderPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/maklumat", element: <AdminReadingTemplateWizardPlaceholderPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/kurikulum", element: <AdminActivityCurriculumPlaceholderPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/kandungan", element: <AdminActivityContentPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/tetapan", element: <AdminActivitySettingsPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/pratonton", element: <AdminActivityPreviewPlaceholderPage /> }');
    expect(routes).toContain('{ path: "aktiviti/:activityId/cipta/terbitkan", element: <AdminActivityPublishPage /> }');
    expect(routes).toContain('{ path: "aktiviti/cipta/menulis", element: <AdminActivityGalleryPlaceholderPage category="WRITING" /> }');
    expect(routes).not.toContain('aktiviti/cipta/mengira');
    expect(routes).toContain('path: "digital-activities"');
    expect(routes).toContain('{ path: "create", element: <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}><BuilderFormPage entityKey="digitalActivities" mode="create" /></RequireRole> }');
    expect(routes).toContain('path: "activity-templates"');
    expect(routes).toContain('{ path: "aktiviti", element: <TeacherListPage resource="activities" /> }');
    expect(routes).toContain('<RequireAdmin>');
    expect(guards).toContain('return <RequireRole roles={["SUPER_ADMIN", "ADMIN"]}>{renderGuardChild(props.children)}</RequireRole>;');
    expect(guards).toContain('return <RequireRole roles={["TEACHER"]}>{renderGuardChild(props.children)}</RequireRole>;');
    expect(guards).toContain('return <RequireRole roles={["STUDENT"]}>{renderGuardChild(props.children)}</RequireRole>;');
    expect(guards).toContain('return <RequireRole roles={["PARENT"]}>{renderGuardChild(props.children)}</RequireRole>;');
  });

  it("keeps the admin sidebar activity entry while leaving teacher activity navigation unchanged", () => {
    const sidebar = readFileSync(new URL("../src/components/dashboard/Sidebar.tsx", import.meta.url), "utf8");

    expect(sidebar).toContain('title: "Aktiviti"');
    expect(sidebar).toContain('url: "/admin/aktiviti"');
    expect(sidebar).toContain('roles: ["SUPER_ADMIN", "ADMIN"]');
    expect(sidebar).toContain('url: "/guru/ibu-bapa"');
    expect(sidebar).toContain('url: "/digital-activities"');
  });

  it("parses URL query state and keeps category filters in search params", () => {
    const query = adminActivityQueryFromSearchParams(new URLSearchParams("page=2&templateCategory=WRITING&status=PUBLISHED&sortBy=title&sortOrder=asc"));

    expect(query.page).toBe(2);
    expect(query.templateCategory).toBe("WRITING");
    expect(query.status).toBe("PUBLISHED");
    expect(query.sortBy).toBe("title");
    expect(query.sortOrder).toBe("asc");
  });

  it("defaults to the first supported activity category when no category is present", () => {
    const query = adminActivityQueryFromSearchParams(new URLSearchParams(""));

    expect(query.templateCategory).toBe("READING");
  });

  it("maps central activity labels and template options safely", () => {
    expect(getAdminActivityStatusLabel("IN_REVIEW")).toBe("Dalam Semakan");
    expect(getAdminActivityStatusLabel("PUBLISHED")).toBe("Aktif");
    expect(getAdminActivityTemplateLabel(sampleActivity.template)).toBe("Seret Suku Kata");
    expect(getAdminActivityTemplateOptionLabel(sampleTemplates[1])).toContain("Menulis");
    expect(adminActivityCategoryTabs.map((tab) => tab.label)).toEqual(["Membaca", "Menulis"]);
    expect(adminActivityCategoryTabs).not.toContainEqual(expect.objectContaining({ label: "Semua Aktiviti" }));
    expect(adminActivityCategoryTabs).not.toContainEqual(expect.objectContaining({ label: "Mengira" }));
  });

  it("uses the real cover image first for thumbnail fallback", () => {
    expect(getAdminActivityThumbnail(sampleActivity)?.src).toBe("/media/activity-cover.png");
  });

  it("renders the management header, summary cards, and create action", () => {
    const markup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityManagementView
          query={{ page: 1, limit: 12, sortBy: "updatedAt", sortOrder: "desc" }}
          summary={sampleSummary}
          summaryLoading={false}
          summaryError={false}
          activities={sampleListResult}
          templates={sampleTemplates}
          isLoading={false}
          isError={false}
          onRetrySummary={() => undefined}
          onRetryActivities={() => undefined}
          onChange={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Pengurusan Aktiviti");
    expect(markup).toContain("Cipta Aktiviti");
    expect(markup).toContain("Jumlah Aktiviti");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Diarkibkan");
    expect(markup).toContain('href="/admin/aktiviti/cipta"');
    expect(markup).not.toContain("Diterbitkan");
    expect(markup).not.toContain("Semua Aktiviti");
  });

  it("renders real activity cards with the activity title, status header, and wizard actions", () => {
    const markup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Baca dan Susun");
    expect(markup).toContain("Aktif");
    expect(markup).toContain('href="/admin/aktiviti/activity-1/cipta/pratonton"');
    expect(markup).toContain('href="/admin/aktiviti/activity-1/cipta/maklumat"');
    expect(markup).toContain("Kemahiran");
    expect(markup).toContain("Tahun");
    expect(markup).not.toContain("Seret Suku Kata");
    expect(markup).not.toContain("Arrange Syllables");
  });

  it("renders status-based activity card actions for draft, published, and archived records", () => {
    const draftMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleDraftActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );
    const publishedMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );
    const archivedMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleArchivedActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(draftMarkup).toContain("Padam");
    expect(draftMarkup).toContain("Edit");
    expect(draftMarkup).toContain("Pratonton");

    expect(publishedMarkup).toContain("Diarkibkan");
    expect(publishedMarkup).toContain("Edit");
    expect(publishedMarkup).toContain("Pratonton");
    expect(publishedMarkup).not.toContain("Padam");
    expect(publishedMarkup).not.toContain("Aktifkan Semula");

    expect(archivedMarkup).toContain("Aktifkan Semula");
    expect(archivedMarkup).toContain("Edit");
    expect(archivedMarkup).toContain("Pratonton");
    expect(archivedMarkup).not.toContain("Padam");
    expect(archivedMarkup).not.toContain("Arkibkan aktiviti");
  });

  it("renders the Admin activity type selection page with available and disabled categories", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminActivityTypePage />
      </MemoryRouter>,
    );

    expect(markup).toContain("Pilih Jenis Aktiviti");
    expect(markup).toContain("Pilih kategori aktiviti yang ingin dicipta");
    expect(markup).toContain("Kembali ke Pengurusan Aktiviti");
    expect(markup).toContain('href="/admin/aktiviti"');
    expect(markup).toContain("Membaca");
    expect(markup).toContain("Menulis");
    expect(markup).toContain("Mengira");
    expect(markup).toContain("Pilih Membaca");
    expect(markup).toContain("Pilih Menulis");
    expect(markup).toContain('href="/admin/aktiviti/cipta/membaca"');
    expect(markup).toContain('href="/admin/aktiviti/cipta/menulis"');
    expect(markup).toContain("Akan Datang");
    expect(markup).toContain("Belum Tersedia");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain('href="/admin/aktiviti/cipta/mengira"');
  });

  it("keeps category cards reusable and responsive without duplicated route-specific markup", () => {
    const componentSource = readFileSync(new URL("../src/features/admin/components/AdminActivityTypeSelection.tsx", import.meta.url), "utf8");
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");

    expect(adminActivityTypeOptions.map((option) => option.title)).toEqual(["Membaca", "Menulis", "Mengira"]);
    expect(adminActivityTypeOptions.find((option) => option.title === "Mengira")?.status).toBe("COMING_SOON");
    expect(componentSource).toContain("function ActivityCategoryCard");
    expect(componentSource).toContain("adminActivityTypeOptions.map");
    expect(componentSource).toContain("grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3");
    expect(componentSource).toContain("flex h-full flex-col");
    expect(componentSource).toContain("mt-auto pt-6");
    expect(routes).not.toContain('category="COUNTING"');
  });

  it("renders safe Membaca and Menulis placeholder routes with back actions", () => {
    const menulisMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminActivityGalleryPlaceholder
          title="Galeri Templat Menulis"
          description="Templat aktiviti Menulis akan disediakan dalam fasa seterusnya."
          icon={PencilLine}
        />
      </MemoryRouter>,
    );

    expect(menulisMarkup).toContain("Galeri Templat Menulis");
    expect(menulisMarkup).toContain("Templat aktiviti Menulis akan disediakan dalam fasa seterusnya.");
    expect(menulisMarkup).toContain('href="/admin/aktiviti/cipta"');
  });

  it("registers topbar metadata for Admin activity creation without Dashboard fallback", () => {
    const topbar = readFileSync(new URL("../src/components/dashboard/DashboardTopbar.tsx", import.meta.url), "utf8");

    expect(topbar).toContain('{ path: "/admin/aktiviti/cipta", label: "Pilih Jenis Aktiviti" }');
    expect(topbar).toContain('{ path: "/admin/aktiviti/cipta/membaca", label: "Galeri Templat Membaca" }');
    expect(topbar).toContain('{ path: "/admin/aktiviti/cipta/membaca/seret-suku-kata", label: "Cipta Aktiviti Seret Suku Kata" }');
    expect(topbar).toContain('{ path: "/admin/aktiviti/cipta/menulis", label: "Galeri Templat Menulis" }');
  });

  it("renders the Membaca template gallery with Seret Suku Kata from the trusted registry source", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminReadingTemplateGallery />
      </MemoryRouter>,
    );
    const source = readFileSync(new URL("../src/features/admin/components/AdminReadingTemplateGallery.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Galeri Templat Membaca");
    expect(markup).toContain("Pilih templat Membaca yang ingin digunakan");
    expect(markup).toContain("Kembali");
    expect(markup).toContain('href="/admin/aktiviti/cipta"');
    expect(markup).toContain("Cari templat Membaca");
    expect(markup).toContain("Jenis interaksi");
    expect(markup).toContain("Sumber templat");
    expect(source).toContain("Semua interaksi");
    expect(source).toContain("Semua sumber");
    expect(markup).toContain("Reset");
    expect(markup).toContain("Seret Suku Kata");
    expect(markup).toContain("Lengkapkan perkataan dengan menyeret suku kata yang betul ke ruang jawapan.");
    expect(markup).toContain("Guna Templat");
    expect(markup).toContain("Pratonton");
    expect(markup).toContain('href="/admin/aktiviti/cipta/membaca/seret-suku-kata"');
    expect(markup).not.toContain("Gunakan templat yang tersedia");
    expect(markup).not.toContain("Tersedia Sekarang");
    expect(markup).not.toContain("1 daripada 1 templat tersedia");
    expect(markup).not.toContain("rating");
    expect(markup).not.toContain("penggunaan");
  });

  it("filters available Membaca templates without counting roadmap cards", () => {
    expect(availableReadingTemplates).toHaveLength(1);
    expect(availableReadingTemplates[0]).toMatchObject({
      title: "Seret Suku Kata",
      templateCode: "ARRANGE_SYLLABLES",
      rendererKey: "arrange-syllables",
      sourceLabel: "Templat Sistem",
      status: "AVAILABLE",
    });
    expect(roadmapReadingTemplates.every((template) => template.status === "COMING_SOON")).toBe(true);
    expect(filterReadingTemplates(availableReadingTemplates, defaultReadingTemplateGalleryFilters)).toHaveLength(1);
    expect(filterReadingTemplates(availableReadingTemplates, { ...defaultReadingTemplateGalleryFilters, search: "tidak wujud" })).toHaveLength(0);
    expect(filterReadingTemplates(availableReadingTemplates, { ...defaultReadingTemplateGalleryFilters, interaction: "DRAG_DROP" })).toHaveLength(1);
    expect(filterReadingTemplates(availableReadingTemplates, { ...defaultReadingTemplateGalleryFilters, source: "SYSTEM_TEMPLATE" })).toHaveLength(1);
    expect(hasActiveReadingTemplateFilters(defaultReadingTemplateGalleryFilters)).toBe(false);
    expect(hasActiveReadingTemplateFilters({ ...defaultReadingTemplateGalleryFilters, search: "Seret" })).toBe(true);
  });

  it("uses the local Seret Suku Kata image and removes all gallery-specific thumbnail management", () => {
    const pageSource = readFileSync(new URL("../src/features/admin/pages/AdminReadingTemplateGalleryPage.tsx", import.meta.url), "utf8");
    const componentSource = readFileSync(new URL("../src/features/admin/components/AdminReadingTemplateGallery.tsx", import.meta.url), "utf8");

    expect(componentSource).toContain('import seretSukuKataThumbnail from "@/assets/images/img_.seret.png"');
    expect(componentSource).toContain('alt="Pratonton templat Seret Suku Kata"');
    expect(componentSource).toContain("lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(12rem,0.55fr)]");
    expect(componentSource).toContain("object-contain");
    expect(componentSource).not.toContain("Muat Naik Thumbnail");
    expect(componentSource).not.toContain("Ganti Thumbnail");
    expect(componentSource).not.toContain("Buang Thumbnail");
    expect(componentSource).not.toContain("type=\"file\"");
    expect(componentSource).not.toContain("dataTransfer.files");
    expect(componentSource).not.toContain("uploadMediaFile");
    expect(componentSource).not.toContain("useAuthStore");
    expect(pageSource).toContain("<AdminReadingTemplateGallery />");
    expect(pageSource).not.toContain("useQuery");
    expect(pageSource).not.toContain("useMutation");
    expect(pageSource).not.toContain("uploadMediaFile");
  });

  it("renders roadmap Membaca templates as disabled coming-soon cards without routes", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminReadingTemplateGallery />
      </MemoryRouter>,
    );

    expect(markup).toContain("Akan Datang");
    expect(markup).toContain("Baca Perkataan");
    expect(markup).toContain("Padankan Bunyi");
    expect(markup).toContain("Susun Perkataan");
    expect(markup).toContain("Belum Tersedia");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("/admin/aktiviti/cipta/membaca/baca-perkataan");
    expect(markup).not.toContain("/admin/aktiviti/cipta/membaca/padankan-bunyi");
    expect(markup).not.toContain("/admin/aktiviti/cipta/membaca/susun-perkataan");
  });

  it("renders a safe non-persistent Seret Suku Kata preview dialog", () => {
    const markup = renderToStaticMarkup(
      <ReadingTemplatePreviewContent selectedAnswer={null} onSelectAnswer={() => undefined} />,
    );
    const source = readFileSync(new URL("../src/features/admin/components/AdminReadingTemplateGallery.tsx", import.meta.url), "utf8");

    expect(source).toContain("Pratonton Templat");
    expect(source).toContain("Contoh interaksi murid untuk Seret Suku Kata.");
    expect(markup).toContain("cawan");
    expect(markup).toContain("ca + ____");
    expect(markup).toContain("wan");
    expect(markup).toContain("ki");
    expect(markup).toContain("tu");
    expect(markup).toContain("ri");
    expect(markup).toContain("Tiada skor, percubaan atau rekod murid dicipta.");
    expect(source).toContain("Tutup");
    expect(source).toContain("Guna Templat");
    expect(source).toContain('/admin/aktiviti/cipta/membaca/seret-suku-kata');
    expect(source).not.toContain("apiRequest");
    expect(source).not.toContain("useMutation");
    expect(source).not.toContain("StudentAttempt");
    expect(source).not.toContain("createDigitalActivity");
    expect(source).not.toContain("saveScore");
  });

  it("renders the Sprint 4.1 Seret Suku Kata Step 1 route without query-step navigation", () => {
    const pageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminReadingTemplateWizardPlaceholderPage.tsx", import.meta.url),
      "utf8",
    );
    const wizardSource = readFileSync(
      new URL("../src/features/admin/components/AdminActivityCreateWizard.tsx", import.meta.url),
      "utf8",
    );
    const footerSource = readFileSync(
      new URL("../src/features/admin/components/AdminActivityWizardStepFooter.tsx", import.meta.url),
      "utf8",
    );
    const hookSource = readFileSync(
      new URL("../src/features/admin/hooks/use-activity-wizard-step.ts", import.meta.url),
      "utf8",
    );
    const apiSource = readFileSync(new URL("../src/features/admin/api/admin-activity.api.ts", import.meta.url), "utf8");

    expect(pageSource).toContain("<AdminActivityCreateWizardPage />");
    expect(wizardSource).toContain("Lengkapkan maklumat asas untuk membina aktiviti Seret Suku Kata.");
    expect(wizardSource).toContain("Templat Dipilih");
    expect(wizardSource).toContain("Maklumat Aktiviti");
    expect(wizardSource).toContain("Nama Aktiviti");
    expect(wizardSource).toContain("Penerangan");
    expect(wizardSource).toContain("Arahan kepada Murid");
    expect(wizardSource).toContain("Tahap Kesukaran");
    expect(wizardSource).toContain("Anggaran Masa");
    expect(wizardSource).toContain("AdminActivityWizardStepFooter");
    expect(wizardSource).toContain("useActivityWizardStep");
    expect(footerSource).toContain("Batal");
    expect(footerSource).toContain("Simpan");
    expect(footerSource).toContain("Seterusnya");
    expect(wizardSource).not.toContain("Simpan dan Seterusnya");
    expect(wizardSource).toContain("Buang perubahan?");
    expect(wizardSource).toContain("Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini.");
    expect(wizardSource).toContain("navigate(stepOnePath(savedActivity.id), { replace: true })");
    expect(wizardSource).toContain("continueDestination: persistedActivityId ? stepTwoPath(persistedActivityId) : undefined");
    expect(wizardSource).toContain("saveActivity.isPending");
    expect(hookSource).toContain("const canSave = isReady && isDirty && !isSaving;");
    expect(hookSource).toContain("const canContinue = Boolean(continueDestination) && isSaved && !isDirty && !isSaving;");
    expect(wizardSource).toContain("updateAdminDigitalActivity");
    expect(wizardSource).toContain("buildSeretSukuKataUpdatePayload");
    expect(wizardSource).toContain("getActivityBasicInfoFormValues");
    expect(wizardSource).toContain("cancelDestination: galleryPath");
    expect(wizardSource).toContain('queryKey: adminActivityCreateQueryKeys.activityDetail(activityId)');
    expect(wizardSource).toContain("getActivityCreateErrorMessage");
    expect(apiSource).toContain('apiRequest<ActivityPayload>("/digital-activities"');
    expect(apiSource).toContain('`/digital-activities/${activityId}`');
    expect(apiSource).toContain('method: "PATCH"');
    expect(pageSource).not.toContain("useSearchParams");
    expect(wizardSource).not.toContain("useSearchParams");
    expect(wizardSource).not.toContain("Simpan Draf");
    expect(wizardSource).not.toContain("Publish");
    expect(wizardSource).not.toContain('queryKey: adminActivityCreateQueryKeys.activityList');
    expect(wizardSource).not.toContain('queryKey: adminActivityCreateQueryKeys.activitySummary');
    expect(wizardSource).not.toContain('queryKey: adminActivityCreateQueryKeys.builderActivityList');
  });

  it("maps the Step 1 payload to the real DigitalActivity create contract", () => {
    const payload = buildSeretSukuKataCreatePayload({
      values: activityBasicInfoDefaults,
      programmeId: "programme-real-id",
      activityTemplateId: "template-real-id",
    });

    expect(activityWizardSteps.map((step) => step.label)).toEqual(["Maklumat", "Kurikulum", "Kandungan", "Tetapan", "Pratonton", "Terbitkan"]);
    expect(payload).toMatchObject({
      title: "Seret Suku Kata",
      programmeId: "programme-real-id",
      activityTemplateId: "template-real-id",
      difficulty: "BASIC",
      scoringMode: "TOTAL_SCORE",
      reviewMode: "AUTO",
      totalMarks: 1,
      masteryThreshold: 80,
      estimatedMinutes: 10,
      attemptsAllowed: 1,
      timeLimitSeconds: null,
      shuffleItems: true,
      showImmediateFeedback: true,
      allowRetry: true,
      configuration: {
        shuffleSyllables: true,
        showReferenceImage: false,
        playReferenceAudio: false,
        attemptsAllowed: 1,
      },
      rewardConfiguration: null,
      presentationSettings: null,
    });
    expect(payload).not.toHaveProperty("category");
    expect(payload).not.toHaveProperty("templateCode");
    expect(payload).not.toHaveProperty("rendererKey");
    expect(payload).not.toHaveProperty("curriculumYearId");
    expect(payload).not.toHaveProperty("items");
    expect(payload).not.toHaveProperty("media");
  });

  it("builds the Step 1 update payload and maps saved draft values back into the form", () => {
    expect(buildSeretSukuKataUpdatePayload({
      values: {
        title: "Seret Suku Kata Tahun 1",
        description: "Aktiviti literasi",
        instructions: "Seret suku kata yang betul.",
        difficulty: "INTERMEDIATE",
        estimatedMinutes: "15",
      },
    })).toEqual({
      title: "Seret Suku Kata Tahun 1",
      description: "Aktiviti literasi",
      instructions: "Seret suku kata yang betul.",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 15,
    });

    expect(getActivityBasicInfoFormValues({
      title: "Aktiviti Draf",
      description: "Penerangan draf",
      instructions: "Arahan draf",
      difficulty: "ADVANCED",
      estimatedMinutes: 20,
    })).toEqual({
      title: "Aktiviti Draf",
      description: "Penerangan draf",
      instructions: "Arahan draf",
      difficulty: "ADVANCED",
      estimatedMinutes: "20",
    });
  });

  it("resolves the real Pemulihan programme and ARRANGE_SYLLABLES template by trusted identifiers", () => {
    expect(PEMULIHAN_KHAS_PROGRAMME_CODE).toBe("BM-PEMULIHAN");
    expect(SERET_SUKU_KATA_TEMPLATE_CODE).toBe("ARRANGE_SYLLABLES");
    expect(SERET_SUKU_KATA_RENDERER_KEY).toBe("arrange-syllables");
    expect(findPemulihanProgramme([
      {
        id: "programme-1",
        code: "BM-PEMULIHAN",
        name: "Program Pemulihan Khas",
        status: "ACTIVE",
        version: { status: "PUBLISHED" },
      },
    ])?.id).toBe("programme-1");
    expect(findPemulihanProgramme([
      {
        id: "programme-1",
        code: "BM-PEMULIHAN",
        name: "Program Pemulihan Khas",
        status: "ACTIVE",
        version: { status: "DRAFT" },
      },
    ])).toBeNull();
    expect(findSeretSukuKataTemplate([
      { id: "template-1", code: "ARRANGE_SYLLABLES", name: "Arrange Syllables", rendererKey: "arrange-syllables" },
    ])?.id).toBe("template-1");
    expect(findSeretSukuKataTemplate([
      { id: "template-2", code: "OTHER_TEMPLATE", name: "Arrange Syllables", rendererKey: "other-renderer" },
    ])).toBeNull();
  });

  it("implements Step 2 curriculum loading and Step 3 content editor with real persistence", () => {
    const routeSource = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const pageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminActivityCurriculumPlaceholderPage.tsx", import.meta.url),
      "utf8",
    );
    const footerSource = readFileSync(
      new URL("../src/features/admin/components/AdminActivityWizardStepFooter.tsx", import.meta.url),
      "utf8",
    );
    const hookSource = readFileSync(
      new URL("../src/features/admin/hooks/use-activity-wizard-step.ts", import.meta.url),
      "utf8",
    );
    const contentPageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminActivityContentPage.tsx", import.meta.url),
      "utf8",
    );
    const contentHookSource = readFileSync(
      new URL("../src/features/admin/hooks/use-activity-content.ts", import.meta.url),
      "utf8",
    );
    const contentApiSource = readFileSync(
      new URL("../src/features/admin/api/arrange-syllables-content.api.ts", import.meta.url),
      "utf8",
    );
    const apiSource = readFileSync(new URL("../src/features/admin/api/admin-activity.api.ts", import.meta.url), "utf8");

    expect(routeSource).toContain('{ path: "aktiviti/:activityId/cipta/maklumat", element: <AdminReadingTemplateWizardPlaceholderPage /> }');
    expect(routeSource).toContain('{ path: "aktiviti/:activityId/cipta/kurikulum", element: <AdminActivityCurriculumPlaceholderPage /> }');
    expect(routeSource).toContain('{ path: "aktiviti/:activityId/cipta/kandungan", element: <AdminActivityContentPage /> }');
    expect(pageSource).toContain('const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;');
    expect(pageSource).toContain("getAdminDigitalActivity(activityId)");
    expect(pageSource).toContain("listAdminCurriculumYears");
    expect(pageSource).toContain("listAdminRemedialSkills");
    expect(pageSource).toContain("listAdminContentStandards");
    expect(pageSource).toContain("listAdminLearningStandards");
    expect(pageSource).toContain("addAdminActivityCurriculumLink");
    expect(pageSource).toContain("removeAdminActivityCurriculumLink");
    expect(pageSource).toContain("buildActivityCurriculumLinkPayload");
    expect(pageSource).toContain("RemedialSkillSelect");
    expect(pageSource).toContain("Cari kod atau nama kemahiran…");
    expect(pageSource).toContain("max-h-80 overflow-y-auto");
    expect(pageSource).toContain("Pemetaan Tahun DSKP");
    expect(pageSource).toContain("Digunakan untuk menentukan Standard Kandungan dan Standard Pembelajaran KSSR yang berkaitan.");
    expect(pageSource).toContain("Pemetaan kurikulum belum tersedia");
    expect(pageSource).toContain("Kemahiran ini belum mempunyai pemetaan Standard Kandungan dan Standard Pembelajaran bagi tahun yang dipilih.");
    expect(footerSource).toContain("Batal");
    expect(footerSource).toContain("Simpan");
    expect(footerSource).toContain("Seterusnya");
    expect(pageSource).not.toContain("Simpan dan Seterusnya");
    expect(pageSource).toContain("AdminActivityWizardStepFooter");
    expect(pageSource).toContain("useActivityWizardStep");
    expect(pageSource).toContain("Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini.");
    expect(pageSource).toContain('toast.success("Berjaya", "Maklumat kurikulum berjaya disimpan.")');
    expect(pageSource).toContain("continueDestination: stepThreePath(activityId)");
    expect(pageSource).toContain("cancelDestination: galleryPath");
    expect(pageSource).toContain("const hasSavedCurriculumLink = Boolean(currentPrimaryLink?.id);");
    expect(hookSource).toContain("const canSave = isReady && isDirty && !isSaving;");
    expect(hookSource).toContain("const canContinue = Boolean(continueDestination) && isSaved && !isDirty && !isSaving;");
    expect(pageSource).toContain("progress={getActivityWizardProgress(activity.data)}");
    expect(contentPageSource).toContain("Bina dan susun soalan Seret Suku Kata untuk aktiviti ini.");
    expect(contentPageSource).toContain("Belum ada soalan");
    expect(contentPageSource).toContain("Tambah soalan pertama untuk membina aktiviti Seret Suku Kata.");
    expect(contentPageSource).toContain("Kurikulum belum lengkap");
    expect(contentPageSource).toContain("useActivityContent");
    expect(contentPageSource).toContain("ArrangeSyllablesQuestionForm");
    expect(contentPageSource).toContain("ActivityQuestionNavigator");
    expect(contentPageSource).toContain("ActivityContentSummary");
    expect(contentPageSource).toContain("Padam soalan?");
    expect(contentPageSource).toContain("Soalan ini akan dipadam daripada aktiviti. Tindakan ini tidak boleh dibatalkan selepas disimpan.");
    expect(contentPageSource).toContain("Buang perubahan?");
    expect(contentPageSource).toContain("Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini.");
    expect(contentPageSource).not.toContain("Langkah Kandungan akan dilaksanakan dalam Sprint seterusnya.");
    expect(contentHookSource).toContain("createQuestionBankItemForActivity");
    expect(contentHookSource).toContain("addQuestionBankCurriculumLinkForActivity");
    expect(contentHookSource).toContain("activateQuestionBankItemForActivity");
    expect(contentHookSource).toContain("addDigitalActivityItem");
    expect(contentHookSource).toContain("updateDigitalActivityItem");
    expect(contentHookSource).toContain("removeDigitalActivityItem");
    expect(contentHookSource).toContain("reorderDigitalActivityItems");
    expect(contentHookSource).not.toContain("isQuestionDuplicatePendingChange");
    expect(contentHookSource).toContain("canSaveSelectedQuestion");
    expect(contentApiSource).toContain('"/question-bank/items"');
    expect(contentApiSource).toContain('`/question-bank/items/${itemId}/curriculum-links`');
    expect(contentApiSource).toContain('`/question-bank/items/${itemId}/activate`');
    expect(contentApiSource).toContain('`/digital-activities/${activityId}/items`');
    expect(contentApiSource).toContain('`/digital-activities/${activityId}/items/reorder`');
    expect(pageSource).not.toContain("useSearchParams");
    expect(pageSource).not.toContain("mutateAsync(buildSeretSukuKataCreatePayload");
    expect(apiSource).toContain('`/digital-activities/${activityId}/curriculum-links`');
  });

  it("derives wizard progress and accessibility from persisted activity state instead of the current route", () => {
    expect(getActivityWizardProgress({ id: "activity-1", curriculumLinks: [] })).toEqual({
      hasDraft: true,
      hasCurriculumLink: false,
      hasContent: false,
      hasSettings: false,
    });

    expect(getActivityWizardProgress({
      id: "activity-1",
      curriculumLinks: [{ id: "link-1", isPrimary: true }],
    })).toEqual({
      hasDraft: true,
      hasCurriculumLink: true,
      hasContent: false,
      hasSettings: false,
    });

    expect(getActivityWizardProgress({
      id: "activity-1",
      curriculumLinks: [{ id: "link-1", isPrimary: true }],
      items: [{ id: "item-1" }],
    })).toEqual({
      hasDraft: true,
      hasCurriculumLink: true,
      hasContent: true,
      hasSettings: false,
    });

    expect(getActivityWizardProgress({
      id: "activity-1",
      curriculumLinks: [{ id: "link-1", isPrimary: true }],
      items: [{ id: "item-1" }],
      settingsCompletedAt: "2026-08-07T00:00:00.000Z",
    })).toMatchObject({
      hasDraft: true,
      hasCurriculumLink: true,
      hasContent: true,
      hasSettings: true,
    });

    expect(getActivityWizardStepStates({
      activeStep: "settings",
      progress: {
        hasDraft: true,
        hasCurriculumLink: true,
        hasContent: true,
        hasSettings: true,
      },
      stepLinks: {
        information: "/admin/aktiviti/activity-1/cipta/maklumat",
        curriculum: "/admin/aktiviti/activity-1/cipta/kurikulum",
        content: "/admin/aktiviti/activity-1/cipta/kandungan",
        settings: "/admin/aktiviti/activity-1/cipta/tetapan",
        preview: "/admin/aktiviti/activity-1/cipta/pratonton",
        publish: "/admin/aktiviti/activity-1/cipta/terbitkan",
      },
    }).map((step) => ({
      key: step.key,
      isCurrent: step.isCurrent,
      isCompleted: step.isCompleted,
      isAccessible: step.isAccessible,
      isLocked: step.isLocked,
    }))).toEqual([
      { key: "information", isCurrent: false, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "curriculum", isCurrent: false, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "content", isCurrent: false, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "settings", isCurrent: true, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "preview", isCurrent: false, isCompleted: false, isAccessible: true, isLocked: false },
      { key: "publish", isCurrent: false, isCompleted: false, isAccessible: true, isLocked: false },
    ]);

    expect(getActivityWizardStepStates({
      activeStep: "information",
      progress: { hasDraft: true, hasCurriculumLink: false },
      stepLinks: {
        curriculum: "/admin/aktiviti/activity-1/cipta/kurikulum",
        content: "/admin/aktiviti/activity-1/cipta/kandungan",
      },
    }).map((step) => ({
      key: step.key,
      isCurrent: step.isCurrent,
      isCompleted: step.isCompleted,
      isAccessible: step.isAccessible,
      isLocked: step.isLocked,
    }))).toEqual([
      { key: "information", isCurrent: true, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "curriculum", isCurrent: false, isCompleted: false, isAccessible: true, isLocked: false },
      { key: "content", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
      { key: "settings", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
      { key: "preview", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
      { key: "publish", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
    ]);

    expect(getActivityWizardStepStates({
      activeStep: "curriculum",
      progress: { hasDraft: true, hasCurriculumLink: true },
      stepLinks: {
        information: "/admin/aktiviti/activity-1/cipta/maklumat",
        content: "/admin/aktiviti/activity-1/cipta/kandungan",
      },
    }).map((step) => ({
      key: step.key,
      isCurrent: step.isCurrent,
      isCompleted: step.isCompleted,
      isAccessible: step.isAccessible,
      isLocked: step.isLocked,
    }))).toEqual([
      { key: "information", isCurrent: false, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "curriculum", isCurrent: true, isCompleted: true, isAccessible: true, isLocked: false },
      { key: "content", isCurrent: false, isCompleted: false, isAccessible: true, isLocked: false },
      { key: "settings", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
      { key: "preview", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
      { key: "publish", isCurrent: false, isCompleted: false, isAccessible: false, isLocked: true },
    ]);
  });

  it("keeps Step 6 mapped to the real publish endpoint while removing the review workflow from the UI", () => {
    const apiSource = readFileSync(new URL("../src/features/admin/api/admin-activity.api.ts", import.meta.url), "utf8");
    const publishPageSource = readFileSync(new URL("../src/features/admin/pages/AdminActivityPublishPage.tsx", import.meta.url), "utf8");
    const previewPageSource = readFileSync(new URL("../src/features/admin/pages/AdminActivityPreviewPlaceholderPage.tsx", import.meta.url), "utf8");

    expect(apiSource).toContain("/digital-activities/${activityId}/submit-review");
    expect(apiSource).toContain("/digital-activities/${activityId}/publish");
    expect(apiSource).toContain("/digital-activities/${activityId}/publish-readiness");
    expect(publishPageSource).toContain("publishAdminDigitalActivity");
    expect(publishPageSource).toContain("getAdminDigitalActivityPublishReadiness");
    expect(publishPageSource).not.toContain("submitAdminDigitalActivityForReview");
    expect(publishPageSource).toContain("Status Aktiviti");
    expect(publishPageSource).toContain("Simpan sebagai Draf");
    expect(publishPageSource).toContain("Aktifkan Aktiviti");
    expect(publishPageSource).toContain("Semakan");
    expect(publishPageSource).toContain("getReadinessRows");
    expect(publishPageSource).toContain("getPrimaryReadinessMessage");
    expect(publishPageSource).toContain('queryKey: [...publishQueryKeys.activityDetail(activityId), "publish-readiness"] as const');
    expect(publishPageSource).toContain("const canActivate = Boolean(action) && Boolean(readiness.data?.ready) && !readiness.isLoading");
    expect(publishPageSource).toContain("Jumlah markah aktiviti belum sepadan dengan markah item yang disimpan.");
    expect(publishPageSource).toContain("Status Semasa");
    expect(publishPageSource).toContain("getAdminActivityTemplateLabel");
    expect(publishPageSource).toContain("getScoringModeLabel");
    expect(publishPageSource).toContain("Jumlah Markah");
    expect(publishPageSource).toContain('className="grid gap-3"');
    expect(publishPageSource).toContain('className="h-11 w-full rounded-xl px-5 font-semibold"');
    expect(publishPageSource).toContain('variant="success"');
    expect(publishPageSource).toContain("returnConfirmOpen");
    expect(publishPageSource).toContain("Kembali ke Pengurusan Aktiviti?");
    expect(publishPageSource).toContain("Perubahan yang belum disimpan akan hilang jika anda kembali ke Pengurusan Aktiviti. Adakah anda pasti mahu meneruskan?");
    expect(publishPageSource).toContain("Anda akan kembali ke Pengurusan Aktiviti. Adakah anda pasti mahu meneruskan?");
    expect(publishPageSource).toContain('variant="destructive"');
    expect(publishPageSource).toContain('navigate("/admin/aktiviti")');
    expect(publishPageSource).toContain('className="flex flex-col gap-3 border-t border-border pt-6 lg:flex-row lg:items-center lg:justify-between"');
    expect(publishPageSource).toContain('className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-none"');
    expect(publishPageSource).toContain('className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end"');
    expect(publishPageSource).not.toContain('<Link to="/admin/aktiviti">Kembali ke Pengurusan Aktiviti</Link>');
    expect(publishPageSource).not.toContain("Hantar untuk Semakan");
    expect(publishPageSource).not.toContain("Status Penerbitan");
    expect(publishPageSource).not.toContain("Semakan Kesediaan");
    expect(publishPageSource).not.toContain("Maklum Balas Segera");
    expect(publishPageSource).not.toContain("Benarkan Cuba Lagi");
    expect(publishPageSource).toContain('activeStep="publish"');
    expect(publishPageSource).toContain('publish: `/admin/aktiviti/${activityId}/cipta/terbitkan`');
    expect(publishPageSource).toContain("ConfirmDialog");
    expect(publishPageSource).toContain("lifecycleMutation.mutate()");
    expect(publishPageSource).not.toContain("void lifecycleMutation.mutateAsync()");
    expect(previewPageSource).toContain("const stepSixPath");
    expect(previewPageSource).toContain("publish: stepSixPath(activityId)");
  });

  it("keeps all official BM Pemulihan skills available from the real seed source in sequence order", () => {
    const seedSource = readFileSync(
      new URL("../../backend/src/data/curriculum/bm-pemulihan-2019.ts", import.meta.url),
      "utf8",
    );
    const skillMatches = [...seedSource.matchAll(/\{ code: "(KP(?:-PRA|\d{2}))", sequence: (\d+), name: "([^"]+)"/g)];
    const codes = skillMatches.map((match) => match[1]);

    expect(skillMatches).toHaveLength(33);
    expect(codes[0]).toBe("KP-PRA");
    expect(codes[1]).toBe("KP01");
    expect(codes.at(-1)).toBe("KP32");
    expect(seedSource).toContain('{ code: "KP-PRA", sequence: 0, name: "Prabacaan dan Pratulisan"');
    expect(seedSource).toContain('{ code: "KP32", sequence: 32, name: "Bacaan dan pemahaman"');
  });

  it("builds the curriculum-link payload from the required Step 2 selections only", () => {
    expect(buildActivityCurriculumLinkPayload({
      curriculumYearId: "11111111-1111-4111-8111-111111111111",
      remedialSkillId: "22222222-2222-4222-8222-222222222222",
      contentStandardId: "33333333-3333-4333-8333-333333333333",
      learningStandardId: "44444444-4444-4444-8444-444444444444",
    })).toEqual({
      curriculumYearId: "11111111-1111-4111-8111-111111111111",
      remedialSkillId: "22222222-2222-4222-8222-222222222222",
      contentStandardId: "33333333-3333-4333-8333-333333333333",
      learningStandardId: "44444444-4444-4444-8444-444444444444",
      isPrimary: true,
    });
  });

  it("derives mapped content standards, mapped learning standards, and a readable curriculum summary", () => {
    const contentStandards: AdminContentStandardOption[] = [
      {
        id: "content-1",
        programmeId: "programme-1",
        curriculumYearId: "year-1",
        code: "SK 1",
        title: "Bunyi Asas",
        description: null,
        domain: "READING",
        sequence: 1,
        status: "ACTIVE",
        year: { id: "year-1", yearLevel: 1, name: "Tahun 1", sequence: 1 },
      },
      {
        id: "content-2",
        programmeId: "programme-1",
        curriculumYearId: "year-2",
        code: "SK 2",
        title: "Suku Kata",
        description: null,
        domain: "READING",
        sequence: 2,
        status: "ACTIVE",
        year: { id: "year-2", yearLevel: 2, name: "Tahun 2", sequence: 2 },
      },
    ];

    const learningStandards: AdminLearningStandardOption[] = [
      {
        id: "learning-1",
        contentStandardId: "content-1",
        code: "SP 1",
        description: "Membaca bunyi asas",
        sequence: 1,
        status: "ACTIVE",
        contentStandard: { id: "content-1", code: "SK 1", title: "Bunyi Asas", domain: "READING" },
        year: { id: "year-1", yearLevel: 1, name: "Tahun 1", sequence: 1 },
        programme: { id: "programme-1", code: "BM-PEMULIHAN" },
      },
      {
        id: "learning-2",
        contentStandardId: "content-2",
        code: "SP 2",
        description: "Membaca suku kata",
        sequence: 2,
        status: "ACTIVE",
        contentStandard: { id: "content-2", code: "SK 2", title: "Suku Kata", domain: "READING" },
        year: { id: "year-2", yearLevel: 2, name: "Tahun 2", sequence: 2 },
        programme: { id: "programme-1", code: "BM-PEMULIHAN" },
      },
    ];

    const mappings: AdminSkillLearningStandardMapping[] = [
      {
        id: "mapping-1",
        remedialSkillId: "skill-1",
        learningStandardId: "learning-1",
        isPrimary: true,
        notes: null,
        learningStandard: { id: "learning-1", code: "SP 1", description: "Membaca bunyi asas", sequence: 1, status: "ACTIVE" },
        contentStandard: { id: "content-1", code: "SK 1", title: "Bunyi Asas", domain: "READING" },
        year: { id: "year-1", yearLevel: 1, name: "Tahun 1", sequence: 1 },
      },
    ];

    expect(deriveMappedContentStandards({
      contentStandards,
      mappings,
      curriculumYearId: "year-1",
    }).map((item) => item.id)).toEqual(["content-1"]);

    expect(deriveMappedLearningStandards({
      learningStandards,
      mappings,
      contentStandardId: "content-1",
    }).map((item) => item.id)).toEqual(["learning-1"]);

    expect(formatCurriculumSummary({
      year: { id: "year-1", programmeId: "programme-1", yearLevel: 1, name: "Tahun 1", sequence: 1, status: "ACTIVE" },
      skill: { id: "skill-1", programmeId: "programme-1", languageStructureId: "structure-1", code: "KP01", sequence: 1, name: "Huruf vokal", description: null, status: "ACTIVE", isPreparatory: false },
      contentStandard: contentStandards[0],
      learningStandard: learningStandards[0],
    })).toContain("Tahun 1");
  });

  it("keeps the Membaca gallery scoped to supported filters and responsive production layout", () => {
    const source = readFileSync(new URL("../src/features/admin/components/AdminReadingTemplateGallery.tsx", import.meta.url), "utf8");

    expect(source).toContain("space-y-6");
    expect(source).toContain("AvailableReadingTemplateCard");
    expect(source).toContain("grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3");
    expect(source).toContain("Thumbnail");
    expect(source).toContain("lg:border-l lg:border-border lg:pl-6");
    expect(source).toContain("h-12 w-full gap-2");
    expect(source).not.toContain("Tahun");
    expect(source).not.toContain("Kemahiran");
    expect(source).not.toContain("Tahap");
    expect(source).not.toContain("Math.random");
    expect(source).not.toContain("/media/upload");
    expect(source).not.toContain("/activity-templates/");
  });

  it("renders supported underline category tabs and compact filters only", () => {
    const markup = renderToStaticMarkup(
      <AdminActivityFilters
        query={{ page: 1, limit: 12, templateCategory: "READING", sortBy: "updatedAt", sortOrder: "desc" }}
        templates={sampleTemplates}
        onChange={() => undefined}
      />,
    );
    const source = readFileSync(new URL("../src/features/admin/components/AdminActivityManagement.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Cari nama aktiviti");
    expect(markup).toContain("Reset");
    expect(markup).toContain("Membaca");
    expect(markup).toContain("Menulis");
    expect(markup).not.toContain("Semua Aktiviti");
    expect(markup).not.toContain("Mengira");
    expect(source).toContain("border-b border-border bg-transparent p-0");
    expect(source).not.toContain("rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5");
    expect(source).toContain('placeholder="Semua templat"');
    expect(markup).not.toContain("Kemahiran");
    expect(markup).not.toContain("Tahun");
  });

  it("resets search filters without changing the selected activity category", () => {
    const reset = getAdminActivityResetQuery({
      page: 3,
      limit: 12,
      search: "suku kata",
      status: "DRAFT",
      activityTemplateId: "template-1",
      templateCategory: "WRITING",
      sortBy: "title",
      sortOrder: "asc",
    });

    expect(reset).toMatchObject({
      page: 1,
      search: undefined,
      status: undefined,
      activityTemplateId: undefined,
      templateCategory: "WRITING",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("renders real activity data with preview and edit actions", () => {
    const markup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Baca dan Susun");
    expect(markup).toContain("Mengecam suku kata");
    expect(markup).toContain("Tahun 2");
    expect(markup).toContain("Pratonton");
    expect(markup).toContain("Edit");
    expect(markup).toContain('href="/admin/aktiviti/activity-1/cipta/pratonton"');
    expect(markup).toContain('href="/admin/aktiviti/activity-1/cipta/maklumat"');
    expect(markup).not.toContain("Seret Suku Kata");
    expect(markup).not.toContain("Kategori");
    expect(markup).not.toContain("item tersedia");
    expect(markup).not.toContain("Tahap");
    expect(markup).not.toContain("Asas");
    expect(markup).not.toContain("Sederhana");
  });

  it("shows permanent delete only for draft activities", () => {
    const draftMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={{ ...sampleActivity, status: "DRAFT" }} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );
    const activeMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={sampleActivity} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );
    const archivedMarkup = renderWithProviders(
      <MemoryRouter>
        <AdminActivityCard activity={{ ...sampleActivity, status: "ARCHIVED" }} currentPage={1} pageSize={12} totalItems={24} onPageChange={() => undefined} />
      </MemoryRouter>,
    );

    expect(draftMarkup).toContain("Padam");
    expect(activeMarkup).not.toContain("Padam");
    expect(archivedMarkup).not.toContain("Padam");
  });

  it("renders summary cards without using paginated item counts as fake totals", () => {
    const summaryMarkup = renderToStaticMarkup(
      <AdminActivitySummarySection summary={sampleSummary} isLoading={false} />,
    );

    expect(summaryMarkup).toContain("24");
    expect(summaryMarkup).toContain("12");
    expect(summaryMarkup).toContain("8");
    expect(summaryMarkup).toContain("4");
    expect(summaryMarkup).toContain("bg-secondary/10");
    expect(summaryMarkup).toContain("bg-accent/10");
    expect(summaryMarkup).toContain("bg-muted");
    expect(sampleListResult.items).toHaveLength(1);
  });

  it("renders one concise activity result range without a duplicate count label", () => {
    const markup = renderToStaticMarkup(
      <AdminActivityResultsHeader
        meta={sampleListResult.meta}
        query={{ page: 1, limit: 12, templateCategory: "READING", sortBy: "updatedAt", sortOrder: "desc" }}
        onChange={() => undefined}
      />,
    );

    expect(getAdminActivityResultRange(sampleListResult.meta)).toBe("Menunjukkan 1-12 daripada 24 aktiviti");
    expect(markup).toContain("Menunjukkan 1-12 daripada 24 aktiviti");
    expect(markup).not.toContain(">24 aktiviti<");
    expect(getAdminActivityResultRange({ ...sampleListResult.meta, total: 0 })).toBe("0 aktiviti ditemui");
  });

  it("keeps empty and filtered-empty copy aligned with the admin activity page", () => {
    const pageSource = readFileSync(new URL("../src/features/admin/components/AdminActivityManagement.tsx", import.meta.url), "utf8");

    expect(pageSource).toContain("Tiada aktiviti lagi");
    expect(pageSource).toContain("Tiada aktiviti ditemui");
    expect(pageSource).toContain("Aktiviti tidak dapat dimuatkan");
  });

  it("maps Step 4 settings into the real narrow digital-activity PATCH payload", () => {
    expect(
      buildActivitySettingsUpdatePayload({
        estimatedMinutes: "15",
        hasTimeLimit: true,
        timeLimitMinutes: "7.5",
        attemptsAllowed: "3",
        allowRetry: true,
        shuffleItems: false,
        showImmediateFeedback: true,
        scoringMode: "MASTERY_THRESHOLD",
        totalMarks: "6",
        masteryThreshold: "80",
      }),
    ).toEqual({
      estimatedMinutes: 15,
      attemptsAllowed: 3,
      timeLimitSeconds: 450,
      shuffleItems: false,
      showImmediateFeedback: true,
      allowRetry: true,
      scoringMode: "MASTERY_THRESHOLD",
      totalMarks: 6,
      masteryThreshold: 80,
    });
  });

  it("hides retry, attempt-limit, and immediate-feedback settings for Seret Suku Kata while normalizing persisted payload values", () => {
    const templateSupport = getActivitySettingsTemplateSupport({
      template: {
        id: "template-arrange-syllables",
        code: "ARRANGE_SYLLABLES",
        name: "Seret Suku Kata",
        version: 1,
        rendererKey: "arrange-syllables",
        status: "ACTIVE",
        category: "READING",
      },
    } as never);

    expect(templateSupport).toEqual({
      retrySettings: false,
      attemptLimit: false,
      immediateFeedbackSetting: false,
      masteryThresholdSetting: false,
    });

    expect(
      buildActivitySettingsUpdatePayload({
        estimatedMinutes: "10",
        hasTimeLimit: false,
        timeLimitMinutes: "",
        attemptsAllowed: "1",
        allowRetry: false,
        shuffleItems: true,
        showImmediateFeedback: false,
        scoringMode: "TOTAL_SCORE",
        totalMarks: "100",
        masteryThreshold: "",
      }, templateSupport),
    ).toEqual({
      estimatedMinutes: 10,
      attemptsAllowed: null,
      timeLimitSeconds: null,
      shuffleItems: true,
      showImmediateFeedback: true,
      allowRetry: true,
      scoringMode: "TOTAL_SCORE",
      totalMarks: 100,
      masteryThreshold: null,
    });
  });

  it("keeps generic settings support available for non-Seret-Suku-Kata templates", () => {
    expect(getActivitySettingsTemplateSupport({
      template: {
        id: "template-1",
        code: "WORD_BUILDER",
        name: "Bina Perkataan",
        version: 1,
        rendererKey: "word-builder",
        status: "ACTIVE",
        category: "READING",
      },
    } as never)).toEqual({
      retrySettings: true,
      attemptLimit: true,
      immediateFeedbackSetting: true,
      masteryThresholdSetting: true,
    });
  });

  it("hydrates Step 4 settings from the real activity DTO fields", () => {
    expect(
      getActivitySettingsFormValues({
        estimatedMinutes: 20,
        timeLimitSeconds: 900,
        attemptsAllowed: 2,
        allowRetry: false,
        shuffleItems: true,
        showImmediateFeedback: false,
        scoringMode: "TOTAL_SCORE",
        totalMarks: 5,
        masteryThreshold: null,
      } as never),
    ).toEqual({
      estimatedMinutes: "20",
      hasTimeLimit: true,
      timeLimitMinutes: "15",
      attemptsAllowed: "2",
      allowRetry: false,
      shuffleItems: true,
      showImmediateFeedback: false,
      scoringMode: "TOTAL_SCORE",
      totalMarks: "5",
      masteryThreshold: "",
    });
  });

  it("detects legacy scoring mismatches so unchanged Step 4 settings can resync persisted item marks", () => {
    expect(getActivitySettingsScoringSyncState({
      scoringMode: "TOTAL_SCORE",
      totalMarks: 100,
      items: [{ id: "item-1", marks: 1 }, { id: "item-2", marks: 1 }],
    } as never)).toEqual({
      requiresResync: true,
      allocatedMarks: 2,
      expectedMarks: 100,
    });

    expect(getActivitySettingsScoringSyncState({
      scoringMode: "TOTAL_SCORE",
      totalMarks: 100,
      items: [{ id: "item-1", marks: 50 }, { id: "item-2", marks: 50 }],
    } as never)).toEqual({
      requiresResync: false,
      allocatedMarks: 100,
      expectedMarks: 100,
    });
  });

  it("only marks Step 4 settings as complete after draft content exists on the same activity", () => {
    expect(
      getActivitySettingsProgress({ hasDraft: true, hasCurriculumLink: true, hasContent: true }),
    ).toMatchObject({
      hasDraft: true,
      hasCurriculumLink: true,
      hasContent: true,
      hasSettings: false,
    });

    expect(getActivitySettingsProgress({ hasDraft: true, hasCurriculumLink: true, hasContent: false }).hasSettings).toBe(false);
    expect(getActivitySettingsProgress({
      hasDraft: true,
      hasCurriculumLink: true,
      hasContent: true,
      hasSettings: true,
    }).hasSettings).toBe(true);
  });

  it("keeps Step 4 scoring options aligned with the backend enum values", () => {
    expect(activityScoringModeOptions).toEqual([
      { value: "NONE", label: "Tanpa Pemarkahan" },
      { value: "TOTAL_SCORE", label: "Jumlah Markah" },
      { value: "PERCENTAGE", label: "Peratus" },
      { value: "MASTERY_THRESHOLD", label: "Ambang Penguasaan" },
    ]);
  });

  it("keeps the Step 4 and Step 5 wizard pages scoped to activity settings only", () => {
    const settingsPageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminActivitySettingsPage.tsx", import.meta.url),
      "utf8",
    );
    const previewPageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminActivityPreviewPlaceholderPage.tsx", import.meta.url),
      "utf8",
    );
    const settingsApiSource = readFileSync(
      new URL("../src/features/admin/api/admin-activity.api.ts", import.meta.url),
      "utf8",
    );

    expect(settingsPageSource).toContain("Tetapan Aktiviti");
    expect(settingsPageSource).toContain("Anggaran Masa");
    expect(settingsPageSource).toContain("templateSupport.attemptLimit");
    expect(settingsPageSource).toContain("Rawakkan Susunan Soalan");
    expect(settingsPageSource).toContain("templateSupport.immediateFeedbackSetting");
    expect(settingsPageSource).toContain("templateSupport.masteryThresholdSetting");
    expect(settingsPageSource).toContain("Mod Pemarkahan");
    expect(settingsPageSource).toContain("Tetapkan tempoh aktiviti untuk murid.");
    expect(settingsPageSource).toContain("Aktifkan untuk menetapkan tempoh maksimum murid menyelesaikan aktiviti.");
    expect(settingsPageSource).toContain("getActivitySettingsTemplateSupport");
    expect(settingsPageSource).toContain("templateSupport.retrySettings");
    expect(settingsPageSource).toContain("Susunan soalan akan dirawakkan semasa aktiviti dijalankan.");
    expect(settingsPageSource).toContain("Tetapkan bila murid menerima maklum balas.");
    expect(settingsPageSource).toContain("useActivityWizardStep");
    expect(settingsPageSource).toContain("MinimalToggle");
    expect(settingsPageSource).toContain("space-y-6");
    expect(settingsPageSource).not.toContain("xl:grid-cols-2");
    expect(settingsPageSource).not.toContain("{allowRetry ? (");
    expect(settingsPageSource).not.toContain("Semakan");
    expect(settingsPageSource).not.toContain("backend");
    expect(settingsPageSource).toContain("AdminActivityWizardStepFooter");
    expect(settingsPageSource).toContain("continueDestination: stepFivePath(activityId)");
    expect(settingsPageSource).toContain("cancelDestination: galleryPath");
    expect(settingsPageSource).toContain("Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini.");
    expect(settingsPageSource).toContain("queryClient.setQueryData");
    expect(settingsPageSource).toContain("getActivitySettingsScoringSyncState(activity.data)");
    expect(settingsPageSource).toContain("stepController.canSave || scoringSyncState.requiresResync");
    expect(settingsPageSource).toContain("settingsQueryKeys.publishReadiness(savedActivity.id)");
    expect(settingsPageSource).toContain("settingsQueryKeys.activityList");
    expect(settingsPageSource).toContain("settingsQueryKeys.activitySummary");
    expect(settingsPageSource).not.toContain("Tarikh Mula");
    expect(settingsPageSource).not.toContain("Tarikh Tamat");
    expect(settingsPageSource).not.toContain("Keutamaan Tugasan");
    expect(settingsPageSource).not.toContain("showResultsAfterCompletion");
    expect(settingsApiSource).toContain("updateAdminDigitalActivitySettings");
    expect(settingsApiSource).toContain('apiRequest<ActivityPayload>(`/digital-activities/${activityId}`, {');
    expect(settingsApiSource).toContain('method: "PATCH"');
    expect(previewPageSource).toContain("getAdminDigitalActivityPreview");
    expect(previewPageSource).toContain("getAdminDigitalActivity");
    expect(previewPageSource).toContain("updateAdminDigitalActivitySettings");
    expect(previewPageSource).toContain("previewMode");
    expect(previewPageSource).toContain("Kembali ke Tetapan");
    expect(previewPageSource).toContain("AdminActivityWizardStepFooter");
    expect(previewPageSource).toContain('showCancel={false}');
    expect(previewPageSource).toContain("continueDestination: stepSixPath(activityId)");
    expect(previewPageSource).toContain("buildActivitySettingsUpdatePayload");
    expect(previewPageSource).not.toContain("Mod Pratonton");
    expect(previewPageSource).not.toContain('<Badge variant="outline"');
    expect(previewPageSource).not.toContain("Cuba aktiviti seperti murid; percubaan, markah dan kemajuan tidak akan direkodkan.");
    expect(previewPageSource).not.toContain("Ringkasan Pratonton");
    expect(previewPageSource).not.toContain('label: "Status"');
    expect(previewPageSource).not.toContain('label: "Program"');
    expect(previewPageSource).not.toContain('label: "Versi Kurikulum"');
    expect(previewPageSource).not.toContain('label: "Item"');
    expect(previewPageSource).not.toContain('value: progress.hasSettings ? "Lengkap" : "Belum lengkap"');
    expect(previewPageSource).not.toContain("konfigurasi backend");
    expect(previewPageSource).not.toContain("placeholder selamat");
    expect(previewPageSource).not.toContain("Pratonton aktiviti akan disediakan dalam langkah seterusnya.");
  });

  it("uses an actionable Step 6 scoring blocker message instead of a stale raw mismatch warning", () => {
    const publishPageSource = readFileSync(
      new URL("../src/features/admin/pages/AdminActivityPublishPage.tsx", import.meta.url),
      "utf8",
    );

    expect(publishPageSource).toContain("Markah item belum sepadan dengan jumlah markah. Kembali ke Tetapan dan simpan semula tetapan pemarkahan.");
  });
});
