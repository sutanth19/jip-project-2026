export type StatusTone = "default" | "success" | "warning" | "danger" | "info";

export function getStatusTone(status: string): StatusTone {
  const normalized = status.trim().toUpperCase();

  if (["ACTIVE", "COMPLETED", "SENT", "READ", "MASTERED", "APPROVED"].includes(normalized)) {
    return "success";
  }

  if (["PENDING", "QUEUED", "DRAFT", "IN_PROGRESS", "REVISION_REQUIRED"].includes(normalized)) {
    return "warning";
  }

  if (["FAILED", "LOCKED", "SUSPENDED", "ARCHIVED", "REJECTED"].includes(normalized)) {
    return "danger";
  }

  if (["SYSTEM", "ANNOUNCEMENT", "INFO"].includes(normalized)) {
    return "info";
  }

  return "default";
}

