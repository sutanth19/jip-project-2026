import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageContainer, PageHeader, Pagination, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { BuilderFilterBar } from "@/features/builder/components/BuilderFilterBar";
import { BuilderRecordTable } from "@/features/builder/components/BuilderRecordTable";
import { ActivityWizard } from "@/features/builder/components/ActivityWizard";
import { getBuilderEntity } from "@/features/builder/config";
import { useBuilderQueryState } from "@/features/builder/hooks/use-builder-query-state";
import { useBuilderRecords } from "@/features/builder/hooks/use-builder-records";
import type { BuilderEntityKey } from "@/features/builder/types/builder.types";
import { useAuthStore } from "@/stores/auth-store";

export function BuilderListPage({ entityKey }: { entityKey: BuilderEntityKey }) {
  const config = getBuilderEntity(entityKey);
  const role = useAuthStore((state) => state.role);
  const { query, updateQuery } = useBuilderQueryState();
  const records = useBuilderRecords(config, query);
  const canCreate = Boolean(role && config.supportsCreate && config.manageRoles.includes(role));

  return (
    <PageContainer>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canCreate ? (
            <Button asChild>
              <Link to={`${config.path}/create`}>
                <Plus className="size-4" aria-hidden="true" />
                Cipta {config.singular}
              </Link>
            </Button>
          ) : null
        }
      />
      {entityKey === "digitalActivities" ? (
        <SectionCard title="Wizard Aktiviti" description="Setiap langkah dipadankan dengan kontrak backend, dan pratonton menggunakan Activity Player sedia ada.">
          <ActivityWizard />
        </SectionCard>
      ) : null}
      <BuilderFilterBar config={config} query={query} onChange={updateQuery} />
      {records.isLoading ? <LoadingState /> : null}
      {records.isError ? <ErrorState title="Tidak dapat memuatkan data" actionLabel="Cuba lagi" onAction={() => void records.refetch()} /> : null}
      {records.data && records.data.items.length === 0 ? <EmptyState title="Belum ada rekod." description="Tiada data yang sepadan dengan penapis." /> : null}
      {records.data && records.data.items.length > 0 ? (
        <>
          <BuilderRecordTable config={config} rows={records.data.items} />
          <Pagination page={records.data.meta.page} totalPages={records.data.meta.totalPages} onPageChange={(page) => updateQuery({ page })} />
        </>
      ) : null}
      {config.unsupportedActions?.length ? (
        <SectionCard title="Had backend semasa">
          <ul className="space-y-2 text-sm text-muted-foreground">
            {config.unsupportedActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}

