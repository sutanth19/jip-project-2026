import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { ErrorState, LoadingState, PageContainer, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { previewDigitalActivity } from "@/features/builder/api/builder.api";

export function DigitalActivityPreviewPage() {
  const activityId = useParams().id ?? "";
  const preview = useQuery({
    queryKey: ["builder", "digitalActivities", activityId, "preview"],
    queryFn: () => previewDigitalActivity(activityId),
    enabled: Boolean(activityId),
  });

  return (
    <PageContainer>
      <PageHeader
        title="Pratonton Aktiviti"
        description="Menggunakan endpoint preview dan pautan ke Activity Player sebenar. Renderer tidak diduplikasi dalam builder."
        actions={
          <Button asChild>
            <Link to={`/aktiviti/${activityId}/mainkan`}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Buka Activity Player
            </Link>
          </Button>
        }
      />
      {preview.isLoading ? <LoadingState /> : null}
      {preview.isError ? <ErrorState title="Pratonton gagal dimuatkan" /> : null}
      {preview.data ? (
        <SectionCard title="Preview DTO" description="Contract summary, validation issues dan metadata dikekalkan sebagai data backend.">
          <pre className="max-h-[32rem] overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(preview.data, null, 2)}</pre>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}

