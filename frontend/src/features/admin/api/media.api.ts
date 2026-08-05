import { apiClient, type ApiSuccessResponse } from "@/lib/api";
import { API_BASE_URL } from "@/constants/env";

type MediaUploadPurpose = "SCHOOL_LOGO";

export type UploadedMediaFile = {
  url: string;
  publicId?: string;
  key?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  purpose: MediaUploadPurpose;
  checksum?: string;
  uploadedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeMediaPreviewUrl(value: string): string {
  return new URL(value, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`).toString();
}

export function normalizeMediaUploadResponse(payload: unknown, purpose: MediaUploadPurpose): UploadedMediaFile {
  const root = isRecord(payload) ? payload : {};
  const data = isRecord(root.data) ? root.data : {};
  const file = isRecord(data.file) ? data.file : isRecord(root.file) ? root.file : {};
  const candidates = [file, data, root];

  const rawUrl = candidates
    .map((candidate) => stringValue(candidate.secure_url) ?? stringValue(candidate.secureUrl) ?? stringValue(candidate.url))
    .find((value): value is string => Boolean(value));

  if (!rawUrl) {
    throw new Error("MEDIA_UPLOAD_URL_MISSING");
  }

  return {
    url: normalizeMediaPreviewUrl(rawUrl),
    publicId: candidates
      .map((candidate) => stringValue(candidate.publicId) ?? stringValue(candidate.public_id))
      .find((value): value is string => Boolean(value)),
    key: stringValue(file.key),
    originalName: stringValue(file.originalName),
    mimeType: stringValue(file.mimeType),
    size: typeof file.size === "number" ? file.size : undefined,
    purpose,
    checksum: stringValue(file.checksum),
    uploadedAt: stringValue(file.uploadedAt),
  };
}

export async function uploadMediaFile({
  file,
  purpose,
}: {
  file: File;
  purpose: MediaUploadPurpose;
}): Promise<UploadedMediaFile> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const response = await apiClient.post<ApiSuccessResponse<unknown>>(
    "/media/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return normalizeMediaUploadResponse(response.data, purpose);
}
