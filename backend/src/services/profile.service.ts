import { AccountStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { getStorageAdapter } from "../storage/storage.service.js";
import type { StorageAdapter } from "../storage/storage.types.js";
import { hashPassword, hashPin, verifyPassword, verifyPin } from "../utils/bcrypt.js";
import { normalizeMalaysianPhone } from "../utils/phone.js";
import { isStrongPassword, isWeakPin } from "./auth.service.js";
import { dispatchAuditEvent, recordAuditEvent, type AuditEvent, type AuditEventDispatcher } from "./audit.service.js";

const accountSelect = {
  id: true, role: true, email: true, passwordHash: true, accountStatus: true, isFirstLogin: true,
  lastLogin: true, createdAt: true, updatedAt: true, setupToken: true, setupTokenExpiry: true,
  passwordResetToken: true, passwordResetExpiry: true,
} satisfies Prisma.UserSelect;

const adminSelect = {
  id: true, userId: true, schoolId: true, fullName: true, phone: true, position: true, avatar: true, createdAt: true, updatedAt: true,
  user: { select: accountSelect },
} satisfies Prisma.AdminSelect;

const teacherSelect = {
  id: true, userId: true, schoolId: true, teacherId: true, fullName: true, gender: true, phone: true, position: true, avatar: true, createdAt: true, updatedAt: true,
  school: { select: { id: true, schoolCode: true, schoolName: true } }, user: { select: accountSelect },
} satisfies Prisma.TeacherSelect;

const studentSelect = {
  id: true, userId: true, schoolId: true, classId: true, studentId: true, fullName: true, gender: true, birthDate: true, avatar: true,
  pinHash: true, isPinChanged: true, pinUpdatedAt: true, createdAt: true, updatedAt: true,
  school: { select: { id: true, schoolCode: true, schoolName: true } },
  class: { select: { id: true, className: true, yearLevel: true, academicYear: true } },
  user: { select: accountSelect },
} satisfies Prisma.StudentSelect;

const parentSelect = {
  id: true, userId: true, fullName: true, phone: true, occupation: true, address: true, avatar: true, createdAt: true, updatedAt: true,
  user: { select: accountSelect }, _count: { select: { students: true } },
} satisfies Prisma.ParentSelect;

type AdminRecord = Prisma.AdminGetPayload<{ select: typeof adminSelect }>;
type TeacherRecord = Prisma.TeacherGetPayload<{ select: typeof teacherSelect }>;
type StudentRecord = Prisma.StudentGetPayload<{ select: typeof studentSelect }>;
type ParentRecord = Prisma.ParentGetPayload<{ select: typeof parentSelect }>;
type AccountRecord = Prisma.UserGetPayload<{ select: typeof accountSelect }>;

export interface ProfileAuditContext {
  actor: AuthenticatedSession;
  requestIp?: string | null;
  userAgent?: string | null;
}

export interface ProfileRepository {
  findAdminByUserId(userId: string): Promise<AdminRecord | null>;
  findTeacherByUserId(userId: string): Promise<TeacherRecord | null>;
  findStudentByUserId(userId: string): Promise<StudentRecord | null>;
  findParentByUserId(userId: string): Promise<ParentRecord | null>;
  findAccountByUserId(userId: string): Promise<AccountRecord | null>;
  updateAdmin(id: string, data: { fullName?: string; phone?: string | null; position?: string | null; avatar?: string | null }): Promise<AdminRecord>;
  updateTeacher(id: string, data: { fullName?: string; phone?: string | null; position?: string | null; avatar?: string | null }): Promise<TeacherRecord>;
  updateStudent(id: string, data: { avatar?: string | null }): Promise<StudentRecord>;
  updateParent(id: string, data: { fullName?: string; phone?: string; occupation?: string | null; address?: string | null; avatar?: string | null }): Promise<ParentRecord>;
}

export interface PasswordTransactionInput { userId: string; passwordHash: string; event: AuditEvent; }
export interface PinTransactionInput { studentId: string; pinHash: string; pinUpdatedAt: Date; event: AuditEvent; }

export interface ProfileServiceDependencies {
  repository?: ProfileRepository;
  storageAdapter?: StorageAdapter;
  auditDispatcher?: AuditEventDispatcher;
  verifyCurrentPassword?: typeof verifyPassword;
  hashNewPassword?: typeof hashPassword;
  verifyCurrentPin?: typeof verifyPin;
  hashNewPin?: typeof hashPin;
  now?: () => Date;
  passwordTransaction?: (input: PasswordTransactionInput) => Promise<void>;
  pinTransaction?: (input: PinTransactionInput) => Promise<void>;
}

export type SelfProfileUpdate = {
  fullName?: string;
  phone?: string | null;
  position?: string | null;
  occupation?: string | null;
  address?: string | null;
};

function error(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const profileNotFound = () => error("PROFILE_NOT_FOUND", 404, "Profil pengguna tidak ditemui.");
const profileUpdateDenied = () => error("PROFILE_UPDATE_NOT_ALLOWED", 403, "Kemas kini profil tidak dibenarkan.");
const avatarInvalid = () => error("PROFILE_AVATAR_INVALID", 400, "Rujukan avatar tidak sah.");
const mediaNotFound = () => error("PROFILE_MEDIA_NOT_FOUND", 404, "Fail avatar tidak ditemui.");
const currentPasswordInvalid = () => error("AUTH_CURRENT_PASSWORD_INVALID", 401, "Kata laluan semasa tidak sah.");
const passwordMismatch = () => error("AUTH_PASSWORD_CONFIRMATION_MISMATCH", 400, "Pengesahan kata laluan tidak sepadan.");
const passwordReuse = () => error("AUTH_PASSWORD_REUSE_NOT_ALLOWED", 400, "Kata laluan baharu mestilah berbeza daripada kata laluan semasa.");
const passwordPolicy = () => error("AUTH_PASSWORD_POLICY_FAILED", 400, "Kata laluan baharu tidak memenuhi keperluan keselamatan.");
const currentPinInvalid = () => error("AUTH_CURRENT_PIN_INVALID", 401, "PIN semasa tidak sah.");
const pinMismatch = () => error("AUTH_PIN_CONFIRMATION_MISMATCH", 400, "Pengesahan PIN tidak sepadan.");
const pinReuse = () => error("AUTH_PIN_REUSE_NOT_ALLOWED", 400, "PIN baharu mestilah berbeza daripada PIN semasa.");
const pinPolicy = () => error("AUTH_PIN_POLICY_FAILED", 400, "PIN baharu terlalu mudah diteka.");
const unsupportedRole = () => error("AUTH_ROLE_NOT_SUPPORTED", 403, "Peranan ini tidak menyokong tindakan tersebut.");

function isPasswordRole(role: UserRole): boolean { return ([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT] as UserRole[]).includes(role); }
function active(accountStatus: AccountStatus): void { if (accountStatus !== AccountStatus.ACTIVE) throw profileUpdateDenied(); }
function optional(value: string | null | undefined): string | null | undefined { return value === undefined || value === null ? value : value.trim() || null; }
function actor(context: ProfileAuditContext): AuthenticatedSession { return context.actor; }

const prismaProfileRepository: ProfileRepository = {
  async findAdminByUserId(userId) { return prisma.admin.findUnique({ where: { userId }, select: adminSelect }); },
  async findTeacherByUserId(userId) { return prisma.teacher.findUnique({ where: { userId }, select: teacherSelect }); },
  async findStudentByUserId(userId) { return prisma.student.findUnique({ where: { userId }, select: studentSelect }); },
  async findParentByUserId(userId) { return prisma.parent.findUnique({ where: { userId }, select: parentSelect }); },
  async findAccountByUserId(userId) { return prisma.user.findUnique({ where: { id: userId }, select: accountSelect }); },
  async updateAdmin(id, data) { return prisma.admin.update({ where: { id }, data, select: adminSelect }); },
  async updateTeacher(id, data) { return prisma.teacher.update({ where: { id }, data, select: teacherSelect }); },
  async updateStudent(id, data) { return prisma.student.update({ where: { id }, data, select: studentSelect }); },
  async updateParent(id, data) { return prisma.parent.update({ where: { id }, data, select: parentSelect }); },
};

function assertProfileId(actual: string, context: ProfileAuditContext): void { if (actual !== actor(context).profileId) throw profileNotFound(); }
function auditEvent(context: ProfileAuditContext, action: Extract<AuditEvent["action"], "PROFILE_UPDATED" | "PROFILE_AVATAR_UPDATED" | "PASSWORD_CHANGED" | "STUDENT_PIN_CHANGED">, resourceType: "PROFILE" | "AUTH", resourceId: string, schoolId: string | null, before: unknown, after: unknown, metadata?: unknown): AuditEvent {
  return { actorUserId: actor(context).userId, actorProfileId: actor(context).profileId, actorRole: actor(context).role, actorName: null, action, resourceType, resourceId, schoolId, before, after, metadata, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null };
}

function adminDto(record: AdminRecord) { return { userId: record.userId, profileId: record.id, fullName: record.fullName, email: record.user.email, phone: record.phone, position: record.position, avatar: record.avatar, accountStatus: record.user.accountStatus, isFirstLogin: record.user.isFirstLogin, lastLogin: record.user.lastLogin, createdAt: record.createdAt, updatedAt: record.updatedAt, schoolId: record.schoolId }; }
function teacherDto(record: TeacherRecord) { return { userId: record.userId, profileId: record.id, teacherId: record.teacherId, fullName: record.fullName, email: record.user.email, phone: record.phone, gender: record.gender, position: record.position, avatar: record.avatar, school: record.school, accountStatus: record.user.accountStatus, isFirstLogin: record.user.isFirstLogin, lastLogin: record.user.lastLogin }; }
function studentDto(record: StudentRecord) { return { userId: record.userId, profileId: record.id, studentId: record.studentId, fullName: record.fullName, gender: record.gender, birthDate: record.birthDate, avatar: record.avatar, school: record.school, class: record.class, accountStatus: record.user.accountStatus, isPinChanged: record.isPinChanged, pinUpdatedAt: record.pinUpdatedAt, lastLogin: record.user.lastLogin }; }
function parentDto(record: ParentRecord) { return { userId: record.userId, profileId: record.id, fullName: record.fullName, email: record.user.email, phone: record.phone, occupation: record.occupation, address: record.address, avatar: record.avatar, linkedChildrenCount: record._count.students, accountStatus: record.user.accountStatus, isFirstLogin: record.user.isFirstLogin, lastLogin: record.user.lastLogin }; }

export async function getMyProfile(context: ProfileAuditContext, deps: ProfileServiceDependencies = {}) {
  const repository = deps.repository ?? prismaProfileRepository;
  if (actor(context).role === UserRole.SUPER_ADMIN || actor(context).role === UserRole.ADMIN) { const record = await repository.findAdminByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); return { profile: adminDto(record) }; }
  if (actor(context).role === UserRole.TEACHER) { const record = await repository.findTeacherByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); return { profile: teacherDto(record) }; }
  if (actor(context).role === UserRole.STUDENT) { const record = await repository.findStudentByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); return { profile: studentDto(record) }; }
  if (actor(context).role === UserRole.PARENT) { const record = await repository.findParentByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); return { profile: parentDto(record) }; }
  throw unsupportedRole();
}

export async function getMyAccount(context: ProfileAuditContext, deps: ProfileServiceDependencies = {}) {
  const account = await (deps.repository ?? prismaProfileRepository).findAccountByUserId(actor(context).userId);
  if (!account || account.role !== actor(context).role) throw profileNotFound();
  return { account: { userId: account.id, role: account.role, email: account.email, accountStatus: account.accountStatus, isFirstLogin: account.isFirstLogin, lastLogin: account.lastLogin, createdAt: account.createdAt, updatedAt: account.updatedAt, profileId: actor(context).profileId, schoolId: actor(context).schoolId, ...(account.role === UserRole.STUDENT ? { requiresPinChange: actor(context).requiresPinChange === true } : {}) } };
}

export async function updateMyProfile(input: SelfProfileUpdate, context: ProfileAuditContext, deps: ProfileServiceDependencies = {}) {
  const repository = deps.repository ?? prismaProfileRepository;
  if (Object.keys(input).length === 0 || actor(context).role === UserRole.STUDENT) throw profileUpdateDenied();
  let before: Record<string, unknown>; let after: Record<string, unknown>; let profile: ReturnType<typeof adminDto> | ReturnType<typeof teacherDto> | ReturnType<typeof parentDto>; let schoolId: string | null;
  if (actor(context).role === UserRole.SUPER_ADMIN || actor(context).role === UserRole.ADMIN) {
    const record = await repository.findAdminByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus);
    before = { fullName: record.fullName, phone: record.phone, position: record.position };
    const updated = await repository.updateAdmin(record.id, { ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}), ...(input.phone !== undefined ? { phone: input.phone === null ? null : normalizeMalaysianPhone(input.phone) } : {}), ...(input.position !== undefined ? { position: optional(input.position) } : {}) });
    profile = adminDto(updated); after = { fullName: updated.fullName, phone: updated.phone, position: updated.position }; schoolId = updated.schoolId;
  } else if (actor(context).role === UserRole.TEACHER) {
    const record = await repository.findTeacherByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus);
    before = { fullName: record.fullName, phone: record.phone, position: record.position };
    const updated = await repository.updateTeacher(record.id, { ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}), ...(input.phone !== undefined ? { phone: input.phone === null ? null : normalizeMalaysianPhone(input.phone) } : {}), ...(input.position !== undefined ? { position: optional(input.position) } : {}) });
    profile = teacherDto(updated); after = { fullName: updated.fullName, phone: updated.phone, position: updated.position }; schoolId = updated.schoolId;
  } else if (actor(context).role === UserRole.PARENT) {
    const record = await repository.findParentByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus);
    before = { fullName: record.fullName, phone: record.phone, occupation: record.occupation, address: record.address };
    const updated = await repository.updateParent(record.id, { ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}), ...(input.phone !== undefined && input.phone !== null ? { phone: normalizeMalaysianPhone(input.phone) } : {}), ...(input.occupation !== undefined ? { occupation: optional(input.occupation) } : {}), ...(input.address !== undefined ? { address: optional(input.address) } : {}) });
    profile = parentDto(updated); after = { fullName: updated.fullName, phone: updated.phone, occupation: updated.occupation, address: updated.address }; schoolId = null;
  } else throw unsupportedRole();
  await dispatchAuditEvent(auditEvent(context, "PROFILE_UPDATED", "PROFILE", actor(context).profileId, schoolId, before, after), deps.auditDispatcher);
  return { profile };
}

async function validatedAvatarKey(mediaKey: string, adapter: StorageAdapter): Promise<void> {
  if (!mediaKey.startsWith("avatar/")) throw avatarInvalid();
  try { assertSafeStorageKey(mediaKey); } catch { throw avatarInvalid(); }
  let exists: boolean;
  try { exists = await adapter.exists(mediaKey); } catch { throw avatarInvalid(); }
  if (!exists) throw mediaNotFound();
}

export async function updateMyAvatar(mediaKey: string | null, context: ProfileAuditContext, deps: ProfileServiceDependencies = {}) {
  const repository = deps.repository ?? prismaProfileRepository;
  if (mediaKey !== null) await validatedAvatarKey(mediaKey, deps.storageAdapter ?? getStorageAdapter());
  let before: string | null; let after: string | null; let profile: ReturnType<typeof adminDto> | ReturnType<typeof teacherDto> | ReturnType<typeof studentDto> | ReturnType<typeof parentDto>; let schoolId: string | null;
  if (actor(context).role === UserRole.SUPER_ADMIN || actor(context).role === UserRole.ADMIN) { const record = await repository.findAdminByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus); const updated = await repository.updateAdmin(record.id, { avatar: mediaKey }); before = record.avatar; after = updated.avatar; profile = adminDto(updated); schoolId = updated.schoolId; }
  else if (actor(context).role === UserRole.TEACHER) { const record = await repository.findTeacherByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus); const updated = await repository.updateTeacher(record.id, { avatar: mediaKey }); before = record.avatar; after = updated.avatar; profile = teacherDto(updated); schoolId = updated.schoolId; }
  else if (actor(context).role === UserRole.STUDENT) { const record = await repository.findStudentByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus); const updated = await repository.updateStudent(record.id, { avatar: mediaKey }); before = record.avatar; after = updated.avatar; profile = studentDto(updated); schoolId = updated.schoolId; }
  else if (actor(context).role === UserRole.PARENT) { const record = await repository.findParentByUserId(actor(context).userId); if (!record) throw profileNotFound(); assertProfileId(record.id, context); active(record.user.accountStatus); const updated = await repository.updateParent(record.id, { avatar: mediaKey }); before = record.avatar; after = updated.avatar; profile = parentDto(updated); schoolId = null; }
  else throw unsupportedRole();
  await dispatchAuditEvent(auditEvent(context, "PROFILE_AVATAR_UPDATED", "PROFILE", actor(context).profileId, schoolId, { avatar: before }, { avatar: after }), deps.auditDispatcher);
  return { profile };
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }, context: ProfileAuditContext, deps: ProfileServiceDependencies = {}): Promise<void> {
  if (!isPasswordRole(actor(context).role)) throw unsupportedRole();
  const account = await (deps.repository ?? prismaProfileRepository).findAccountByUserId(actor(context).userId);
  if (!account || account.role !== actor(context).role || !account.passwordHash) throw currentPasswordInvalid();
  active(account.accountStatus);
  if (input.confirmPassword !== input.newPassword) throw passwordMismatch();
  if (input.currentPassword === input.newPassword) throw passwordReuse();
  if (!isStrongPassword(input.newPassword)) throw passwordPolicy();
  if (!(await (deps.verifyCurrentPassword ?? verifyPassword)(input.currentPassword, account.passwordHash))) throw currentPasswordInvalid();
  const passwordHash = await (deps.hashNewPassword ?? hashPassword)(input.newPassword);
  const event = auditEvent(context, "PASSWORD_CHANGED", "AUTH", actor(context).profileId, actor(context).schoolId, null, { isFirstLogin: false });
  if (deps.passwordTransaction) { await deps.passwordTransaction({ userId: account.id, passwordHash, event }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: account.id }, data: { passwordHash, isFirstLogin: false, setupToken: null, setupTokenExpiry: null, passwordResetToken: null, passwordResetExpiry: null } });
    await recordAuditEvent(event, { transactionClient: tx, strict: true });
  });
}

export async function changeMyPin(input: { currentPin: string; newPin: string; confirmPin: string }, context: ProfileAuditContext, deps: ProfileServiceDependencies = {}): Promise<void> {
  if (actor(context).role !== UserRole.STUDENT) throw unsupportedRole();
  const student = await (deps.repository ?? prismaProfileRepository).findStudentByUserId(actor(context).userId);
  if (!student || student.user.role !== UserRole.STUDENT || !student.pinHash) throw currentPinInvalid();
  assertProfileId(student.id, context); active(student.user.accountStatus);
  if (input.confirmPin !== input.newPin) throw pinMismatch();
  if (input.currentPin === input.newPin) throw pinReuse();
  if (isWeakPin(input.newPin)) throw pinPolicy();
  if (!(await (deps.verifyCurrentPin ?? verifyPin)(input.currentPin, student.pinHash))) throw currentPinInvalid();
  const pinHash = await (deps.hashNewPin ?? hashPin)(input.newPin); const pinUpdatedAt = deps.now?.() ?? new Date();
  const event = auditEvent(context, "STUDENT_PIN_CHANGED", "AUTH", student.id, student.schoolId, null, { isPinChanged: true, pinUpdatedAt });
  if (deps.pinTransaction) { await deps.pinTransaction({ studentId: student.id, pinHash, pinUpdatedAt, event }); return; }
  await prisma.$transaction(async (tx) => {
    await tx.student.update({ where: { id: student.id }, data: { pinHash, isPinChanged: true, pinUpdatedAt } });
    await recordAuditEvent(event, { transactionClient: tx, strict: true });
  });
}
