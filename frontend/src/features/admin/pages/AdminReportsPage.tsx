import { useQuery } from "@tanstack/react-query";

import { EmptyState, ErrorState, LoadingState, PageContainer, SectionCard } from "@/components/shared";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { apiRequest } from "@/lib/api";

const reportEndpoints = [
  { title: "Remedial Skill Report", endpoint: "/reports/remedial-skills" },
  { title: "Learning Standard Report", endpoint: "/reports/learning-standards" },
] as const;

export function AdminReportsPage() {
  const reports = useQuery({
    queryKey: ["admin", "reports", "overview"],
    queryFn: async () =>
      Promise.all(
        reportEndpoints.map(async (report) => ({
          ...report,
          data: await apiRequest<unknown>(report.endpoint),
        })),
      ),
    staleTime: 30_000,
  });

  return (
    <PageContainer>
      <AdminPageHeader title="Laporan" description="Paparan ringkas laporan Phase 24 yang mempunyai endpoint koleksi." />
      {reports.isLoading ? <LoadingState /> : null}
      {reports.isError ? <ErrorState title="Laporan gagal dimuatkan" description="Semak kebenaran atau cuba semula." /> : null}
      {reports.data?.length === 0 ? <EmptyState title="Tiada laporan tersedia." /> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {reports.data?.map((report) => (
          <SectionCard key={report.endpoint} title={report.title} description={report.endpoint}>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(report.data, null, 2)}
            </pre>
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  );
}
