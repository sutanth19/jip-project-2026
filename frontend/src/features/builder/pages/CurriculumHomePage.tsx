import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpenCheck, Layers, ListTree, Target } from "lucide-react";

import { ErrorState, LoadingState, PageContainer, PageHeader, SectionCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function CurriculumHomePage() {
  const programmes = useQuery({
    queryKey: ["builder", "curriculum", "programmes", "home"],
    queryFn: () => apiRequest<Record<string, unknown>>("/curriculum/programmes?limit=10"),
    staleTime: 30_000,
  });

  return (
    <PageContainer>
      <PageHeader title="Kurikulum" description="Pengurusan hierarki kurikulum: Programme, Year, KP, SK, SP dan objektif pembelajaran." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Button asChild variant="outline" className="justify-start">
          <Link to="/curriculum/versions">
            <Layers className="size-4" aria-hidden="true" />
            Versi
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/curriculum/programmes">
            <BookOpenCheck className="size-4" aria-hidden="true" />
            Program
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/curriculum/remedial-skills">
            <ListTree className="size-4" aria-hidden="true" />
            Kemahiran
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link to="/curriculum/learning-standards">
            <Target className="size-4" aria-hidden="true" />
            Standard Pembelajaran
          </Link>
        </Button>
      </div>
      {programmes.isLoading ? <LoadingState /> : null}
      {programmes.isError ? <ErrorState title="Tidak dapat memuatkan ringkasan kurikulum" /> : null}
      {programmes.data ? (
        <SectionCard title="Curriculum Tree Navigation" description="Pilih programmeId pada URL subhalaman untuk membuka data nested sebenar, contohnya /curriculum/years?programmeId=...">
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs">{safeJson(programmes.data)}</pre>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
