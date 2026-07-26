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
  | "TEACHER_PERMISSION_REVOKED"
  | "PARENT_CREATED"
  | "PARENT_UPDATED"
  | "PARENT_STATUS_CHANGED"
  | "PARENT_SETUP_RESENT"
  | "PARENT_STUDENT_LINKED"
  | "PARENT_STUDENT_UNLINKED"
  | "STUDENT_CREATED"
  | "STUDENT_UPDATED"
  | "STUDENT_STATUS_CHANGED"
  | "STUDENT_PIN_RESET"
  | "STUDENT_CLASS_CHANGED"
  | "STUDENT_PARENT_LINKED"
  | "STUDENT_PARENT_UNLINKED"
  | "CLASS_CREATED"
  | "CLASS_UPDATED"
  | "CLASS_STATUS_CHANGED"
  | "CLASS_TEACHER_CHANGED"
  | "CLASS_STUDENT_ASSIGNED";

export interface AuditEvent {
  actorUserId: string;
  actorProfileId: string;
  actorRole: UserRole;
  actorName: string | null;
  action: AuditAction;
  resourceType:
    | "SCHOOL"
    | "ADMIN"
    | "TEACHER"
    | "TEACHER_PERMISSION_GRANT"
    | "PARENT"
    | "PARENT_STUDENT"
    | "STUDENT"
    | "STUDENT_PARENT"
    | "CLASS";
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
