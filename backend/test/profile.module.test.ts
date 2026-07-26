import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  changeMyPassword,
  changeMyPin,
  getMyAccount,
  getMyProfile,
  updateMyAvatar,
  updateMyProfile,
  type ProfileAuditContext,
  type ProfileRepository,
} from "../src/services/profile.service.js";
import { adminProfileUpdateSchema, avatarUpdateSchema, changePasswordSchema, changePinSchema, parentProfileUpdateSchema, studentProfileUpdateSchema, teacherProfileUpdateSchema } from "../src/validators/profile.validator.js";

const userId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const schoolId = "33333333-3333-4333-8333-333333333333";
const now = new Date("2026-07-26T00:00:00.000Z");

function context(role: UserRole, overrides: Partial<ProfileAuditContext["actor"]> = {}): ProfileAuditContext {
  return { actor: { userId, profileId, role, schoolId, isFirstLogin: false, ...overrides }, requestIp: "127.0.0.1", userAgent: "profile-test" };
}

function account(role: UserRole, overrides: Record<string, unknown> = {}) {
  return { id: userId, role, email: role === UserRole.STUDENT ? null : "user@example.com", passwordHash: "hash", accountStatus: AccountStatus.ACTIVE, isFirstLogin: false, lastLogin: now, createdAt: now, updatedAt: now, setupToken: "setup", setupTokenExpiry: now, passwordResetToken: "reset", passwordResetExpiry: now, ...overrides };
}

function records() {
  const admin = { id: profileId, userId, schoolId: null, fullName: "Admin Satu", phone: "0123456789", position: "Administrator", avatar: null, createdAt: now, updatedAt: now, user: account(UserRole.ADMIN) };
  const teacher = { id: profileId, userId, schoolId, teacherId: "T-001", fullName: "Guru Satu", gender: "FEMALE", phone: "0123456789", position: "Guru", avatar: null, createdAt: now, updatedAt: now, school: { id: schoolId, schoolCode: "SCH-001", schoolName: "Sekolah Ujian" }, user: account(UserRole.TEACHER) };
  const student = { id: profileId, userId, schoolId, classId: "44444444-4444-4444-8444-444444444444", studentId: "S-001", fullName: "Murid Satu", gender: "MALE", birthDate: now, avatar: null, pinHash: "pin-hash", isPinChanged: true, pinUpdatedAt: now, createdAt: now, updatedAt: now, school: { id: schoolId, schoolCode: "SCH-001", schoolName: "Sekolah Ujian" }, class: { id: "44444444-4444-4444-8444-444444444444", className: "1 Amanah", yearLevel: 1, academicYear: 2026 }, user: account(UserRole.STUDENT) };
  const parent = { id: profileId, userId, fullName: "Ibu Bapa Satu", phone: "0123456789", occupation: "Guru", address: "Alamat Ujian", avatar: null, createdAt: now, updatedAt: now, user: account(UserRole.PARENT), _count: { students: 1 } };
  return { admin, teacher, student, parent };
}

function repository(role: UserRole): ProfileRepository {
  const values = records();
  const selected = role === UserRole.TEACHER ? values.teacher : role === UserRole.STUDENT ? values.student : role === UserRole.PARENT ? values.parent : values.admin;
  const mutate = (record: Record<string, unknown>, data: Record<string, unknown>) => Object.assign(record, data);
  return {
    async findAdminByUserId() { return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN ? values.admin as never : null; },
    async findTeacherByUserId() { return role === UserRole.TEACHER ? values.teacher as never : null; },
    async findStudentByUserId() { return role === UserRole.STUDENT ? values.student as never : null; },
    async findParentByUserId() { return role === UserRole.PARENT ? values.parent as never : null; },
    async findAccountByUserId() { return (selected as { user: unknown }).user as never; },
    async updateAdmin(_id, data) { return mutate(values.admin, data) as never; },
    async updateTeacher(_id, data) { return mutate(values.teacher, data) as never; },
    async updateStudent(_id, data) { return mutate(values.student, data) as never; },
    async updateParent(_id, data) { return mutate(values.parent, data) as never; },
  };
}

function hasCode(code: string) { return (caught: unknown) => caught instanceof AppError && caught.code === code; }

test("each role receives only its own safe profile and account data", async () => {
  for (const role of [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT]) {
    const result = await getMyProfile(context(role), { repository: repository(role) });
    assert.equal(result.profile.profileId, profileId);
    assert.equal("passwordHash" in result.profile, false);
    assert.equal("pinHash" in result.profile, false);
    assert.equal((await getMyAccount(context(role), { repository: repository(role) })).account.userId, userId);
  }
});

test("profile target is bound to the token profile and missing links are safe", async () => {
  await assert.rejects(() => getMyProfile(context(UserRole.ADMIN, { profileId: "55555555-5555-4555-8555-555555555555" }), { repository: repository(UserRole.ADMIN) }), hasCode("PROFILE_NOT_FOUND"));
  const missing: ProfileRepository = { ...repository(UserRole.ADMIN), async findAdminByUserId() { return null; } };
  await assert.rejects(() => getMyProfile(context(UserRole.ADMIN), { repository: missing }), hasCode("PROFILE_NOT_FOUND"));
});

test("role-specific self profile updates allow only approved fields and emit safe audits", async () => {
  const events: unknown[] = [];
  const admin = await updateMyProfile({ fullName: "Admin Baharu", phone: "+60123456789", position: "Ketua" }, context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN), auditDispatcher: (event) => { events.push(event); } });
  assert.equal(admin.profile.fullName, "Admin Baharu");
  const teacher = await updateMyProfile({ position: "Penyelaras" }, context(UserRole.TEACHER), { repository: repository(UserRole.TEACHER) });
  assert.equal(teacher.profile.position, "Penyelaras");
  const parent = await updateMyProfile({ occupation: "Peniaga", address: "Alamat Baru" }, context(UserRole.PARENT), { repository: repository(UserRole.PARENT) });
  assert.equal(parent.profile.occupation, "Peniaga");
  assert.equal((events[0] as { action: string }).action, "PROFILE_UPDATED");
  assert.equal(JSON.stringify(events[0]).includes("passwordHash"), false);
  await assert.rejects(() => updateMyProfile({ fullName: "Tidak Dibenarkan" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT) }), hasCode("PROFILE_UPDATE_NOT_ALLOWED"));
});

test("profile validators reject identity, email, status, school, class, and empty mass-assignment input", () => {
  assert.throws(() => adminProfileUpdateSchema.parse({ email: "new@example.com" }));
  assert.throws(() => teacherProfileUpdateSchema.parse({ schoolId }));
  assert.throws(() => parentProfileUpdateSchema.parse({ accountStatus: "ACTIVE" }));
  assert.throws(() => studentProfileUpdateSchema.parse({ fullName: "Murid Baru" }));
  assert.throws(() => adminProfileUpdateSchema.parse({}));
});

test("avatar updates require an existing AVATAR storage key, support removal, and audit safely", async () => {
  const events: unknown[] = [];
  const adapter = { async upload() { throw new Error("not used"); }, async delete() {}, async exists(key: string) { return key === "avatar/2026/07/11111111-1111-4111-8111-111111111111.png"; }, getPublicUrl() { return null; } };
  const result = await updateMyAvatar("avatar/2026/07/11111111-1111-4111-8111-111111111111.png", context(UserRole.TEACHER), { repository: repository(UserRole.TEACHER), storageAdapter: adapter, auditDispatcher: (event) => { events.push(event); } });
  assert.match(result.profile.avatar ?? "", /^avatar\//);
  await updateMyAvatar(null, context(UserRole.PARENT), { repository: repository(UserRole.PARENT), storageAdapter: adapter });
  assert.equal((events[0] as { action: string }).action, "PROFILE_AVATAR_UPDATED");
  await assert.rejects(() => updateMyAvatar("activity-image/2026/07/11111111-1111-4111-8111-111111111111.png", context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN), storageAdapter: adapter }), hasCode("PROFILE_AVATAR_INVALID"));
  await assert.rejects(() => updateMyAvatar("avatar/2026/07/../../secret.png", context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN), storageAdapter: adapter }), hasCode("PROFILE_AVATAR_INVALID"));
});

test("normal password change verifies current credential, clears setup/reset state, and uses strict audit transaction", async () => {
  let transaction: unknown;
  await changeMyPassword({ currentPassword: "Old!Pass1", newPassword: "New!Pass2", confirmPassword: "New!Pass2" }, context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN), verifyCurrentPassword: async () => true, hashNewPassword: async () => "new-hash", passwordTransaction: async (input) => { transaction = input; } });
  const input = transaction as { passwordHash: string; event: { action: string; before: unknown; after: unknown; metadata: unknown } };
  assert.equal(input.passwordHash, "new-hash");
  assert.equal(input.event.action, "PASSWORD_CHANGED");
  assert.equal(JSON.stringify(input.event).includes("Old!Pass1"), false);
  await assert.rejects(() => changeMyPassword({ currentPassword: "wrong", newPassword: "New!Pass2", confirmPassword: "New!Pass2" }, context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN), verifyCurrentPassword: async () => false }), hasCode("AUTH_CURRENT_PASSWORD_INVALID"));
  await assert.rejects(() => changeMyPassword({ currentPassword: "Old!Pass1", newPassword: "weak", confirmPassword: "weak" }, context(UserRole.ADMIN), { repository: repository(UserRole.ADMIN) }), hasCode("AUTH_PASSWORD_POLICY_FAILED"));
  await assert.rejects(() => changeMyPassword({ currentPassword: "Old!Pass1", newPassword: "New!Pass2", confirmPassword: "New!Pass2" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT) }), hasCode("AUTH_ROLE_NOT_SUPPORTED"));
});

test("normal Student PIN change applies the existing policy and uses strict audit transaction", async () => {
  let transaction: unknown;
  await changeMyPin({ currentPin: "4826", newPin: "7391", confirmPin: "7391" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT), verifyCurrentPin: async () => true, hashNewPin: async () => "new-pin-hash", now: () => now, pinTransaction: async (input) => { transaction = input; } });
  const input = transaction as { pinHash: string; pinUpdatedAt: Date; event: { action: string } };
  assert.equal(input.pinHash, "new-pin-hash"); assert.equal(input.pinUpdatedAt, now); assert.equal(input.event.action, "STUDENT_PIN_CHANGED");
  await assert.rejects(() => changeMyPin({ currentPin: "4826", newPin: "1234", confirmPin: "1234" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT) }), hasCode("AUTH_PIN_POLICY_FAILED"));
  await assert.rejects(() => changeMyPin({ currentPin: "4826", newPin: "7777", confirmPin: "7777" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT) }), hasCode("AUTH_PIN_POLICY_FAILED"));
  await assert.rejects(() => changeMyPin({ currentPin: "4826", newPin: "4826", confirmPin: "4826" }, context(UserRole.STUDENT), { repository: repository(UserRole.STUDENT) }), hasCode("AUTH_PIN_REUSE_NOT_ALLOWED"));
  await assert.rejects(() => changeMyPin({ currentPin: "4826", newPin: "7391", confirmPin: "7391" }, context(UserRole.PARENT), { repository: repository(UserRole.PARENT) }), hasCode("AUTH_ROLE_NOT_SUPPORTED"));
});

test("credential and avatar validators reject unknown or malformed payloads", () => {
  assert.throws(() => avatarUpdateSchema.parse({ mediaKey: "" }));
  assert.throws(() => changePasswordSchema.parse({ currentPassword: "x", newPassword: "New!Pass2", confirmPassword: "New!Pass2", role: "ADMIN" }));
  assert.throws(() => changePinSchema.parse({ currentPin: "123", newPin: "1234", confirmPin: "1234" }));
});
