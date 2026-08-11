import { apiRequest } from "@/lib/api";
import type { RemedialSkillOption } from "@/features/curriculum/utils/remedial-skill";

type ProgrammeOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type ListProgrammesPayload = {
  programmes?: ProgrammeOption[];
};

type ListSkillsPayload = {
  remedialSkills?: RemedialSkillOption[];
};

const DEFAULT_REMEDIAL_PROGRAMME_CODE = "BM-PEMULIHAN";

export async function getDefaultRemedialProgrammeId(): Promise<string> {
  const preferredParams = new URLSearchParams({
    page: "1",
    limit: "1",
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
    search: DEFAULT_REMEDIAL_PROGRAMME_CODE,
  });
  const preferred = await apiRequest<ListProgrammesPayload>(`/curriculum/programmes?${preferredParams.toString()}`);
  const preferredId = preferred.programmes?.[0]?.id;
  if (preferredId) return preferredId;

  const fallbackParams = new URLSearchParams({
    page: "1",
    limit: "1",
    status: "ACTIVE",
    sortBy: "name",
    sortOrder: "asc",
  });
  const fallback = await apiRequest<ListProgrammesPayload>(`/curriculum/programmes?${fallbackParams.toString()}`);
  const fallbackId = fallback.programmes?.[0]?.id;

  if (!fallbackId) {
    throw new Error("No published remedial programme is available.");
  }

  return fallbackId;
}

export async function listRemedialSkillsByProgramme(programmeId: string): Promise<RemedialSkillOption[]> {
  const params = new URLSearchParams({
    page: "1",
    limit: "100",
    status: "ACTIVE",
    sortBy: "sequence",
    sortOrder: "asc",
  });
  const response = await apiRequest<ListSkillsPayload>(`/curriculum/programmes/${programmeId}/remedial-skills?${params.toString()}`);
  return response.remedialSkills ?? [];
}
