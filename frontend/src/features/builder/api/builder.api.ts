import { apiRequest } from "@/lib/api";
import type {
  BuilderEntityConfig,
  BuilderListResult,
  BuilderQuery,
  BuilderRecord,
} from "@/features/builder/types/builder.types";
import { normalizeBuilderList } from "@/features/builder/utils/builder-record";

function toQuery(query: BuilderQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function listBuilderRecords(config: BuilderEntityConfig, query: BuilderQuery): Promise<BuilderListResult> {
  const payload = await apiRequest<unknown>(`${config.endpoint}${toQuery(query)}`);
  return normalizeBuilderList(payload);
}

export async function getBuilderRecord(config: BuilderEntityConfig, id: string): Promise<BuilderRecord> {
  const endpoint = config.detailEndpoint?.replace(":id", id) ?? `${config.endpoint}/${id}`;
  const payload = await apiRequest<unknown>(endpoint);

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    return (record.activity ?? record.item ?? record.template ?? record.version ?? record) as BuilderRecord;
  }

  return {};
}

export async function createBuilderRecord(config: BuilderEntityConfig, values: Record<string, unknown>): Promise<BuilderRecord> {
  return apiRequest<BuilderRecord>(config.endpoint, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function updateBuilderRecord(config: BuilderEntityConfig, id: string, values: Record<string, unknown>): Promise<BuilderRecord> {
  const endpoint = config.detailEndpoint?.replace(":id", id) ?? `${config.endpoint}/${id}`;
  return apiRequest<BuilderRecord>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export async function postBuilderAction(endpoint: string, values: Record<string, unknown> = {}): Promise<BuilderRecord> {
  return apiRequest<BuilderRecord>(endpoint, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function previewDigitalActivity(activityId: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/digital-activities/${activityId}/preview`);
}

