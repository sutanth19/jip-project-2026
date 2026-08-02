import { useQuery } from "@tanstack/react-query";

import { EmptyState, ErrorState, LoadingState, PageContainer, PageHeader, SectionCard } from "@/components/shared";
import { BuilderRecordTable } from "@/features/builder/components/BuilderRecordTable";
import { useBuilderQueryState } from "@/features/builder/hooks/use-builder-query-state";
import type { BuilderEntityConfig } from "@/features/builder/types/builder.types";
import { listBuilderRecords } from "@/features/builder/api/builder.api";

type NestedKind = "years" | "remedialSkills" | "contentStandards" | "learningStandards" | "objectives";

const nestedMeta: Record<NestedKind, {
  title: string;
  description: string;
  parentKey: string;
  endpoint: (parentId: string) => string;
  columns: BuilderEntityConfig["columns"];
}> = {
  years: {
    title: "Tahun Kurikulum",
    description: "Endpoint sebenar: /curriculum/programmes/:programmeId/years",
    parentKey: "programmeId",
    endpoint: (id) => `/curriculum/programmes/${id}/years`,
    columns: [
      { key: "yearLevel", label: "Tahun" },
      { key: "name", label: "Nama" },
      { key: "sequence", label: "Turutan" },
      { key: "status", label: "Status", kind: "status" },
    ],
  },
  remedialSkills: {
    title: "Kemahiran Pemulihan",
    description: "Endpoint sebenar: /curriculum/programmes/:programmeId/remedial-skills",
    parentKey: "programmeId",
    endpoint: (id) => `/curriculum/programmes/${id}/remedial-skills`,
    columns: [
      { key: "code", label: "Kod" },
      { key: "name", label: "Nama" },
      { key: "sequence", label: "Turutan" },
      { key: "status", label: "Status", kind: "status" },
    ],
  },
  contentStandards: {
    title: "Standard Kandungan",
    description: "Endpoint sebenar: /curriculum/programmes/:programmeId/content-standards",
    parentKey: "programmeId",
    endpoint: (id) => `/curriculum/programmes/${id}/content-standards`,
    columns: [
      { key: "code", label: "Kod" },
      { key: "title", label: "Tajuk" },
      { key: "domain", label: "Domain" },
      { key: "status", label: "Status", kind: "status" },
    ],
  },
  learningStandards: {
    title: "Standard Pembelajaran",
    description: "Endpoint sebenar: /curriculum/content-standards/:contentStandardId/learning-standards",
    parentKey: "contentStandardId",
    endpoint: (id) => `/curriculum/content-standards/${id}/learning-standards`,
    columns: [
      { key: "code", label: "Kod" },
      { key: "description", label: "Penerangan" },
      { key: "sequence", label: "Turutan" },
      { key: "status", label: "Status", kind: "status" },
    ],
  },
  objectives: {
    title: "Objektif Pembelajaran",
    description: "Endpoint sebenar: /curriculum/remedial-skills/:skillId/objectives",
    parentKey: "remedialSkillId",
    endpoint: (id) => `/curriculum/remedial-skills/${id}/objectives`,
    columns: [
      { key: "code", label: "Kod" },
      { key: "description", label: "Penerangan" },
      { key: "sequence", label: "Turutan" },
      { key: "status", label: "Status", kind: "status" },
    ],
  },
};

export function CurriculumNestedPage({ kind }: { kind: NestedKind }) {
  const meta = nestedMeta[kind];
  const { query, searchParams } = useBuilderQueryState();
  const parentId = searchParams.get(meta.parentKey);
  const config: BuilderEntityConfig = {
    key: "curriculumVersions",
    title: meta.title,
    singular: meta.title,
    description: meta.description,
    path: `/curriculum/${kind}`,
    endpoint: parentId ? meta.endpoint(parentId) : "",
    roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"],
    manageRoles: ["SUPER_ADMIN", "ADMIN"],
    columns: meta.columns,
  };
  const records = useQuery({
    queryKey: ["builder", "curriculum", kind, parentId, query],
    queryFn: () => listBuilderRecords(config, query),
    enabled: Boolean(parentId),
  });

  return (
    <PageContainer>
      <PageHeader title={meta.title} description={meta.description} />
      {!parentId ? (
        <EmptyState title={`Parameter ${meta.parentKey} diperlukan.`} description="Backend menggunakan route nested. Masukkan parent ID melalui query string untuk melihat data sebenar." />
      ) : null}
      {records.isLoading ? <LoadingState /> : null}
      {records.isError ? <ErrorState title="Tidak dapat memuatkan data kurikulum" /> : null}
      {records.data && records.data.items.length === 0 ? <EmptyState title="Belum ada rekod." /> : null}
      {records.data && records.data.items.length > 0 ? <BuilderRecordTable config={config} rows={records.data.items} /> : null}
      <SectionCard title="Route parent-aware" description={`Gunakan ?${meta.parentKey}=... kerana backend tidak menyediakan endpoint koleksi global untuk halaman ini.`}>
        <code className="text-sm">{config.endpoint || meta.endpoint(`:${meta.parentKey}`)}</code>
      </SectionCard>
    </PageContainer>
  );
}

