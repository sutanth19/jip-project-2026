import { apiRequest } from "@/lib/api";
import type {
  AdminEntityConfig,
  AdminListQuery,
  AdminRecord,
  PaginatedResult,
} from "@/features/admin/types/admin.types";
import { isRecord, normalizeListPayload } from "@/features/admin/utils/record";

export function toSearchParams(query: AdminListQuery): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    params.set(key, String(value));
  });

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function listAdminRecords(
  config: AdminEntityConfig,
  query: AdminListQuery,
): Promise<PaginatedResult<AdminRecord>> {
  const payload = await apiRequest<unknown>(`${config.endpoint}${toSearchParams(query)}`);
  return normalizeListPayload(payload);
}

export async function getAdminRecord(
  config: AdminEntityConfig,
  id: string,
): Promise<AdminRecord> {
  const payload = await apiRequest<unknown>(`${config.endpoint}/${id}`);

  if (config.key === "admins" && isRecord(payload) && isRecord(payload.admin)) {
    return payload.admin as AdminRecord;
  }

  if (config.key === "schools" && isRecord(payload) && isRecord(payload.school)) {
    return payload.school as AdminRecord;
  }

  return payload as AdminRecord;
}

export async function createAdminRecord(
  config: AdminEntityConfig,
  values: Record<string, unknown>,
): Promise<AdminRecord> {
  return apiRequest<AdminRecord>(config.endpoint, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function updateAdminRecord(
  config: AdminEntityConfig,
  id: string,
  values: Record<string, unknown>,
): Promise<AdminRecord> {
  return apiRequest<AdminRecord>(`${config.endpoint}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export async function updateAdminRecordStatus(
  config: AdminEntityConfig,
  id: string,
  status: string,
): Promise<AdminRecord> {
  return apiRequest<AdminRecord>(`${config.endpoint}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function resendSetup(config: AdminEntityConfig, id: string): Promise<AdminRecord> {
  return apiRequest<AdminRecord>(`${config.endpoint}/${id}/resend-setup`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function postAdminAction(
  path: string,
  body: Record<string, unknown> = {},
): Promise<AdminRecord> {
  return apiRequest<AdminRecord>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
