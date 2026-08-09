import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageContainer, Pagination } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  AdminAccountMobileList,
  AdminAccountPagination,
  AdminAccountTable,
} from "@/features/admin/components/AdminAccountList";
import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminRecordTable } from "@/features/admin/components/AdminRecordTable";
import { AdminUnsupportedNotice } from "@/features/admin/components/AdminUnsupportedNotice";
import { SchoolListContent } from "@/features/admin/components/SchoolList";
import { TeacherListContent } from "@/features/admin/components/TeacherList";
import { getAdminEntity, unsupportedBackendCapabilities } from "@/features/admin/config";
import { useAdminQueryState } from "@/features/admin/hooks/use-admin-query-state";
import { useAdminRecords } from "@/features/admin/hooks/use-admin-records";
import type { AdminEntityKey } from "@/features/admin/types/admin.types";
import { mapAdminAccountListItem } from "@/features/admin/utils/admin-account-list";
import { getAdminPageSizeQuery } from "@/features/admin/utils/admin-status";
import { useAuthStore } from "@/stores/auth-store";

export function AdminEntityListPage({ entityKey }: { entityKey: AdminEntityKey }) {
  const config = getAdminEntity(entityKey);
  const role = useAuthStore((state) => state.role);
  const { query, updateQuery } = useAdminQueryState();
  const records = useAdminRecords(config, query);
  const canCreate = Boolean(config.create && role && config.roles.includes(role));
  const isAdminAccounts = entityKey === "admins";
  const hasSearch = Boolean(query.search?.trim());
  const adminRows = isAdminAccounts ? records.data?.items.map(mapAdminAccountListItem) ?? [] : [];

  if (entityKey === "schools") {
    return (
      <PageContainer>
        <AdminPageHeader
          title="Pengurusan Sekolah"
          description="Urus maklumat dan status sekolah yang menggunakan platform DIGITAL MAIN-LiT."
          actions={
            canCreate ? (
              <Button asChild variant="secondary">
                <Link
                  to={`${config.path}/tambah`}
                  className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Sekolah
                </Link>
              </Button>
            ) : null
          }
        />

        <SchoolListContent
          rows={records.data?.items ?? []}
          meta={records.data?.meta ?? { page: query.page ?? 1, limit: query.limit ?? 10, total: 0, totalPages: 1 }}
          query={query}
          path={config.path}
          isLoading={records.isLoading}
          isError={records.isError}
          error={records.error}
          canCreate={canCreate}
          onQueryChange={updateQuery}
          onRetry={() => void records.refetch()}
        />
      </PageContainer>
    );
  }

  if (entityKey === "teachers") {
    return (
      <PageContainer>
        <AdminPageHeader
          title="Guru"
          description="Urus akaun guru yang menggunakan platform DIGITAL MAIN-LiT."
          actions={
            canCreate ? (
              <Button asChild variant="secondary">
                <Link
                  to={`${config.path}/tambah`}
                  className="h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Tambah Guru
                </Link>
              </Button>
            ) : null
          }
        />

        <TeacherListContent
          rows={records.data?.items ?? []}
          meta={records.data?.meta ?? { page: query.page ?? 1, limit: query.limit ?? 10, total: 0, totalPages: 1 }}
          query={query}
          path={config.path}
          isLoading={records.isLoading}
          isError={records.isError}
          error={records.error}
          canCreate={canCreate}
          onQueryChange={updateQuery}
          onRetry={() => void records.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminPageHeader
        title={isAdminAccounts ? "Pentadbir" : config.title}
        description={isAdminAccounts ? "Urus akaun pentadbir platform DIGITAL MAIN-LiT." : config.description}
        actions={
          canCreate ? (
            <Button asChild variant="secondary">
              <Link
                to={`${config.path}/tambah`}
                className={isAdminAccounts ? "h-12 rounded-xl px-6 font-semibold shadow-sm hover:bg-secondary/90 focus-visible:ring-secondary/30" : undefined}
              >
                <Plus className="size-4" aria-hidden="true" />
                Tambah {config.singular}
              </Link>
            </Button>
          ) : null
        }
      />

      <AdminFilterBar
        config={config}
        query={query}
        onChange={updateQuery}
        searchPlaceholder={isAdminAccounts ? "Cari pentadbir mengikut nama, e-mel, telefon atau status." : undefined}
        plain={isAdminAccounts}
        useAdminStatusSelect={isAdminAccounts}
      />

      {records.isLoading ? <LoadingState /> : null}
      {records.isError ? (
        <ErrorState
          title="Tidak dapat memuatkan data"
          description="Sila cuba lagi."
          actionLabel="Cuba lagi"
          onAction={() => void records.refetch()}
        />
      ) : null}

      {records.data && records.data.items.length === 0 ? (
        <EmptyState
          title={isAdminAccounts ? (hasSearch ? "Tiada pentadbir yang sepadan dengan carian." : "Belum ada pentadbir.") : hasSearch ? "Tiada hasil carian." : "Belum ada rekod."}
          description={isAdminAccounts ? undefined : hasSearch ? "Sila ubah kata kunci carian atau tetapan penapis." : "Tiada data yang sepadan dengan penapis."}
        />
      ) : null}

      {records.data && records.data.items.length > 0 && !isAdminAccounts ? (
        <>
          <AdminRecordTable config={config} rows={records.data.items} />
          <Pagination
            page={records.data.meta.page}
            totalPages={records.data.meta.totalPages}
            onPageChange={(page) => updateQuery({ page })}
          />
        </>
      ) : null}

      {records.data && records.data.items.length > 0 && isAdminAccounts ? (
        <>
          <AdminAccountTable rows={adminRows} path={config.path} />
          <AdminAccountMobileList rows={adminRows} path={config.path} />
          <AdminAccountPagination
            meta={records.data.meta}
            onPageChange={(page) => updateQuery({ page })}
            onPageSizeChange={(limit) => updateQuery(getAdminPageSizeQuery(limit))}
          />
        </>
      ) : null}

      {config.unsupportedActions?.length ? (
        <AdminUnsupportedNotice
          items={config.unsupportedActions.map((note) => ({
            feature: config.singular,
            supported: false,
            note,
          }))}
        />
      ) : null}
      {entityKey === "aiOutputs" ? (
        <AdminUnsupportedNotice items={unsupportedBackendCapabilities.filter((item) => item.feature.includes("AI"))} />
      ) : null}
    </PageContainer>
  );
}
