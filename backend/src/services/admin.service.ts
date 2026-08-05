import { AccountStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import { generateSetupToken } from "../utils/generateSetupToken.js";
import { normalizeMalaysianPhone } from "../utils/phone.js";
import {
  dispatchAuditEvent,
  type AuditEvent,
  type AuditEventDispatcher,
} from "./audit.service.js";
import {
  EmailDeliveryError,
  sendResendEmail,
} from "./notification-email.service.js";
import type {
  CreateAdminRequest,
  ListAdminsQuery,
  UpdateAdminRequest,
} from "../validators/admin.validator.js";

const adminAccountSelect = {
  id: true,
  userId: true,
  schoolId: true,
  fullName: true,
  phone: true,
  position: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      role: true,
      email: true,
      passwordHash: true,
      accountStatus: true,
      isFirstLogin: true,
      lastLogin: true,
      setupToken: true,
      setupTokenExpiry: true,
    },
  },
} satisfies Prisma.AdminSelect;

type PrismaAdminAccount = Prisma.AdminGetPayload<{
  select: typeof adminAccountSelect;
}>;

export interface AdminAccountRecord extends PrismaAdminAccount {}

export interface AdminActor {
  userId: string;
  profileId: string;
  role: UserRole;
  name?: string | null;
}

export interface AdminAuditContext {
  actor: AdminActor;
  requestIp?: string | null;
  userAgent?: string | null;
}

export interface AdminProvisionInput {
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  avatar: string | null;
  setupToken: string;
  setupTokenExpiry: Date;
}

export interface AdminProfileUpdateInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  position?: string | null;
  avatar?: string | null;
}

export interface AdminListFilters {
  skip: number;
  take: number;
  search?: string;
  status?: AccountStatus;
  sortBy: ListAdminsQuery["sortBy"];
  sortOrder: ListAdminsQuery["sortOrder"];
}

export interface AdminRepository {
  findById(id: string): Promise<AdminAccountRecord | null>;
  findByEmail(email: string): Promise<AdminAccountRecord | null>;
  create(input: AdminProvisionInput): Promise<AdminAccountRecord>;
  findMany(filters: AdminListFilters): Promise<AdminAccountRecord[]>;
  count(filters: Pick<AdminListFilters, "search" | "status">): Promise<number>;
  updateProfile(id: string, input: AdminProfileUpdateInput): Promise<AdminAccountRecord>;
  updateStatus(id: string, status: AccountStatus): Promise<AdminAccountRecord>;
  refreshSetup(id: string, setupToken: string, setupTokenExpiry: Date): Promise<AdminAccountRecord>;
}

export type InvitationDeliveryStatus = "QUEUED" | "SENT" | "DEVELOPMENT_PREVIEW" | "FAILED";

export type AdminInvitationResponse = {
  status: InvitationDeliveryStatus;
  expiresAt: Date;
  developmentSetupUrl?: string;
};

export interface AdminSetupInvitation {
  adminId: string;
  email: string;
  fullName: string;
  setupToken: string;
  expiresAt: Date;
}

export type AdminInvitationDispatcher = (
  invitation: AdminSetupInvitation,
) => Promise<InvitationDeliveryStatus> | InvitationDeliveryStatus;

export interface AdminServiceDependencies {
  repository?: AdminRepository;
  auditDispatcher?: AuditEventDispatcher;
  invitationDispatcher?: AdminInvitationDispatcher;
  now?: () => Date;
  setupTokenGenerator?: () => string;
  setupExpiryHours?: number;
}

export interface AdminResponse {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string | null;
  avatar: string | null;
  schoolId: null;
  accountStatus: AccountStatus;
  isFirstLogin: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDetailsResponse extends AdminResponse {
  setupStatus: "PENDING" | "EXPIRED" | "COMPLETED" | "ARCHIVED";
}

function adminNotFound(): AppError {
  return new AppError("ADMIN_NOT_FOUND", 404, "Pentadbir tidak ditemui.");
}

function adminEmailExists(): AppError {
  return new AppError("ADMIN_EMAIL_EXISTS", 409, "E-mel pentadbir telah digunakan.");
}

function adminStatusTransitionInvalid(): AppError {
  return new AppError(
    "ADMIN_STATUS_TRANSITION_INVALID",
    403,
    "Perubahan status pentadbir tidak dibenarkan.",
  );
}

function adminSetupAlreadyCompleted(): AppError {
  return new AppError(
    "ADMIN_SETUP_ALREADY_COMPLETED",
    409,
    "Akaun pentadbir telah selesai disediakan.",
  );
}

function adminSetupResendNotAllowed(): AppError {
  return new AppError(
    "ADMIN_SETUP_RESEND_NOT_ALLOWED",
    403,
    "Jemputan persediaan tidak boleh dihantar semula untuk akaun ini.",
  );
}

function mapUniqueConstraintError(error: unknown): AppError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((value): value is string => typeof value === "string")
    : typeof target === "string"
      ? [target]
      : [];

  if (fields.some((field) => field.includes("email"))) {
    return adminEmailExists();
  }

  return new AppError("ADMIN_CONFLICT", 409, "Maklumat pentadbir telah digunakan.");
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return value.trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function buildWhere(filters: Pick<AdminListFilters, "search" | "status">): Prisma.AdminWhereInput {
  const search = filters.search?.trim();
  const searchConditions: Prisma.AdminWhereInput[] = search
    ? [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]
    : [];

  return {
    user: {
      role: UserRole.ADMIN,
      ...(filters.status ? { accountStatus: filters.status } : {}),
    },
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };
}

function toRecord(record: PrismaAdminAccount): AdminAccountRecord {
  return record;
}

function toResponse(record: AdminAccountRecord): AdminResponse {
  return {
    id: record.id,
    userId: record.userId,
    fullName: record.fullName,
    email: record.user.email ?? "",
    phone: record.phone,
    position: record.position,
    avatar: record.avatar,
    schoolId: null,
    accountStatus: record.user.accountStatus,
    isFirstLogin: record.user.isFirstLogin,
    lastLogin: record.user.lastLogin,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function setupStatus(record: AdminAccountRecord, now: Date): AdminDetailsResponse["setupStatus"] {
  if (record.user.accountStatus === AccountStatus.ARCHIVED) {
    return "ARCHIVED";
  }

  if (!record.user.isFirstLogin && record.user.passwordHash) {
    return "COMPLETED";
  }

  if (record.user.setupToken && record.user.setupTokenExpiry && record.user.setupTokenExpiry > now) {
    return "PENDING";
  }

  return "EXPIRED";
}

function toDetailsResponse(record: AdminAccountRecord, now: Date): AdminDetailsResponse {
  return {
    ...toResponse(record),
    setupStatus: setupStatus(record, now),
  };
}

function canTransitionStatus(current: AccountStatus, next: AccountStatus): boolean {
  if (current === AccountStatus.PENDING) {
    return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  }

  if (current === AccountStatus.ACTIVE) {
    return next === AccountStatus.SUSPENDED || next === AccountStatus.ARCHIVED;
  }

  if (current === AccountStatus.SUSPENDED) {
    return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  }

  return current === AccountStatus.ARCHIVED && next === AccountStatus.ACTIVE;
}

function toAuditEvent(
  context: AdminAuditContext,
  action: Extract<AuditEvent["action"], "ADMIN_CREATED" | "ADMIN_UPDATED" | "ADMIN_STATUS_CHANGED" | "ADMIN_SETUP_RESENT">,
  record: AdminAccountRecord,
  timestamp: Date,
  before: AdminResponse | null,
): AuditEvent {
  return {
    actorUserId: context.actor.userId,
    actorProfileId: context.actor.profileId,
    actorRole: context.actor.role,
    actorName: context.actor.name ?? null,
    action,
    resourceType: "ADMIN",
    resourceId: record.id,
    schoolId: null,
    before,
    after: toResponse(record),
    timestamp,
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

function getSetupExpiryHours(value: number | undefined): number {
  const configured = value ?? Number(process.env.ADMIN_SETUP_TOKEN_EXPIRES_HOURS ?? 24);

  return Number.isFinite(configured) && configured > 0 && configured <= 168
    ? configured
    : 24;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function recipientDomain(email: string): string {
  return email.includes("@") ? email.split("@").pop() ?? "unknown" : "unknown";
}

function logAdminSetupEmailResult(
  level: "info" | "warn",
  message: string,
  data: {
    adminId: string;
    email: string;
    providerId?: string | null;
    reason?: string;
    providerStatus?: number;
  },
): void {
  const payload = {
    adminId: data.adminId,
    recipientDomain: recipientDomain(data.email),
    ...(data.providerId ? { providerId: data.providerId } : {}),
    ...(data.reason ? { reason: data.reason } : {}),
    ...(data.providerStatus ? { providerStatus: data.providerStatus } : {}),
  };

  console[level](message, payload);
}

function isDevelopmentEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development";
}

export function buildAdminSetupUrl(setupToken: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const baseUrl = env.FRONTEND_URL ?? env.APP_URL ?? (isDevelopmentEnvironment(env) ? "http://localhost:5173" : undefined);

  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL("/setup-password", baseUrl);
    url.searchParams.set("token", setupToken);
    return url.toString();
  } catch {
    return null;
  }
}

function buildAdminInvitationResponse(
  status: InvitationDeliveryStatus,
  expiresAt: Date,
  setupToken: string,
  env: NodeJS.ProcessEnv = process.env,
): AdminInvitationResponse {
  const response: AdminInvitationResponse = { status, expiresAt };

  if (!isDevelopmentEnvironment(env)) {
    return response;
  }

  const developmentSetupUrl = buildAdminSetupUrl(setupToken, env);
  if (developmentSetupUrl) {
    response.developmentSetupUrl = developmentSetupUrl;
  }

  return response;
}

export function adminSetupEmailTemplate(input: {
  fullName: string;
  setupUrl: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const expiry = input.expiresAt.toLocaleString("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const safeName = escapeHtml(input.fullName);
  const safeUrl = escapeHtml(input.setupUrl);
  const subject = "Lengkapkan Penyediaan Akaun Digital MoLIB";
  const text = [
    `Salam ${input.fullName},`,
    "",
    "Akaun Admin Digital MoLIB telah dicipta untuk anda dan kini berada dalam status menunggu.",
    "Sila cipta kata laluan anda untuk melengkapkan penyediaan akaun.",
    `Pautan ini akan tamat tempoh pada ${expiry}.`,
    "",
    `Lengkapkan Akaun: ${input.setupUrl}`,
    "",
    "Jika anda tidak menjangkakan e-mel ini, abaikan mesej ini.",
  ].join("\n");
  const html = `<!doctype html><html><body><main style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1e293b"><h1>Lengkapkan Penyediaan Akaun Digital MoLIB</h1><p>Salam ${safeName},</p><p>Akaun Admin Digital MoLIB telah dicipta untuk anda dan kini berada dalam status menunggu.</p><p>Sila cipta kata laluan anda untuk melengkapkan penyediaan akaun.</p><p>Pautan ini akan tamat tempoh pada <strong>${escapeHtml(expiry)}</strong>.</p><p><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Lengkapkan Akaun</a></p><p>Jika butang tidak berfungsi, buka pautan ini:</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>Jika anda tidak menjangkakan e-mel ini, abaikan mesej ini.</p><hr><small>Digital MoLIB</small></main></body></html>`;

  return { subject, html, text };
}

export async function sendAdminSetupInvitation(
  invitation: AdminSetupInvitation,
): Promise<InvitationDeliveryStatus> {
  const setupUrl = buildAdminSetupUrl(invitation.setupToken);

  if (!setupUrl) {
    if (process.env.NODE_ENV !== "production") {
      return "DEVELOPMENT_PREVIEW";
    }

    logAdminSetupEmailResult("warn", "Admin setup email delivery failed.", {
      adminId: invitation.adminId,
      email: invitation.email,
      reason: "SETUP_URL_NOT_CONFIGURED",
    });
    return "FAILED";
  }

  const email = adminSetupEmailTemplate({
    fullName: invitation.fullName,
    setupUrl,
    expiresAt: invitation.expiresAt,
  });

  try {
    const sent = await sendResendEmail({
      to: invitation.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    logAdminSetupEmailResult("info", "Admin setup email delivered.", {
      adminId: invitation.adminId,
      email: invitation.email,
      providerId: sent.providerId,
    });
    return "SENT";
  } catch (error) {
    const deliveryError = error instanceof EmailDeliveryError ? error : null;
    logAdminSetupEmailResult("warn", "Admin setup email delivery failed.", {
      adminId: invitation.adminId,
      email: invitation.email,
      reason: deliveryError?.code ?? "EMAIL_DELIVERY_FAILED",
      providerStatus: deliveryError?.providerStatus,
    });
    return "FAILED";
  }
}

const prismaAdminRepository: AdminRepository = {
  async findById(id) {
    const record = await prisma.admin.findUnique({
      where: { id },
      select: adminAccountSelect,
    });

    return record ? toRecord(record) : null;
  },
  async findByEmail(email) {
    const record = await prisma.admin.findFirst({
      where: {
        user: {
          email,
        },
      },
      select: adminAccountSelect,
    });

    return record ? toRecord(record) : null;
  },
  async create(input) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: UserRole.ADMIN,
          email: input.email,
          passwordHash: null,
          accountStatus: AccountStatus.PENDING,
          isFirstLogin: true,
          setupToken: input.setupToken,
          setupTokenExpiry: input.setupTokenExpiry,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      const record = await tx.admin.create({
        data: {
          userId: user.id,
          schoolId: null,
          fullName: input.fullName,
          phone: input.phone,
          position: input.position,
          avatar: input.avatar,
        },
        select: adminAccountSelect,
      });

      return toRecord(record);
    });
  },
  async findMany(filters) {
    const orderBy: Prisma.AdminOrderByWithRelationInput =
      filters.sortBy === "email" || filters.sortBy === "accountStatus"
        ? { user: { [filters.sortBy]: filters.sortOrder } }
        : { [filters.sortBy]: filters.sortOrder };
    const records = await prisma.admin.findMany({
      where: buildWhere(filters),
      orderBy,
      skip: filters.skip,
      take: filters.take,
      select: adminAccountSelect,
    });

    return records.map(toRecord);
  },
  count(filters) {
    return prisma.admin.count({ where: buildWhere(filters) });
  },
  async updateProfile(id, input) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.admin.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!current) {
        throw adminNotFound();
      }

      const { email, ...profileData } = input;
      if (email !== undefined) {
        await tx.user.update({
          where: { id: current.userId },
          data: { email },
        });
      }

      const record = await tx.admin.update({
        where: { id },
        data: profileData,
        select: adminAccountSelect,
      });

      return toRecord(record);
    });
  },
  async updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.admin.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!current) {
        throw adminNotFound();
      }

      await tx.user.update({
        where: { id: current.userId },
        data: { accountStatus: status },
      });
      const record = await tx.admin.findUnique({
        where: { id },
        select: adminAccountSelect,
      });

      if (!record) {
        throw adminNotFound();
      }

      return toRecord(record);
    });
  },
  async refreshSetup(id, setupToken, setupTokenExpiry) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.admin.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!current) {
        throw adminNotFound();
      }

      await tx.user.update({
        where: { id: current.userId },
        data: {
          setupToken,
          setupTokenExpiry,
        },
      });
      const record = await tx.admin.findUnique({
        where: { id },
        select: adminAccountSelect,
      });

      if (!record) {
        throw adminNotFound();
      }

      return toRecord(record);
    });
  },
};

function normalizeCreateInput(data: CreateAdminRequest, setupToken: string, setupTokenExpiry: Date): AdminProvisionInput {
  return {
    fullName: data.fullName.trim(),
    email: normalizeEmail(data.email),
    phone: data.phone ? normalizeMalaysianPhone(data.phone) : null,
    position: data.position?.trim() || "IPG Administrator",
    avatar: data.avatar?.trim() || null,
    setupToken,
    setupTokenExpiry,
  };
}

function normalizeUpdateInput(data: UpdateAdminRequest): AdminProfileUpdateInput {
  const update: AdminProfileUpdateInput = {};

  if (data.fullName !== undefined) update.fullName = data.fullName.trim();
  if (data.email !== undefined) update.email = normalizeEmail(data.email);
  if (data.phone !== undefined) {
    update.phone = data.phone === null ? null : normalizeMalaysianPhone(data.phone);
  }
  if (data.position !== undefined) update.position = normalizeOptionalString(data.position);
  if (data.avatar !== undefined) update.avatar = normalizeOptionalString(data.avatar);

  return update;
}

async function assertAdminRecord(repository: AdminRepository, adminId: string): Promise<AdminAccountRecord> {
  const record = await repository.findById(adminId);

  if (!record || record.user.role !== UserRole.ADMIN) {
    throw adminNotFound();
  }

  return record;
}

async function dispatchAdminAudit(
  context: AdminAuditContext,
  action: Extract<AuditEvent["action"], "ADMIN_CREATED" | "ADMIN_UPDATED" | "ADMIN_STATUS_CHANGED" | "ADMIN_SETUP_RESENT">,
  record: AdminAccountRecord,
  before: AdminResponse | null,
  deps: AdminServiceDependencies,
): Promise<void> {
  await dispatchAuditEvent(
    toAuditEvent(context, action, record, deps.now?.() ?? new Date(), before),
    deps.auditDispatcher,
  );
}

export async function createAdmin(
  data: CreateAdminRequest,
  context: AdminAuditContext,
  deps: AdminServiceDependencies = {},
): Promise<{ admin: AdminResponse; invitation: AdminInvitationResponse }> {
  const repository = deps.repository ?? prismaAdminRepository;
  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const setupTokenExpiry = new Date(
    now.getTime() + getSetupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000,
  );
  const input = normalizeCreateInput(data, setupToken, setupTokenExpiry);

  if (await repository.findByEmail(input.email)) {
    throw adminEmailExists();
  }

  let record: AdminAccountRecord;
  try {
    record = await repository.create(input);
  } catch (error) {
    const mapped = mapUniqueConstraintError(error);
    if (mapped) throw mapped;
    throw error;
  }

  const invitationDispatcher = deps.invitationDispatcher ?? sendAdminSetupInvitation;
  const invitationStatus = await invitationDispatcher({
    adminId: record.id,
    email: input.email,
    fullName: record.fullName,
    setupToken,
    expiresAt: setupTokenExpiry,
  });

  await dispatchAdminAudit(context, "ADMIN_CREATED", record, null, deps);

  return {
    admin: toResponse(record),
    invitation: buildAdminInvitationResponse(invitationStatus, setupTokenExpiry, setupToken),
  };
}

export async function listAdmins(
  query: ListAdminsQuery,
  deps: AdminServiceDependencies = {},
): Promise<{
  admins: AdminResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> {
  const repository = deps.repository ?? prismaAdminRepository;
  const filters: AdminListFilters = {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search?.trim() || undefined,
    status: query.status,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const [records, total] = await Promise.all([
    repository.findMany(filters),
    repository.count(filters),
  ]);
  const totalPages = Math.ceil(total / query.limit);

  return {
    admins: records.filter((record) => record.user.role === UserRole.ADMIN).map(toResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}

export async function getAdminById(
  adminId: string,
  deps: AdminServiceDependencies = {},
): Promise<AdminDetailsResponse> {
  const record = await assertAdminRecord(deps.repository ?? prismaAdminRepository, adminId);
  return toDetailsResponse(record, deps.now?.() ?? new Date());
}

export async function updateAdmin(
  adminId: string,
  data: UpdateAdminRequest,
  context: AdminAuditContext,
  deps: AdminServiceDependencies = {},
): Promise<AdminResponse> {
  const repository = deps.repository ?? prismaAdminRepository;
  const current = await assertAdminRecord(repository, adminId);
  const input = normalizeUpdateInput(data);

  if (input.email !== undefined) {
    const emailMatch = await repository.findByEmail(input.email);
    if (emailMatch && emailMatch.id !== adminId) {
      throw adminEmailExists();
    }
  }

  let record: AdminAccountRecord;
  try {
    record = await repository.updateProfile(adminId, input);
  } catch (error) {
    const mapped = mapUniqueConstraintError(error);
    if (mapped) throw mapped;
    throw error;
  }

  await dispatchAdminAudit(context, "ADMIN_UPDATED", record, toResponse(current), deps);
  return toResponse(record);
}

export async function updateAdminStatus(
  adminId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
  context: AdminAuditContext,
  deps: AdminServiceDependencies = {},
): Promise<AdminResponse> {
  const repository = deps.repository ?? prismaAdminRepository;
  const current = await assertAdminRecord(repository, adminId);

  if (!canTransitionStatus(current.user.accountStatus, status)) {
    throw adminStatusTransitionInvalid();
  }

  const record = await repository.updateStatus(adminId, status);
  await dispatchAdminAudit(context, "ADMIN_STATUS_CHANGED", record, toResponse(current), deps);
  return toResponse(record);
}

export async function resendAdminSetup(
  adminId: string,
  context: AdminAuditContext,
  deps: AdminServiceDependencies = {},
): Promise<{ invitation: AdminInvitationResponse }> {
  const repository = deps.repository ?? prismaAdminRepository;
  const current = await assertAdminRecord(repository, adminId);

  if (current.user.accountStatus === AccountStatus.ARCHIVED) {
    throw adminSetupResendNotAllowed();
  }

  if (!current.user.isFirstLogin && current.user.passwordHash) {
    throw adminSetupAlreadyCompleted();
  }

  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const expiresAt = new Date(
    now.getTime() + getSetupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000,
  );
  const record = await repository.refreshSetup(adminId, setupToken, expiresAt);
  const invitationDispatcher = deps.invitationDispatcher ?? sendAdminSetupInvitation;
  const status = await invitationDispatcher({
    adminId: record.id,
    email: record.user.email ?? "",
    fullName: record.fullName,
    setupToken,
    expiresAt,
  });

  await dispatchAdminAudit(context, "ADMIN_SETUP_RESENT", record, toResponse(current), deps);

  return { invitation: buildAdminInvitationResponse(status, expiresAt, setupToken) };
}

export const adminStatusPolicy =
  "PENDING may transition to ACTIVE or ARCHIVED; ACTIVE may transition to SUSPENDED or ARCHIVED; SUSPENDED may transition to ACTIVE or ARCHIVED; SUPER_ADMIN may restore ARCHIVED accounts to ACTIVE.";
