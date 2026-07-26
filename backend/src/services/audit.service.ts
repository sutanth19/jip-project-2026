import { UserRole } from "@prisma/client";

export type AuditAction =
  | "SCHOOL_CREATED"
  | "SCHOOL_UPDATED"
  | "SCHOOL_STATUS_CHANGED"
  | "ADMIN_CREATED"
  | "ADMIN_UPDATED"
  | "ADMIN_STATUS_CHANGED"
  | "ADMIN_SETUP_RESENT"
  | "TEACHER_CREATED"
  | "TEACHER_UPDATED"
  | "TEACHER_STATUS_CHANGED"
  | "TEACHER_SETUP_RESENT"
  | "TEACHER_PERMISSION_GRANTED"
  | "TEACHER_PERMISSION_REVOKED";

export interface AuditEvent {
  actorUserId: string;
  actorProfileId: string;
  actorRole: UserRole;
  actorName: string | null;
  action: AuditAction;
  resourceType: "SCHOOL" | "ADMIN" | "TEACHER" | "TEACHER_PERMISSION_GRANT";
  resourceId: string;
  schoolId: string | null;
  before: unknown;
  after: unknown;
  timestamp: Date;
  requestIp: string | null;
  userAgent: string | null;
}

export type AuditEventDispatcher = (event: AuditEvent) => Promise<void> | void;

// Persistence will be added with the dedicated Audit Log module. Keeping this hook
// side-effect free ensures current business writes do not depend on future storage.
const noOpAuditDispatcher: AuditEventDispatcher = () => undefined;

export async function dispatchAuditEvent(
  event: AuditEvent,
  dispatcher: AuditEventDispatcher = noOpAuditDispatcher,
): Promise<void> {
  await dispatcher(event);
}
