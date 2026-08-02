import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, Building2, ClipboardList, ShieldCheck, Users } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageContainer, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { getAdminDashboard } from "@/features/admin/api/dashboard.api";
import { adminEntities, unsupportedBackendCapabilities } from "@/features/admin/config";
import { AdminMetricCard } from "@/features/admin/components/AdminMetricCard";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminUnsupportedNotice } from "@/features/admin/components/AdminUnsupportedNotice";
import { useAuthStore } from "@/stores/auth-store";
import { stringifyValue } from "@/features/admin/utils/record";

function collectMetrics(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")
    .slice(0, 12);
}

function collectSections(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => typeof value === "object" && value !== null)
    .slice(0, 4);
}

export function AdminDashboardPage() {
  const role = useAuthStore((state) => state.role);
  const dashboardRole = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";
  const query = useQuery({
    queryKey: ["admin", "dashboard", dashboardRole],
    queryFn: () => getAdminDashboard(dashboardRole),
    enabled: role === "SUPER_ADMIN" || role === "ADMIN",
    staleTime: 30_000,
  });

  const metrics = query.data ? collectMetrics(query.data) : [];
  const sections = query.data ? collectSections(query.data) : [];

  return (
    <PageContainer>
      <AdminPageHeader
        title="Admin"
        description="Paparan pentadbiran menggunakan data sebenar daripada dashboard backend."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/audit">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Audit Log
            </Link>
          </Button>
        }
      />

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <ErrorState title="Dashboard gagal dimuatkan" description="Sila cuba semula." actionLabel="Cuba lagi" onAction={() => void query.refetch()} />
      ) : null}

      {query.data && metrics.length === 0 ? (
        <EmptyState title="Tiada metrik dashboard" description="Endpoint dashboard tidak memulangkan nombor ringkasan untuk peranan ini." />
      ) : null}

      {metrics.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([key, value]) => (
            <AdminMetricCard key={key} title={key} value={stringifyValue(value)} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Akses pantas" description="Modul Admin yang disokong oleh backend semasa.">
          <div className="grid gap-2 sm:grid-cols-2">
            {adminEntities.slice(0, 10).map((entity) => (
              <Button key={entity.key} asChild variant="outline" className="justify-start">
                <Link to={entity.path}>
                  {entity.key === "schools" ? <Building2 className="size-4" /> : null}
                  {entity.key === "students" || entity.key === "teachers" || entity.key === "parents" ? <Users className="size-4" /> : null}
                  {entity.key === "assignments" ? <ClipboardList className="size-4" /> : null}
                  {entity.title}
                </Link>
              </Button>
            ))}
          </div>
        </SectionCard>

        {sections.map(([key, value]) => (
          <SectionCard key={key} title={key} description="Data berstruktur daripada backend.">
            <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(value, null, 2)}
            </pre>
          </SectionCard>
        ))}

        <SectionCard title="Keselamatan paparan" description="Nilai sensitif tidak dipaparkan oleh modul Admin.">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
            Password, PIN, token, secret, API key dan hash ditapis daripada paparan butiran.
          </div>
        </SectionCard>
      </div>

      <AdminUnsupportedNotice items={unsupportedBackendCapabilities} />
    </PageContainer>
  );
}
