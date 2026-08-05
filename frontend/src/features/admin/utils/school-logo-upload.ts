import { normalizeMediaPreviewUrl } from "@/features/admin/api/media.api";
import { parseApiError } from "@/lib/api";

export const schoolLogoMaxBytes = 5 * 1024 * 1024;

const schoolLogoAcceptedTypes = new Set(["image/png", "image/jpeg"]);
const schoolLogoAcceptedExtensions = /\.(png|jpe?g)$/i;

export function validateSchoolLogoFile(file: File): string | null {
  if (!schoolLogoAcceptedTypes.has(file.type) || !schoolLogoAcceptedExtensions.test(file.name)) {
    return "Logo mestilah fail PNG, JPG atau JPEG.";
  }

  if (file.size > schoolLogoMaxBytes) {
    return "Saiz logo maksimum ialah 5 MB.";
  }

  return null;
}

export function mapSchoolLogoUploadError(error: unknown): string {
  if (error instanceof Error && error.message === "MEDIA_UPLOAD_URL_MISSING") {
    return "URL Cloudinary tidak diterima daripada pelayan.";
  }

  const parsed = parseApiError(error);

  if (parsed.code === "MEDIA_TYPE_NOT_ALLOWED") {
    return "Logo mestilah fail PNG, JPG atau JPEG.";
  }

  if (parsed.code === "MEDIA_FILE_TOO_LARGE") {
    return "Saiz logo maksimum ialah 5 MB.";
  }

  if (parsed.code === "MEDIA_ACCESS_DENIED") {
    return "Anda tidak mempunyai kebenaran untuk memuat naik logo sekolah.";
  }

  if (parsed.code === "NETWORK_ERROR") {
    return "Perkhidmatan muat naik tidak dapat dihubungi. Sila cuba lagi.";
  }

  return "Logo tidak dapat dimuat naik. Sila cuba lagi.";
}

export function getSchoolLogoPreviewUrl(value: string): string {
  if (!value.trim()) {
    return "";
  }

  try {
    return normalizeMediaPreviewUrl(value.trim());
  } catch {
    return value.trim();
  }
}
