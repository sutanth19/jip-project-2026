import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Link, MemoryRouter } from "react-router-dom";

import { EmptyState, ErrorState, ManagementPageLayout } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  AdminAccountDetailSkeleton,
  AdminAccountDetailView,
} from "@/features/admin/components/AdminAccountDetailView";
import { AdminAccountCreateForm } from "@/features/admin/components/AdminAccountCreateForm";
import {
  AdminAccountEditSkeleton,
  AdminAccountEditView,
} from "@/features/admin/components/AdminAccountEditForm";
import {
  adminAccountCreateFormSchema,
  adminCreateDefaultValues,
  buildAdminCreatePayload,
  getAdminCreateSummary,
  isAdminCreateSubmitEnabled,
  mapAdminCreateSubmissionError,
} from "@/features/admin/utils/admin-account-create";
import {
  adminAccountEditFormSchema,
  buildAdminUpdatePayload,
  getAdminEditChangedFieldSummary,
  getAdminEditDefaultValues,
  isAdminEditSaveEnabled,
  isValidMalaysianPhone,
  mapAdminEditSubmissionError,
} from "@/features/admin/utils/admin-account-edit";
import { AdminAccountMobileList, AdminAccountPagination, AdminAccountTable } from "@/features/admin/components/AdminAccountList";
import { AdminAccountStatusBadge } from "@/features/admin/components/AdminAccountStatusBadge";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminRecordDetails } from "@/features/admin/components/AdminRecordDetails";
import { AdminSetupStatusBadge } from "@/features/admin/components/AdminSetupStatusBadge";
import { toSearchParams } from "@/features/admin/api/admin.api";
import { adminEntities, getAdminEntity, unsupportedBackendCapabilities } from "@/features/admin/config";
import {
  canArchiveAdmin,
  canResendAdminSetup,
  containsUnsafeAdminDetailValue,
  getAdminLifecycleAction,
  normalizeAdminDetailRecord,
  type AdminAccountDetail,
} from "@/features/admin/utils/admin-account-detail";
import { mapAdminAccountListItem } from "@/features/admin/utils/admin-account-list";
import { warningActionColorClass } from "@/features/admin/utils/action-styles";
import { adminBadgeBaseClass, adminPageSizeOptions, adminStatusFilterOptions, getAdminPageSizeQuery } from "@/features/admin/utils/admin-status";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import { ApiError } from "@/lib/api";
import { normalizeListPayload } from "@/features/admin/utils/record";

const adminDetailDto: AdminAccountDetail = {
  id: "admin-detail-1",
  fullName: "Puan Kavitha",
  email: "kavitha@example.edu.my",
  phone: null,
  position: "IPG Administrator",
  avatar: null,
  accountStatus: "ACTIVE",
  setupStatus: "COMPLETED",
  isFirstLogin: false,
  lastLogin: null,
  createdAt: "2026-07-29T02:30:00.000Z",
  updatedAt: "2026-07-30T08:45:00.000Z",
};

function countOccurrences(value: string, search: string): number {
  return value.split(search).length - 1;
}

function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

const managementOuterClass = "mx-auto w-full max-w-7xl bg-background px-4 pb-6 pt-5 sm:px-6 lg:px-8";
const managementBreadcrumbClass = "flex min-h-9 flex-wrap items-center gap-2 text-sm";
const managementHeaderClass = "mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between";

function renderAdminDetailManagementPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Pentadbir", to: "/admin/pentadbir" },
          { label: "Butiran Pentadbir" },
        ]}
        title="Butiran Pentadbir"
        description="Lihat dan urus maklumat akaun pentadbir platform Digital MoLIB."
        actions={
          <>
            <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
              <Link to="/admin/pentadbir">Kembali</Link>
            </Button>
            <Button asChild className="h-11 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30 sm:w-auto">
              <Link to="/admin/pentadbir/admin-detail-1/edit">Edit Pentadbir</Link>
            </Button>
          </>
        }
      >
        <AdminAccountDetailView
          detail={adminDetailDto}
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </ManagementPageLayout>
    </MemoryRouter>,
  );
}

function renderAdminEditManagementPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Pentadbir", to: "/admin/pentadbir" },
          { label: "Butiran Pentadbir", to: "/admin/pentadbir/admin-detail-1" },
          { label: "Edit Pentadbir" },
        ]}
        title="Edit Pentadbir"
        description="Kemas kini maklumat asas dan hubungan pentadbir."
        actions={
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto">
            <Link to="/admin/pentadbir/admin-detail-1">Kembali</Link>
          </Button>
        }
      >
        <AdminAccountEditView
          detail={adminDetailDto}
          path="/admin/pentadbir"
          onSubmit={async () => undefined}
        />
      </ManagementPageLayout>
    </MemoryRouter>,
  );
}

function renderAdminCreateManagementPage() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ManagementPageLayout
        breadcrumb={[
          { label: "Home", to: "/admin" },
          { label: "Pentadbir", to: "/admin/pentadbir" },
          { label: "Tambah Pentadbir" },
        ]}
        title="Tambah Pentadbir"
        description="Cipta akaun pentadbir baharu."
        actions={
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-secondary/30 sm:w-auto">
            <Link to="/admin/pentadbir">Kembali</Link>
          </Button>
        }
        currentAccent="secondary"
      >
        <AdminAccountCreateForm path="/admin/pentadbir" onSubmit={async () => undefined} />
      </ManagementPageLayout>
    </MemoryRouter>,
  );
}

describe("Phase 27B Admin module contracts", () => {
  it("routes Super Admin and Admin into the Admin module while keeping other dashboards separate", () => {
    expect(getDashboardPathForRole("SUPER_ADMIN")).toBe("/admin");
    expect(getDashboardPathForRole("ADMIN")).toBe("/admin");
    expect(getDashboardPathForRole("TEACHER")).toBe("/guru");
    expect(getDashboardPathForRole("STUDENT")).toBe("/murid");
    expect(getDashboardPathForRole("PARENT")).toBe("/ibu-bapa");
  });

  it("documents real backend role restrictions for Admin account management", () => {
    const admins = getAdminEntity("admins");
    const schools = getAdminEntity("schools");

    expect(admins.roles).toEqual(["SUPER_ADMIN"]);
    expect(schools.roles).toEqual(["SUPER_ADMIN", "ADMIN"]);
    expect(adminEntities.some((entity) => entity.endpoint === "/admins")).toBe(true);
    expect(adminEntities.some((entity) => entity.endpoint === "/teachers")).toBe(true);
    expect(adminEntities.some((entity) => entity.endpoint === "/students")).toBe(true);
  });

  it("normalizes backend list DTO shapes without exposing raw Axios responses", () => {
    expect(
      normalizeListPayload({
        notifications: [{ id: "notification-1", title: "Hello" }],
        pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
      }),
    ).toEqual({
      items: [{ id: "notification-1", title: "Hello" }],
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
    });
  });

  it("filters sensitive values from Admin detail rendering", () => {
    const markup = renderToStaticMarkup(
      <AdminRecordDetails
        record={{
          id: "safe-id",
          fullName: "Pentadbir",
          passwordHash: "secret-hash",
          setupToken: "secret-token",
          pinHash: "secret-pin",
          geminiApiKey: "secret-key",
        }}
      />,
    );

    expect(markup).toContain("Pentadbir");
    expect(markup).not.toContain("secret-hash");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("secret-pin");
    expect(markup).not.toContain("secret-key");
  });

  it("keeps unsupported backend capabilities explicit instead of rendering fake controls", () => {
    expect(unsupportedBackendCapabilities.map((item) => item.feature)).toContain("System settings");
    expect(unsupportedBackendCapabilities.map((item) => item.feature)).toContain("PDF export");
    expect(unsupportedBackendCapabilities.map((item) => item.feature)).toContain("Excel export");
    expect(unsupportedBackendCapabilities.every((item) => item.supported === false)).toBe(true);
  });

  it("maps Admin list DTO direct fields without nested user guesses", () => {
    const item = mapAdminAccountListItem({
      id: "admin-1",
      fullName: "Siti Aminah",
      email: "siti@example.edu.my",
      phone: null,
      avatar: null,
      accountStatus: "ACTIVE",
      isFirstLogin: true,
      lastLogin: null,
    });

    expect(item.email).toBe("siti@example.edu.my");
    expect(item.accountStatus).toBe("ACTIVE");
    expect(item.phone).toBeNull();
    expect(item.isFirstLogin).toBe(true);
    expect(item.lastLogin).toBeNull();
  });

  it("renders Admin account desktop columns from supported DTO fields only", () => {
    const rows = [
      mapAdminAccountListItem({
        id: "admin-1",
        fullName: "Siti Aminah",
        email: "siti@example.edu.my",
        phone: null,
        accountStatus: "ACTIVE",
        isFirstLogin: true,
        lastLogin: null,
      }),
      mapAdminAccountListItem({
        id: "admin-2",
        fullName: "Ravi Kumar",
        email: "ravi@example.edu.my",
        phone: "+60123456789",
        accountStatus: "SUSPENDED",
        isFirstLogin: false,
        lastLogin: "2026-07-30T12:00:00.000Z",
      }),
    ];

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountTable rows={rows} path="/admin/pentadbir" />
      </MemoryRouter>,
    );

    expect(markup).toContain("Siti Aminah");
    expect(markup).toContain("siti@example.edu.my");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Digantung");
    expect(markup).toContain("Tidak dinyatakan");
    expect(markup).toContain("Menunggu");
    expect(markup).toContain("Selesai");
    expect(markup).toContain("Belum pernah");
    expect(markup).toContain("Lihat");
    expect(markup).not.toContain("Jawatan");
    expect(markup).not.toContain("Dicipta");
  });

  it("renders Admin account mobile cards with direct DTO values", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountMobileList
          path="/admin/pentadbir"
          rows={[
            mapAdminAccountListItem({
              id: "admin-1",
              fullName: "Nur Admin",
              email: "nur@example.edu.my",
              phone: "+60123456789",
              accountStatus: "ARCHIVED",
              isFirstLogin: false,
              lastLogin: null,
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Nur Admin");
    expect(markup).toContain("nur@example.edu.my");
    expect(markup).toContain("+60123456789");
    expect(markup).toContain("Diarkibkan");
    expect(markup).toContain("Selesai");
    expect(markup).toContain("Belum pernah");
  });

  it("builds server-side Admin list query params for search, status, and limit 10", () => {
    expect(toSearchParams({ page: 1, limit: 10, search: "aminah", status: "ACTIVE" })).toBe("?page=1&limit=10&search=aminah&status=ACTIVE");
  });

  it("renders Admin filter row without the removed heading", () => {
    const markup = renderToStaticMarkup(
      <AdminFilterBar
        config={getAdminEntity("admins")}
        query={{ page: 1, limit: 10 }}
        onChange={() => undefined}
        searchPlaceholder="Cari pentadbir mengikut nama, e-mel, telefon atau status."
        plain
        useAdminStatusSelect
      />,
    );

    expect(markup).toContain("Cari pentadbir mengikut nama, e-mel, telefon atau status.");
    expect(markup).toContain("Reset");
    expect(markup).toContain("mt-6");
    expect(markup).not.toContain("Carian dan penapis");
    expect(markup).not.toContain("rounded-lg border border-border bg-card p-3");
  });

  it("renders Admin pagination summary and disables boundary navigation", () => {
    const markup = renderToStaticMarkup(
      <AdminAccountPagination
        meta={{ page: 1, limit: 10, total: 22, totalPages: 3 }}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    );

    expect(markup).toContain("Menunjukkan 1-10 daripada 22 pentadbir");
    expect(markup).toContain("Baris setiap halaman");
    expect(markup).toContain("Sebelum");
    expect(markup).toContain("Seterus");
    expect(markup).toContain("disabled");
  });

  it("uses the semantic secondary button variant for Admin create actions", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <Button asChild variant="secondary">
          <a href="/admin/pentadbir/tambah" className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30">
            Tambah Pentadbir
          </a>
        </Button>
      </MemoryRouter>,
    );

    expect(markup).toContain('data-variant="secondary"');
    expect(markup).toContain("bg-secondary");
    expect(markup).toContain("text-secondary-foreground");
    expect(markup).toContain("h-12");
    expect(markup).toContain("rounded-xl");
    expect(markup).toContain("shadow-sm");
    expect(markup).toContain("hover:bg-secondary/90");
    expect(markup).toContain("focus-visible:ring-secondary/30");
    expect(markup).not.toContain("bg-emerald");
  });

  it("gives Admin status badges consistent sizing and status colour classes", () => {
    const active = renderToStaticMarkup(<AdminAccountStatusBadge status="ACTIVE" />);
    const pending = renderToStaticMarkup(<AdminAccountStatusBadge status="PENDING" />);
    const locked = renderToStaticMarkup(<AdminAccountStatusBadge status="LOCKED" />);

    expect(active).toContain(adminBadgeBaseClass);
    expect(pending).toContain(adminBadgeBaseClass);
    expect(locked).toContain(adminBadgeBaseClass);
    expect(active).toContain("shadow-sm");
    expect(active).toContain("bg-emerald-100");
    expect(active).toContain("border-emerald-300");
    expect(active).toContain("text-emerald-800");
    expect(active).toContain("dark:bg-emerald-400/10");
    expect(active).toContain("dark:border-emerald-400/25");
    expect(active).toContain("dark:text-emerald-300");
    expect(pending).toContain("bg-amber-100");
    expect(pending).toContain("border-amber-300");
    expect(pending).toContain("text-amber-800");
    expect(locked).toContain("bg-red-100");
    expect(locked).toContain("border-red-300");
    expect(locked).toContain("text-red-800");
  });

  it("gives Admin setup badges the same fixed shape", () => {
    const waiting = renderToStaticMarkup(<AdminSetupStatusBadge status="WAITING" />);
    const done = renderToStaticMarkup(<AdminSetupStatusBadge status="DONE" />);

    expect(waiting).toContain(adminBadgeBaseClass);
    expect(done).toContain(adminBadgeBaseClass);
    expect(waiting).toContain("bg-amber-100");
    expect(waiting).toContain("text-amber-800");
    expect(done).toContain("bg-emerald-100");
    expect(done).toContain("text-emerald-800");
  });

  it("defines all supported Admin status filter options", () => {
    expect(adminStatusFilterOptions.map((option) => option.value)).toEqual([
      "all",
      "ACTIVE",
      "PENDING",
      "SUSPENDED",
      "ARCHIVED",
      "LOCKED",
    ]);
    expect(adminStatusFilterOptions.map((option) => option.label)).toEqual([
      "Semua status",
      "Aktif",
      "Menunggu",
      "Digantung",
      "Diarkibkan",
      "Dikunci",
    ]);
  });

  it("defines Admin rows-per-page options and resets query page when changed", () => {
    expect(adminPageSizeOptions).toEqual([10, 20, 50]);
    expect(getAdminPageSizeQuery(20)).toEqual({ limit: 20, page: 1 });
    expect(toSearchParams({ ...getAdminPageSizeQuery(50), search: "siti" })).toBe("?limit=50&page=1&search=siti");
  });

  it("uses semantic table theme classes for the Admin list", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountTable
          path="/admin/pentadbir"
          rows={[
            mapAdminAccountListItem({
              id: "admin-1",
              fullName: "Tema Admin",
              email: "tema@example.edu.my",
              accountStatus: "ACTIVE",
              isFirstLogin: false,
              lastLogin: null,
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("bg-card");
    expect(markup).toContain("border-border");
    expect(markup).toContain("bg-muted/70");
    expect(markup).toContain("hover:bg-muted/35");
    expect(markup).toContain("text-muted-foreground");
  });

  it("uses a solid semantic primary button for Admin view actions", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountTable
          path="/admin/pentadbir"
          rows={[
            mapAdminAccountListItem({
              id: "admin-1",
              fullName: "Lihat Admin",
              email: "lihat@example.edu.my",
              accountStatus: "ACTIVE",
              isFirstLogin: false,
              lastLogin: null,
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("h-10");
    expect(markup).toContain("min-w-[96px]");
    expect(markup).toContain("gap-2");
    expect(markup).toContain("rounded-lg");
    expect(markup).toContain("bg-primary");
    expect(markup).toContain("px-4");
    expect(markup).toContain("font-semibold");
    expect(markup).toContain("text-primary-foreground");
    expect(markup).toContain("shadow-sm");
    expect(markup).toContain("hover:bg-primary/90");
    expect(markup).toContain("active:bg-primary/80");
    expect(markup).toContain("focus-visible:ring-primary/30");
    expect(markup).toContain("dark:bg-primary");
    expect(markup).toContain("dark:text-primary-foreground");
    expect(markup).toContain("dark:hover:bg-primary/90");
    expect(markup).not.toContain("variant=&quot;outline&quot;");
    expect(markup).not.toContain("border-primary/35");
    expect(markup).not.toContain("bg-primary/10");
    expect(markup).not.toContain("dark:text-blue-300");
  });

  it("links Admin list view actions to the correct detail route", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountTable
          path="/admin/pentadbir"
          rows={[
            mapAdminAccountListItem({
              id: "admin-route-1",
              fullName: "Route Admin",
              email: "route@example.edu.my",
              accountStatus: "ACTIVE",
              isFirstLogin: false,
              lastLogin: null,
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain('href="/admin/pentadbir/admin-route-1"');
    expect(markup).toContain("Lihat");
  });

  it("unwraps and maps the exact Admin detail DTO returned by the backend", () => {
    const detail = normalizeAdminDetailRecord({
      admin: {
        id: "admin-detail-1",
        userId: "internal-user-id",
        fullName: "Puan Kavitha",
        email: "kavitha@example.edu.my",
        phone: null,
        position: "IPG Administrator",
        avatar: null,
        schoolId: null,
        accountStatus: "ACTIVE",
        setupStatus: "COMPLETED",
        isFirstLogin: false,
        lastLogin: null,
        createdAt: "2026-07-29T02:30:00.000Z",
        updatedAt: "2026-07-30T08:45:00.000Z",
      },
    });

    expect(detail).toEqual(adminDetailDto);
  });

  it("renders the compact Admin detail page with real DTO fields and fallbacks", () => {
    const markup = renderAdminDetailManagementPage();

    expect(markup).toContain(managementOuterClass);
    expect(markup).toContain(managementBreadcrumbClass);
    expect(markup).toContain(managementHeaderClass);
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain('href="/admin/pentadbir"');
    expect(markup).toContain("Pentadbir");
    expect(markup).toContain("lucide-chevron-right");
    expect(markup).toContain("Butiran Pentadbir");
    expect(markup).toContain("Lihat dan urus maklumat akaun pentadbir platform Digital MoLIB.");
    expect(markup).toContain("Puan Kavitha");
    expect(markup).toContain("Pentadbir");
    expect(markup).toContain("kavitha@example.edu.my");
    expect(markup).toContain("Tidak tersedia");
    expect(markup).toContain("Aktif");
    expect(markup).toContain("Selesai");
    expect(markup).toContain("Belum pernah log masuk");
    expect(markup).toContain("Maklumat Akaun");
    expect(markup).toContain("Kawalan Akaun");
    expect(markup).toContain("Penyediaan Akaun");
    expect(markup).toContain("Zon Bahaya");
    expect(markup).toContain("Julai");
    expect(markup).not.toContain("Pentadbir Platform");
    expect(markup).not.toContain("Maklumat Pentadbir");
    expect(markup).not.toContain("Maklumat Sistem");
    expect(markup).not.toContain("Status Akaun");
    expect(visibleText(markup)).not.toContain("admin-detail-1");
    expect(markup).not.toContain("2026-07-29T02:30:00.000Z");
    expect(markup).not.toContain("2026-07-30T08:45:00.000Z");
    expect(markup).not.toContain("internal-user-id");
    expect(markup).not.toContain("{&quot;");
    expect(containsUnsafeAdminDetailValue(markup)).toBe(false);
  });

  it("removes repeated Admin detail fields from duplicate cards", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, phone: "+60123456789" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).not.toContain("Pentadbir Platform");
    expect(markup).not.toContain("Maklumat Pentadbir");
    expect(countOccurrences(markup, "kavitha@example.edu.my")).toBe(1);
    expect(countOccurrences(markup, "+60123456789")).toBe(1);
    expect(countOccurrences(markup, "Log masuk terakhir")).toBe(1);
    expect(countOccurrences(markup, "Aktif")).toBe(1);
    expect(countOccurrences(markup, "Selesai")).toBe(1);
    expect(countOccurrences(markup, "Tarikh dicipta")).toBe(1);
    expect(countOccurrences(markup, "Terakhir dikemas kini")).toBe(1);
    expect(visibleText(markup)).not.toContain("admin-detail-1");
  });

  it("keeps Maklumat Akaun limited to supported account fields", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={adminDetailDto}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Maklumat Akaun");
    expect(markup).toContain("E-mel");
    expect(markup).toContain("Nombor telefon");
    expect(markup).toContain("Tarikh dicipta");
    expect(markup).toContain("Terakhir dikemas kini");
    expect(markup).not.toContain("ID Akaun");
    expect(markup).not.toContain("Log masuk terakhir</dt>");
    expect(markup).not.toContain("Peranan");
    expect(markup).not.toContain("position");
  });

  it("aligns the Maklumat Akaun header and separates main and field icon colours", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={adminDetailDto}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("flex items-center gap-3");
    expect(markup).toContain("flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300");
    expect(markup).toContain("text-lg font-semibold leading-none text-foreground");
    expect(markup).toContain("flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300");
  });

  it("styles the Gantung Akaun action as a spaced amber warning button", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, accountStatus: "ACTIVE" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("space-y-6");
    expect(markup).toContain("Gantung Akaun");
    expect(markup).toContain(warningActionColorClass);
    expect(markup).toContain("h-11 w-full gap-2 rounded-xl px-5 font-semibold");
    expect(markup).not.toContain("h-12 w-full min-w-[220px]");
    expect(markup).not.toContain("min-w-[220px]");
    expect(markup).not.toContain("border-amber-300 bg-amber-50");
    expect(markup).not.toContain("hover:border-amber-400 hover:bg-amber-100");
    expect(markup).toContain("lucide-triangle-alert");
  });

  it("places setup status and resend action in the right-side responsive action group", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "PENDING" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between");
    expect(markup).toContain("flex w-full flex-col gap-3 sm:w-auto sm:items-end");
    expect(markup).toContain("Menunggu");
    expect(markup).toContain("Hantar Semula Setup");
    expect(markup).toContain("h-11 w-full gap-2 rounded-xl border-violet-300 bg-violet-50 px-5 font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300 dark:hover:bg-violet-400/15 sm:w-auto");
    expect(markup).toContain("lucide-refresh-cw");
  });

  it("keeps Zon Bahaya aligned horizontally on desktop without duplicate warning copy", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, accountStatus: "ACTIVE" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6");
    expect(markup).toContain("flex items-center gap-4");
    expect(markup).toContain("flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300");
    expect(markup).toContain("lucide-triangle-alert");
    expect(markup).toContain("Arkibkan akaun apabila pentadbir tidak lagi menggunakan sistem. Akses sistem akan disekat selepas akaun diarkibkan.");
    expect(countOccurrences(markup, "Akses sistem akan disekat selepas akaun diarkibkan.")).toBe(1);
  });

  it("keeps Admin detail navigation compact with one edit action", () => {
    const markup = renderAdminDetailManagementPage();

    expect(markup).toContain('href="/admin/pentadbir"');
    expect(markup).toContain("Kembali");
    expect(markup).toContain('href="/admin/pentadbir/admin-detail-1/edit"');
    expect(markup.match(/Edit Pentadbir/g)).toHaveLength(1);
    expect(markup).not.toContain("Kemas Kini");
  });

  it("shows Admin detail skeletons instead of dash placeholders while loading", () => {
    const markup = renderToStaticMarkup(<AdminAccountDetailSkeleton />);

    expect(markup).toContain("data-slot=\"skeleton\"");
    expect(markup).toContain("lg:grid-cols-12");
    expect(markup).not.toContain(">-<");
  });

  it("renders Admin detail fetch error and not-found states in Malay", () => {
    const errorMarkup = renderToStaticMarkup(
      <ErrorState
        title="Tidak dapat memuatkan maklumat pentadbir."
        description="Sila cuba semula atau semak kebenaran akaun."
        actionLabel="Cuba Semula"
        onAction={() => undefined}
      />,
    );
    const notFoundMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <EmptyState
          title="Pentadbir tidak ditemui."
          action={
            <Button asChild>
              <Link to="/admin/pentadbir">Kembali ke Senarai Pentadbir</Link>
            </Button>
          }
        />
      </MemoryRouter>,
    );

    expect(errorMarkup).toContain("Tidak dapat memuatkan maklumat pentadbir.");
    expect(errorMarkup).toContain("Cuba Semula");
    expect(notFoundMarkup).toContain("Pentadbir tidak ditemui.");
    expect(notFoundMarkup).toContain('href="/admin/pentadbir"');
    expect(notFoundMarkup).toContain("Kembali ke Senarai Pentadbir");
  });

  it("matches Admin detail lifecycle actions to backend-supported transitions", () => {
    expect(getAdminLifecycleAction("ACTIVE")?.targetStatus).toBe("SUSPENDED");
    expect(getAdminLifecycleAction("ACTIVE")?.label).toBe("Gantung Akaun");
    expect(getAdminLifecycleAction("SUSPENDED")?.targetStatus).toBe("ACTIVE");
    expect(getAdminLifecycleAction("PENDING")?.targetStatus).toBe("ACTIVE");
    expect(getAdminLifecycleAction("ARCHIVED")?.label).toBe("Pulihkan Akaun");
    expect(getAdminLifecycleAction("LOCKED")).toBeNull();
  });

  it("hides unsupported Admin detail actions by account and setup state", () => {
    expect(canResendAdminSetup({ ...adminDetailDto, setupStatus: "COMPLETED" })).toBe(false);
    expect(canResendAdminSetup({ ...adminDetailDto, setupStatus: "PENDING" })).toBe(true);
    expect(canResendAdminSetup({ ...adminDetailDto, accountStatus: "ARCHIVED", setupStatus: "PENDING" })).toBe(false);
    expect(canArchiveAdmin(adminDetailDto)).toBe(true);
    expect(canArchiveAdmin({ ...adminDetailDto, accountStatus: "ARCHIVED" })).toBe(false);
  });

  it("shows completed setup messaging without a resend action", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "COMPLETED" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Pentadbir ini telah melengkapkan penyediaan akaun.");
    expect(markup).not.toContain("Hantar Semula Setup");
    expect(markup).not.toContain("Tindakan hantar semula setup tidak tersedia untuk status akaun ini.");
  });

  it("shows resend setup for pending or expired setup when backend permits it", () => {
    const pendingMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "PENDING" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );
    const expiredMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "EXPIRED" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(pendingMarkup).toContain("Hantar Semula Setup");
    expect(expiredMarkup).toContain("Hantar Semula Setup");
  });

  it("shows development setup copy action only when developmentSetupUrl exists", () => {
    const withDevelopmentUrl = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "PENDING" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          developmentSetupUrl="http://localhost:5173/setup-password?token=development-token"
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onCopyDevelopmentSetupUrl={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );
    const withoutDevelopmentUrl = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, setupStatus: "PENDING" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(withDevelopmentUrl).toContain("Pautan setup pembangunan");
    expect(withDevelopmentUrl).toContain("Pembangunan Sahaja");
    expect(withDevelopmentUrl).toContain("Salin Pautan Setup");
    expect(withDevelopmentUrl).not.toContain("development-token");
    expect(withoutDevelopmentUrl).not.toContain("Pautan setup pembangunan");
    expect(withoutDevelopmentUrl).not.toContain("Salin Pautan Setup");
  });

  it("uses the real resend setup invitation status before showing delivery success", () => {
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");

    expect(page).toContain('invitationStatus === "SENT"');
    expect(page).toContain("setDevelopmentSetupUrl(getDevelopmentSetupUrl(result))");
    expect(page).toContain("navigator.clipboard.writeText(developmentSetupUrl)");
    expect(page).toContain("E-mel penyediaan tidak dapat dihantar. Sila cuba lagi.");
    expect(page).toContain('toast.success("Jemputan persediaan dihantar semula.")');
    expect(page).toContain('toast.error("E-mel penyediaan tidak dapat dihantar", "Sila cuba lagi.")');
  });

  it("shows a clear setup unavailable message for archived Admin accounts", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, accountStatus: "ARCHIVED", setupStatus: "ARCHIVED" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Penyediaan akaun tidak tersedia untuk akaun yang telah diarkibkan.");
    expect(markup).not.toContain("Hantar Semula Setup");
  });

  it("renders only the current supported Admin detail action and archive confirmation entry point", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, accountStatus: "ACTIVE", setupStatus: "PENDING" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Gantung Akaun");
    expect(markup).toContain("Hantar Semula Setup");
    expect(markup).toContain("Arkibkan Pentadbir");
    expect(markup).not.toContain("Aktifkan Akaun");
    expect(markup).not.toContain("Pulihkan Akaun");
  });

  it("renders restore in the status card and hides danger zone for archived Admin accounts", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountDetailView
          detail={{ ...adminDetailDto, accountStatus: "ARCHIVED", setupStatus: "ARCHIVED" }}
          path="/admin/pentadbir"
          statusPending={false}
          resendPending={false}
          onStatusChange={async () => true}
          onResendSetup={() => undefined}
          onArchive={async () => true}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Pulihkan Akaun");
    expect(markup).not.toContain("Arkibkan Pentadbir");
    expect(markup).not.toContain("Hantar Semula Setup");
  });

  it("keeps Admin detail responsive layout classes present", () => {
    const markup = renderAdminDetailManagementPage();

    expect(markup).toContain(managementOuterClass);
    expect(markup).toContain("space-y-6");
    expect(markup).toContain("lg:grid-cols-12");
    expect(markup).toContain("lg:col-span-8");
    expect(markup).toContain("lg:col-span-4");
    expect(markup).toContain("sm:flex-row");
  });

  it("renders the redesigned Admin edit page with breadcrumb, focused card, and semantic theme classes", () => {
    const markup = renderAdminEditManagementPage();

    expect(markup).toContain("Home");
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain('href="/admin/pentadbir"');
    expect(markup).toContain('href="/admin/pentadbir/admin-detail-1"');
    expect(markup).toContain("Butiran Pentadbir");
    expect(markup).toContain("Edit Pentadbir");
    expect(markup).toContain("Kemas kini maklumat asas dan hubungan pentadbir.");
    expect(markup).toContain(managementOuterClass);
    expect(markup).toContain("space-y-3");
    expect(markup).toContain(managementBreadcrumbClass);
    expect(markup).toContain(managementHeaderClass);
    expect(markup).toContain("mt-6");
    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl items-center gap-4");
    expect(markup).toContain("flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm");
    expect(markup).toContain("size-7");
    expect(markup).toContain("Maklumat ini digunakan untuk pengurusan dan komunikasi akaun.");
    expect(countOccurrences(markup, "Kembali")).toBe(1);
    expect(markup).not.toContain("max-w-3xl");
  });

  it("renders only backend-supported Admin edit fields with helpers and accessible input styling", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountEditView
          detail={{ ...adminDetailDto, phone: null }}
          path="/admin/pentadbir"
          onSubmit={async () => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Nama Penuh");
    expect(markup).toContain("E-mel");
    expect(markup).toContain("Nombor Telefon");
    expect(markup).toContain("Nama penuh pentadbir seperti dalam dokumen rasmi.");
    expect(markup).toContain("Alamat e-mel ini akan digunakan untuk log masuk dan komunikasi.");
    expect(markup).toContain("Nombor telefon untuk dihubungi apabila diperlukan.");
    expect(markup).toContain('autoComplete="name"');
    expect(markup).toContain('autoComplete="email"');
    expect(markup).toContain('autoComplete="tel"');
    expect(markup).toContain("relative w-full");
    expect(markup).toContain("h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground");
    expect(markup).not.toContain("position");
    expect(markup).not.toContain("avatar");
    expect(markup).not.toContain("schoolId");
    expect(markup).not.toContain("accountStatus");
    expect(markup).not.toContain("setupStatus");
    expect(markup).not.toContain("password");
  });

  it("keeps Admin edit save disabled initially and exposes responsive footer actions", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountEditView
          detail={adminDetailDto}
          path="/admin/pentadbir"
          onSubmit={async () => undefined}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Batal");
    expect(markup).toContain("Simpan Perubahan");
    expect(markup).toContain("w-full border-t border-border bg-muted/30 p-5 sm:p-6");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end");
    expect(markup).toContain("h-11 min-w-[180px] gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30 disabled:opacity-60");
    expect(markup).toContain("disabled=\"\"");
    expect(markup).toContain("lucide-save");
    expect(markup).not.toContain("Menyimpan...");
  });

  it("normalizes Admin edit defaults and sends only changed supported fields", () => {
    const defaults = getAdminEditDefaultValues({ ...adminDetailDto, phone: null });

    expect(defaults).toEqual({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "",
    });
    expect(
      buildAdminUpdatePayload(
        { ...defaults, fullName: " Puan Kavitha Devi ", email: "kavitha@example.edu.my", phone: "" },
        { fullName: true, email: true, phone: true },
        defaults,
      ),
    ).toEqual({ fullName: "Puan Kavitha Devi" });
    expect(
      buildAdminUpdatePayload(
        { ...defaults, phone: "" },
        { phone: true },
        { ...defaults, phone: "0123456789" },
      ),
    ).toEqual({ phone: null });
    expect(
      buildAdminUpdatePayload(
        { ...defaults, fullName: " Puan Kavitha " },
        { fullName: true },
        defaults,
      ),
    ).toEqual({});
  });

  it("uses backend-aligned Admin edit validation and dirty-state save gating", () => {
    expect(adminAccountEditFormSchema.safeParse({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "+60123456789",
    }).success).toBe(true);
    expect(adminAccountEditFormSchema.safeParse({
      fullName: "Pu",
      email: "not-email",
      phone: "123",
    }).success).toBe(false);
    expect(isValidMalaysianPhone("+60123456789")).toBe(true);
    expect(isValidMalaysianPhone("123")).toBe(false);
    expect(isAdminEditSaveEnabled({ isDirty: false, isValid: true, isSubmitting: false })).toBe(false);
    expect(isAdminEditSaveEnabled({ isDirty: true, isValid: false, isSubmitting: false })).toBe(false);
    expect(isAdminEditSaveEnabled({ isDirty: true, isValid: true, isSubmitting: true })).toBe(false);
    expect(isAdminEditSaveEnabled({ isDirty: true, isValid: true, isSubmitting: false })).toBe(true);
  });

  it("summarizes only changed Admin edit fields for save confirmation", () => {
    const defaults = {
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "0189988776",
    };
    const values = {
      fullName: "Puan Kavitha A.",
      email: "kavitha@example.edu.my",
      phone: "",
    };

    expect(
      getAdminEditChangedFieldSummary({
        payload: { fullName: "Puan Kavitha A.", phone: null },
        values,
        defaults,
      }),
    ).toEqual([
      {
        name: "fullName",
        label: "Nama penuh",
        before: "Puan Kavitha",
        after: "Puan Kavitha A.",
      },
      {
        name: "phone",
        label: "Nombor telefon",
        before: "0189988776",
        after: "Tidak tersedia",
      },
    ]);
  });

  it("maps Admin edit duplicate email and fallback errors safely", () => {
    expect(
      mapAdminEditSubmissionError(
        new ApiError("E-mel pentadbir telah digunakan.", 409, "ADMIN_EMAIL_EXISTS"),
      ),
    ).toEqual({
      field: "email",
      message: "Alamat e-mel ini telah digunakan oleh akaun lain.",
    });
    expect(mapAdminEditSubmissionError(new Error("raw failure"))).toEqual({
      message: "Maklumat tidak dapat disimpan. Sila cuba sekali lagi.",
    });
  });

  it("renders Admin edit skeletons instead of jumping empty form fields", () => {
    const markup = renderToStaticMarkup(<AdminAccountEditSkeleton />);

    expect(markup).toContain("data-slot=\"skeleton\"");
    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).not.toContain("max-w-7xl");
    expect(markup).not.toContain("max-w-3xl");
  });

  it("documents the real Admin edit route, update API, toast, and unsaved-change copy", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const form = readFileSync(new URL("../src/features/admin/components/AdminAccountEditForm.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "pentadbir/:id/edit"');
    expect(routes).toContain('<RequireRole roles={["SUPER_ADMIN"]}><AdminEntityFormPage entityKey="admins" mode="edit" /></RequireRole>');
    expect(api).toContain("updateAdminRecord");
    expect(api).toContain('method: "PATCH"');
    expect(api).toContain("`${config.endpoint}/${id}`");
    expect(page).toContain('toast.success("Maklumat pentadbir berjaya dikemas kini.")');
    expect(page).toContain("normalizeAdminDetailRecord(updated)");
    expect(form).toContain("Buang perubahan?");
    expect(form).toContain("Perubahan yang belum disimpan akan hilang.");
    expect(form).toContain("Terus Mengedit");
    expect(form).toContain("Buang Perubahan");
    expect(form).toContain("Simpan perubahan?");
    expect(form).toContain("Pastikan maklumat pentadbir yang dikemas kini adalah betul sebelum disimpan.");
    expect(form).toContain("Sahkan dan Simpan");
    expect(form).toContain("Menyimpan...");
    expect(form).toContain("buildAdminUpdatePayload(values, form.formState.dirtyFields, defaults)");
    expect(form).toContain("setConfirmOpen(true)");
    expect(form).toContain("await onSubmit(pendingPayload)");
    expect(form).not.toContain("await onSubmit(payload)");
  });

  it("renders Tambah Pentadbir with the same full-width form pattern as Edit Pentadbir", () => {
    const markup = renderAdminCreateManagementPage();

    expect(markup).toContain("Home");
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain('href="/admin/pentadbir"');
    expect(markup).toContain("Tambah Pentadbir");
    expect(markup).toContain("Cipta akaun pentadbir baharu.");
    expect(markup).toContain(managementOuterClass);
    expect(markup).toContain("space-y-3");
    expect(markup).toContain(managementBreadcrumbClass);
    expect(markup).toContain(managementHeaderClass);
    expect(markup).toContain("mt-6");
    expect(markup).toContain("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl items-center gap-4");
    expect(markup).toContain("flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm");
    expect(markup).toContain("size-7");
    expect(countOccurrences(markup, "Maklumat Akaun")).toBe(1);
    expect(markup).not.toContain("max-w-3xl");
  });

  it("keeps Tambah and Edit Pentadbir spacing, card sizing, fields, and footer aligned", () => {
    const createMarkup = renderAdminCreateManagementPage();
    const editMarkup = renderAdminEditManagementPage();
    const sharedClasses = [
      managementOuterClass,
      "space-y-3",
      managementBreadcrumbClass,
      managementHeaderClass,
      "mt-6",
      "text-3xl font-bold tracking-tight text-foreground",
      "mt-2 text-base text-muted-foreground",
      "h-11 w-full gap-2 rounded-xl px-5",
      "w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
      "mx-auto flex w-full max-w-5xl items-center gap-4",
      "flex size-14 shrink-0 items-center justify-center rounded-2xl",
      "text-xl font-semibold text-foreground",
      "mt-1 text-sm text-muted-foreground",
      "space-y-6 p-5 sm:p-6",
      "w-full space-y-2",
      "h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground",
      "w-full border-t border-border bg-muted/30 p-5 sm:p-6",
      "mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end",
      "h-11 rounded-xl px-5",
    ];

    sharedClasses.forEach((className) => {
      expect(createMarkup).toContain(className);
      expect(editMarkup).toContain(className);
    });
    expect(createMarkup).toContain("bg-secondary text-secondary-foreground");
    expect(editMarkup).toContain("bg-primary text-primary-foreground");
  });

  it("keeps Add and Edit Admin form pages free of duplicated large top-gap classes", () => {
    const createForm = readFileSync(new URL("../src/features/admin/components/AdminAccountCreateForm.tsx", import.meta.url), "utf8");
    const editForm = readFileSync(new URL("../src/features/admin/components/AdminAccountEditForm.tsx", import.meta.url), "utf8");
    const formPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const detailPage = readFileSync(new URL("../src/features/admin/pages/AdminEntityDetailPage.tsx", import.meta.url), "utf8");
    const managementLayout = readFileSync(new URL("../src/components/shared/ManagementPageLayout.tsx", import.meta.url), "utf8");
    const combined = `${createForm}\n${editForm}`;

    expect(managementLayout).toContain("mx-auto w-full max-w-7xl bg-background px-4 pb-6 pt-5 sm:px-6 lg:px-8");
    expect(managementLayout).toContain("flex min-h-9 flex-wrap items-center gap-2 text-sm");
    expect(managementLayout).toContain("mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between");
    expect(countOccurrences(formPage, "adminManagementPageContainerClass")).toBe(5);
    expect(detailPage).toContain("adminManagementPageContainerClass");
    expect(formPage).toContain('"px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0"');
    expect(detailPage).toContain('"px-0 py-0 sm:px-0 sm:py-0 lg:px-0 lg:py-0"');
    expect(combined).not.toContain("space-y-4 pt-5");
    expect(combined).not.toContain("px-4 pb-6 pt-0 sm:px-6 lg:px-8");
    expect(combined).not.toContain("pt-4 sm:pt-5");
    expect(combined).not.toContain("mt-8");
    expect(combined).not.toContain("mt-10");
    expect(combined).not.toContain("pt-8");
    expect(combined).not.toContain("py-8");
  });

  it("renders the compact create notice and empty supported Admin create fields", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountCreateForm path="/admin/pentadbir" onSubmit={async () => undefined} />
      </MemoryRouter>,
    );

    expect(markup).toContain("Akaun menunggu penyediaan");
    expect(markup).toContain("Akaun akan dicipta dalam status menunggu. Pentadbir baharu perlu melengkapkan proses penyediaan akaun sebelum boleh log masuk.");
    expect(markup).toContain("mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6");
    expect(markup).toContain("mx-auto flex w-full max-w-5xl items-start gap-3");
    expect(markup).toContain("flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary");
    expect(markup).toContain("Nama Penuh");
    expect(markup).toContain("E-mel");
    expect(markup).toContain("Nombor Telefon");
    expect(adminCreateDefaultValues).toEqual({
      fullName: "",
      email: "",
      phone: "",
    });
    expect(markup).toContain("relative w-full");
    expect(markup).toContain("h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground");
    expect(markup).not.toContain("position");
    expect(markup).not.toContain("avatar");
    expect(markup).not.toContain("schoolId");
    expect(markup).not.toContain("password");
    expect(markup).not.toContain("accountStatus");
    expect(markup).not.toContain("setupStatus");
  });

  it("styles Tambah Pentadbir create actions with secondary green and confirmation copy", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AdminAccountCreateForm path="/admin/pentadbir" onSubmit={async () => undefined} />
      </MemoryRouter>,
    );
    const form = readFileSync(new URL("../src/features/admin/components/AdminAccountCreateForm.tsx", import.meta.url), "utf8");

    expect(markup).toContain("Cipta Pentadbir");
    expect(markup).toContain("h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60");
    expect(markup).toContain("disabled=\"\"");
    expect(form).toContain("Cipta akaun pentadbir?");
    expect(form).toContain("Akaun baharu akan dicipta dalam status menunggu. Pentadbir perlu melengkapkan proses penyediaan sebelum boleh log masuk.");
    expect(form).toContain("Sahkan dan Cipta");
    expect(form).toContain("Mencipta...");
    expect(form).toContain("Buang maklumat yang dimasukkan?");
    expect(form).toContain("Terus Mengisi");
    expect(form).toContain("Buang Maklumat");
    expect(form).toContain("setConfirmOpen(true)");
    expect(form).toContain("await onSubmit(pendingPayload)");
  });

  it("validates Admin create values and filters the create payload to visible supported fields", () => {
    expect(adminAccountCreateFormSchema.safeParse({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "+60123456789",
    }).success).toBe(true);
    expect(adminAccountCreateFormSchema.safeParse({
      fullName: "Pu",
      email: "not-email",
      phone: "123",
    }).success).toBe(false);
    expect(buildAdminCreatePayload({
      fullName: " Puan Kavitha ",
      email: " kavitha@example.edu.my ",
      phone: "",
    })).toEqual({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
    });
    expect(buildAdminCreatePayload({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "0189988776",
    })).toEqual({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "0189988776",
    });
    expect(isAdminCreateSubmitEnabled({ isValid: false, isSubmitting: false })).toBe(false);
    expect(isAdminCreateSubmitEnabled({ isValid: true, isSubmitting: true })).toBe(false);
    expect(isAdminCreateSubmitEnabled({ isValid: true, isSubmitting: false })).toBe(true);
  });

  it("summarizes Admin create confirmation values without internal field names", () => {
    expect(getAdminCreateSummary({
      fullName: "Puan Kavitha",
      email: "kavitha@example.edu.my",
      phone: "",
    })).toEqual([
      {
        name: "fullName",
        label: "Nama penuh",
        value: "Puan Kavitha",
      },
      {
        name: "email",
        label: "E-mel",
        value: "kavitha@example.edu.my",
      },
      {
        name: "phone",
        label: "Nombor telefon",
        value: "Tidak tersedia",
      },
    ]);
  });

  it("maps Admin create duplicate and authorization failures safely", () => {
    expect(
      mapAdminCreateSubmissionError(
        new ApiError("E-mel pentadbir telah digunakan.", 409, "ADMIN_EMAIL_EXISTS"),
      ),
    ).toEqual({
      field: "email",
      message: "Alamat e-mel ini telah digunakan oleh akaun lain.",
    });
    expect(
      mapAdminCreateSubmissionError(
        new ApiError("Forbidden", 403, "AUTH_ROLE_FORBIDDEN"),
      ),
    ).toEqual({
      message: "Anda tidak mempunyai kebenaran untuk mencipta akaun pentadbir.",
    });
    expect(mapAdminCreateSubmissionError(new Error("raw failure"))).toEqual({
      message: "Akaun pentadbir tidak dapat dicipta. Sila cuba sekali lagi.",
    });
  });

  it("documents the real Admin create route, create API, success toast, and invitation handling", () => {
    const routes = readFileSync(new URL("../src/routes/index.tsx", import.meta.url), "utf8");
    const api = readFileSync(new URL("../src/features/admin/api/admin.api.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../src/features/admin/pages/AdminEntityFormPage.tsx", import.meta.url), "utf8");
    const form = readFileSync(new URL("../src/features/admin/components/AdminAccountCreateForm.tsx", import.meta.url), "utf8");

    expect(routes).toContain('path: "pentadbir/tambah"');
    expect(routes).toContain('<RequireRole roles={["SUPER_ADMIN"]}><AdminEntityFormPage entityKey="admins" mode="create" /></RequireRole>');
    expect(api).toContain("createAdminRecord");
    expect(api).toContain('method: "POST"');
    expect(api).toContain("apiRequest<AdminRecord>(config.endpoint");
    expect(page).toContain("createMutation.mutateAsync(payload)");
    expect(page).toContain('toast.success("Pentadbir berjaya dicipta.", invitationDescription)');
    expect(page).toContain('const invitationSent = invitationStatus === "SENT"');
    expect(page).toContain("getDevelopmentSetupUrl(created as Record<string, unknown>)");
    expect(page).toContain("developmentSetupUrl");
    expect(page).toContain("Pentadbir berjaya dicipta dan e-mel penyediaan telah dihantar.");
    expect(page).toContain("Pentadbir berjaya dicipta, tetapi e-mel penyediaan tidak dapat dihantar.");
    expect(routes).toContain('path: "setup-password"');
    expect(routes).toContain("<SetupPasswordPage />");
    expect(page).toContain("navigate(`${config.path}/${createdId}`, { replace: true })");
    expect(form).toContain("buildAdminCreatePayload(values)");
    expect(form).toContain("Pautan setup pembangunan");
    expect(form).toContain("Pembangunan Sahaja");
    expect(form).toContain("Salin Pautan Setup");
    expect(form).toContain("Buka Pautan Setup");
    expect(form).toContain("navigator.clipboard.writeText(successResult.developmentSetupUrl)");
    expect(form).toContain('window.open(successResult.developmentSetupUrl, "_blank", "noopener,noreferrer")');
    expect(form).not.toContain("localStorage");
    expect(form).not.toContain("await onSubmit(payload)");
  });

  it("maps protected dashboard theme tokens to Digital MoLIB brand colours", () => {
    const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

    expect(css).toContain("--primary: #2563eb;");
    expect(css).toContain("--primary-foreground: #ffffff;");
    expect(css).toContain("--secondary: #10b981;");
    expect(css).toContain("--secondary-foreground: #ffffff;");
    expect(css).toContain("--accent: #f59e0b;");
    expect(css).toContain("--ring: #2563eb;");
    expect(css).toContain("--destructive-foreground: #ffffff;");
    expect(css).toContain("--foreground: #f8fafc;");
    expect(css).toContain("--card: #1e293b;");
    expect(css).toContain("--card-foreground: #f8fafc;");
    expect(css).toContain("--primary: #3b82f6;");
    expect(css).toContain("--primary-foreground: #ffffff;");
    expect(css).toContain("--secondary: #10b981;");
    expect(css).toContain("--accent: #f59e0b;");
    expect(css).toContain("--muted: #111827;");
    expect(css).toContain("--border: #334155;");
    expect(css).toContain("--input: #334155;");
    expect(css).toContain("--ring: #60a5fa;");
  });
});
