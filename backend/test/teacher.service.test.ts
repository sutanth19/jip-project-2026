import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, Gender, TeacherPermission, UserRole } from "@prisma/client";
import { ZodError } from "zod";

import { AppError } from "../src/errors/app-error.js";
import { assertTeacherClassSchoolAssignment } from "../src/services/schoolClass.service.js";
import {
  createTeacher,
  createTeacherPermissionGrant,
  getTeacherById,
  listTeacherPermissionGrants,
  listTeachers,
  resendTeacherSetup,
  revokeTeacherPermissionGrant,
  updateTeacher,
  updateTeacherStatus,
  type TeacherAccountRecord,
  type TeacherAuditContext,
  type TeacherDetailsRecord,
  type TeacherGrantRecord,
  type TeacherListFilters,
  type TeacherProvisionInput,
  type TeacherRepository,
} from "../src/services/teacher.service.js";
import {
  createTeacherGrantSchema,
  createTeacherSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
  updateTeacherStatusSchema,
} from "../src/validators/teacher.validator.js";

const schoolOneId = "11111111-1111-4111-8111-111111111111";
const schoolTwoId = "22222222-2222-4222-8222-222222222222";
const teacherOneId = "33333333-3333-4333-8333-333333333333";
const teacherTwoId = "44444444-4444-4444-8444-444444444444";
const fixedNow = new Date("2026-07-26T00:00:00.000Z");

const systemContext: TeacherAuditContext = {
  actor: {
    userId: "55555555-5555-4555-8555-555555555555",
    profileId: "66666666-6666-4666-8666-666666666666",
    role: UserRole.SUPER_ADMIN,
    schoolId: null,
    name: "System Super Admin",
  },
  requestIp: "127.0.0.1",
  userAgent: "node-test",
};

function createRecord(overrides: Partial<TeacherAccountRecord> = {}): TeacherAccountRecord {
  const record: TeacherAccountRecord = {
    id: teacherOneId,
    userId: "77777777-7777-4777-8777-777777777777",
    schoolId: schoolOneId,
    teacherId: "GURU001",
    fullName: "Cikgu Aisyah",
    gender: Gender.FEMALE,
    phone: "0123456789",
    position: "Guru Bahasa Melayu",
    avatar: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    school: {
      id: schoolOneId,
      schoolCode: "SKDA",
      schoolName: "Sekolah Kebangsaan Darul Aman",
    },
    user: {
      id: "77777777-7777-4777-8777-777777777777",
      role: UserRole.TEACHER,
      email: "aisyah@example.com",
      passwordHash: null,
      accountStatus: AccountStatus.PENDING,
      isFirstLogin: true,
      lastLogin: null,
      setupToken: "existing-setup-token",
      setupTokenExpiry: new Date("2026-07-27T00:00:00.000Z"),
    },
  };

  return {
    ...record,
    ...overrides,
    school: { ...record.school, ...(overrides.school ?? {}) },
    user: { ...record.user, ...(overrides.user ?? {}) },
  };
}

function clone(record: TeacherAccountRecord): TeacherAccountRecord {
  return {
    ...record,
    school: { ...record.school },
    user: { ...record.user },
  };
}

function createDetails(record: TeacherAccountRecord): TeacherDetailsRecord {
  return {
    ...clone(record),
    classes: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        schoolId: record.schoolId,
        className: "5 Cemerlang",
        yearLevel: 5,
        academicYear: 2026,
        accountStatus: AccountStatus.ACTIVE,
        _count: { students: 24 },
      },
    ],
  };
}

function createGrant(overrides: Partial<TeacherGrantRecord> = {}): TeacherGrantRecord {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    teacherId: teacherOneId,
    grantedById: systemContext.actor.profileId,
    permission: TeacherPermission.CREATE_TEACHER,
    expiresAt: null,
    maxUses: 2,
    usedCount: 0,
    isActive: true,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  };
}

function createRepository(initialRecords: TeacherAccountRecord[] = []) {
  const records = new Map(initialRecords.map((record) => [record.id, clone(record)]));
  const grants = new Map<string, TeacherGrantRecord>();
  const createdInputs: TeacherProvisionInput[] = [];
  const schoolIds = new Set([schoolOneId, schoolTwoId]);
  let nextId = 10;

  const repository: TeacherRepository = {
    async findById(id) {
      const record = records.get(id);
      return record ? clone(record) : null;
    },
    async findDetailsById(id) {
      const record = records.get(id);
      return record ? createDetails(record) : null;
    },
    async findBySchoolAndTeacherId(schoolId, teacherId) {
      const record = [...records.values()].find(
        (candidate) => candidate.schoolId === schoolId && candidate.teacherId === teacherId,
      );
      return record ? clone(record) : null;
    },
    async findByPhone(phone) {
      const record = [...records.values()].find((candidate) => candidate.phone === phone);
      return record ? clone(record) : null;
    },
    async findUserIdByEmail(email) {
      return [...records.values()].find((candidate) => candidate.user.email === email)?.userId ?? null;
    },
    async schoolExists(schoolId) {
      return schoolIds.has(schoolId);
    },
    async create(input) {
      createdInputs.push({ ...input });
      const suffix = String(nextId).padStart(12, "0");
      nextId += 1;
      const id = `00000000-0000-4000-8000-${suffix}`;
      const record = createRecord({
        id,
        userId: id,
        schoolId: input.schoolId,
        teacherId: input.teacherId,
        fullName: input.fullName,
        gender: input.gender,
        phone: input.phone,
        position: input.position,
        avatar: input.avatar,
        school: input.schoolId === schoolTwoId
          ? { id: schoolTwoId, schoolCode: "SKDB", schoolName: "Sekolah Kebangsaan Damai Bestari" }
          : { id: schoolOneId, schoolCode: "SKDA", schoolName: "Sekolah Kebangsaan Darul Aman" },
        user: {
          id,
          role: UserRole.TEACHER,
          email: input.email,
          passwordHash: null,
          accountStatus: AccountStatus.PENDING,
          isFirstLogin: true,
          lastLogin: null,
          setupToken: input.setupToken,
          setupTokenExpiry: input.setupTokenExpiry,
        },
      });
      records.set(id, record);
      return clone(record);
    },
    async findMany(filters: TeacherListFilters) {
      const search = filters.search?.toLowerCase();
      const filtered = [...records.values()]
        .filter((record) => record.user.role === UserRole.TEACHER)
        .filter((record) => !filters.status || record.user.accountStatus === filters.status)
        .filter((record) => !filters.schoolId || record.schoolId === filters.schoolId)
        .filter((record) => !filters.position || record.position === filters.position)
        .filter((record) => !search || [
          record.teacherId,
          record.fullName,
          record.user.email ?? "",
          record.phone ?? "",
          record.position ?? "",
        ].some((value) => value.toLowerCase().includes(search)))
        .sort((left, right) => {
          const leftValue = filters.sortBy === "email" || filters.sortBy === "accountStatus"
            ? left.user[filters.sortBy]
            : left[filters.sortBy];
          const rightValue = filters.sortBy === "email" || filters.sortBy === "accountStatus"
            ? right.user[filters.sortBy]
            : right[filters.sortBy];
          const comparison = String(leftValue).localeCompare(String(rightValue));
          return filters.sortOrder === "asc" ? comparison : -comparison;
        });
      return filtered.slice(filters.skip, filters.skip + filters.take).map(clone);
    },
    async count(filters) {
      const found = await repository.findMany({
        ...filters,
        skip: 0,
        take: Number.MAX_SAFE_INTEGER,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return found.length;
    },
    async updateProfile(id, input) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record");
      const next: TeacherAccountRecord = {
        ...current,
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
        user: {
          ...current.user,
          ...(input.email !== undefined ? { email: input.email } : {}),
        },
      };
      records.set(id, next);
      return clone(next);
    },
    async updateStatus(id, status) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record");
      const next = { ...current, user: { ...current.user, accountStatus: status } };
      records.set(id, next);
      return clone(next);
    },
    async refreshSetup(id, setupToken, setupTokenExpiry) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record");
      const next = {
        ...current,
        user: { ...current.user, setupToken, setupTokenExpiry },
      };
      records.set(id, next);
      return clone(next);
    },
    async createGrant(input) {
      const grant = createGrant({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(grants.size + 1).padStart(12, "0")}`,
        ...input,
      });
      grants.set(grant.id, grant);
      return { ...grant };
    },
    async findGrants(teacherId) {
      return [...grants.values()]
        .filter((grant) => grant.teacherId === teacherId)
        .map((grant) => ({ ...grant }));
    },
    async findGrant(teacherId, grantId) {
      const grant = grants.get(grantId);
      return grant?.teacherId === teacherId ? { ...grant } : null;
    },
    async revokeGrant(teacherId, grantId) {
      const grant = grants.get(grantId);
      if (!grant || grant.teacherId !== teacherId) throw new Error("Missing grant");
      const next = { ...grant, isActive: false };
      grants.set(grantId, next);
      return { ...next };
    },
  };

  return { repository, records, grants, createdInputs, schoolIds };
}

function assertAppError(error: unknown, code: string, statusCode: number): void {
  assert.ok(error instanceof AppError);
  assert.equal(error.code, code);
  assert.equal(error.statusCode, statusCode);
}

test("teacher provisioning normalizes input, uses pending setup state, and hides sensitive fields", async () => {
  const { repository, records } = createRepository();
  const events: unknown[] = [];
  const result = await createTeacher(
    createTeacherSchema.parse({
      schoolId: schoolOneId,
      teacherId: " guru-002 ",
      fullName: " Cikgu Baharu ",
      gender: Gender.MALE,
      email: " GURU.BARU@EXAMPLE.COM ",
      phone: "+60 12-345 6789",
    }),
    systemContext,
    {
      repository,
      now: () => fixedNow,
      setupTokenGenerator: () => "safe-test-token",
      invitationDispatcher: () => "DEVELOPMENT_PREVIEW",
      auditDispatcher: (event) => events.push(event),
    },
  );

  assert.equal(result.teacher.teacherId, "GURU-002");
  assert.equal(result.teacher.email, "guru.baru@example.com");
  assert.equal(result.teacher.phone, "0123456789");
  assert.equal(result.teacher.accountStatus, AccountStatus.PENDING);
  assert.equal(result.teacher.isFirstLogin, true);
  assert.equal(result.invitation.status, "DEVELOPMENT_PREVIEW");
  assert.equal("setupToken" in result.teacher, false);
  assert.equal("passwordHash" in result.teacher, false);
  const stored = [...records.values()][0];
  assert.equal(stored?.user.passwordHash, null);
  assert.equal(stored?.user.setupToken, "safe-test-token");
  assert.equal((events[0] as { action: string }).action, "TEACHER_CREATED");
});

test("teacher creation requires a valid grant and scopes a teacher creator to their own school", async () => {
  const { repository, createdInputs } = createRepository();
  const teacherContext: TeacherAuditContext = {
    ...systemContext,
    actor: {
      ...systemContext.actor,
      role: UserRole.TEACHER,
      profileId: teacherOneId,
      schoolId: schoolOneId,
    },
    permissionGrant: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      teacherId: teacherOneId,
      grantedById: systemContext.actor.profileId,
      permission: TeacherPermission.CREATE_TEACHER,
      maxUses: 1,
      usedCount: 0,
      expiresAt: null,
    },
  };
  const request = createTeacherSchema.parse({
    schoolId: schoolOneId,
    teacherId: "GURU003",
    fullName: "Cikgu Siti",
    gender: Gender.FEMALE,
    email: "siti@example.com",
  });

  await createTeacher(request, teacherContext, { repository, now: () => fixedNow });
  assert.deepEqual(createdInputs[0]?.permissionConsumption, {
    grantId: teacherContext.permissionGrant?.id,
    teacherId: teacherOneId,
    permission: TeacherPermission.CREATE_TEACHER,
  });

  await assert.rejects(
    createTeacher({ ...request, schoolId: schoolTwoId }, teacherContext, { repository }),
    (error: unknown) => {
      assertAppError(error, "AUTH_SCHOOL_ACCESS_DENIED", 403);
      return true;
    },
  );
});

test("teacher provisioning rejects duplicate school-scoped IDs, global emails, and globally unique phones", async () => {
  const existing = createRecord();
  const base = {
    schoolId: schoolOneId,
    teacherId: "GURU002",
    fullName: "Cikgu Lain",
    gender: Gender.MALE,
    email: "lain@example.com",
  };

  await assert.rejects(
    createTeacher(createTeacherSchema.parse({ ...base, teacherId: existing.teacherId }), systemContext, {
      repository: createRepository([existing]).repository,
    }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_ID_EXISTS", 409);
      return true;
    },
  );
  await assert.rejects(
    createTeacher(createTeacherSchema.parse({ ...base, email: existing.user.email }), systemContext, {
      repository: createRepository([existing]).repository,
    }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_EMAIL_EXISTS", 409);
      return true;
    },
  );
  await assert.rejects(
    createTeacher(createTeacherSchema.parse({ ...base, phone: existing.phone }), systemContext, {
      repository: createRepository([existing]).repository,
    }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_PHONE_EXISTS", 409);
      return true;
    },
  );
});

test("teacher list applies pagination, search, status, school, position, and safe sorting", async () => {
  const first = createRecord();
  const second = createRecord({
    id: teacherTwoId,
    userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    teacherId: "GURU010",
    fullName: "Cikgu Badrul",
    position: "Guru Matematik",
    schoolId: schoolTwoId,
    school: { id: schoolTwoId, schoolCode: "SKDB", schoolName: "Sekolah Kebangsaan Damai Bestari" },
    user: {
      ...first.user,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      email: "badrul@example.com",
      accountStatus: AccountStatus.SUSPENDED,
    },
  });
  const { repository } = createRepository([first, second]);
  const result = await listTeachers(
    listTeachersQuerySchema.parse({
      page: 1,
      limit: 10,
      search: "Badrul",
      status: AccountStatus.SUSPENDED,
      schoolId: schoolTwoId,
      position: "Guru Matematik",
      sortBy: "fullName",
      sortOrder: "asc",
    }),
    { repository },
  );

  assert.equal(result.pagination.total, 1);
  assert.equal(result.teachers[0]?.teacherId, "GURU010");
  assert.equal(result.teachers[0]?.accountStatus, AccountStatus.SUSPENDED);
});

test("teacher details return assigned classes and aggregate student count without setup fields", async () => {
  const result = await getTeacherById(teacherOneId, {
    repository: createRepository([createRecord()]).repository,
  });

  assert.equal(result.assignedClasses.length, 1);
  assert.equal(result.assignedClasses[0]?.studentCount, 24);
  assert.equal(result.studentCount, 24);
  assert.equal("setupToken" in result, false);
  assert.equal("passwordHash" in result, false);
});

test("teacher updates normalize email and phone while rejecting another teacher's unique data", async () => {
  const first = createRecord({ user: { ...createRecord().user, accountStatus: AccountStatus.ACTIVE } });
  const second = createRecord({
    id: teacherTwoId,
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    phone: "0198765432",
    user: { ...first.user, id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", email: "second@example.com" },
  });
  const { repository } = createRepository([first, second]);
  const result = await updateTeacher(
    first.id,
    updateTeacherSchema.parse({ email: " BARU@EXAMPLE.COM ", phone: "+60 12-555 7777", position: "Guru Kanan" }),
    systemContext,
    { repository },
  );
  assert.equal(result.email, "baru@example.com");
  assert.equal(result.phone, "0125557777");
  assert.equal(result.position, "Guru Kanan");

  await assert.rejects(
    updateTeacher(first.id, updateTeacherSchema.parse({ phone: second.phone }), systemContext, { repository }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_PHONE_EXISTS", 409);
      return true;
    },
  );
});

test("teacher status policy allows operational transitions and reserves archived restoration for SUPER_ADMIN", async () => {
  const active = createRecord({ user: { ...createRecord().user, accountStatus: AccountStatus.ACTIVE } });
  const { repository } = createRepository([active]);
  const suspended = await updateTeacherStatus(active.id, AccountStatus.SUSPENDED, systemContext, { repository });
  assert.equal(suspended.accountStatus, AccountStatus.SUSPENDED);
  const archived = await updateTeacherStatus(active.id, AccountStatus.ARCHIVED, systemContext, { repository });
  assert.equal(archived.accountStatus, AccountStatus.ARCHIVED);
  const restored = await updateTeacherStatus(active.id, AccountStatus.ACTIVE, systemContext, { repository });
  assert.equal(restored.accountStatus, AccountStatus.ACTIVE);

  const adminContext: TeacherAuditContext = {
    ...systemContext,
    actor: { ...systemContext.actor, role: UserRole.ADMIN },
  };
  await updateTeacherStatus(active.id, AccountStatus.ARCHIVED, systemContext, { repository });
  await assert.rejects(
    updateTeacherStatus(active.id, AccountStatus.ACTIVE, adminContext, { repository }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_STATUS_TRANSITION_INVALID", 403);
      return true;
    },
  );
});

test("teacher setup invitations refresh setup state without exposing raw tokens", async () => {
  const existing = createRecord();
  const { repository, records } = createRepository([existing]);
  const result = await resendTeacherSetup(existing.id, systemContext, {
    repository,
    now: () => fixedNow,
    setupTokenGenerator: () => "replacement-token",
    invitationDispatcher: () => "DEVELOPMENT_PREVIEW",
  });

  assert.equal(result.invitation.status, "DEVELOPMENT_PREVIEW");
  assert.equal((records.get(existing.id)?.user.setupToken), "replacement-token");
  assert.equal("setupToken" in result, false);

  const completed = createRecord({
    id: teacherTwoId,
    user: {
      ...existing.user,
      passwordHash: "hashed-password",
      isFirstLogin: false,
      accountStatus: AccountStatus.ACTIVE,
    },
  });
  await assert.rejects(
    resendTeacherSetup(completed.id, systemContext, { repository: createRepository([completed]).repository }),
    (error: unknown) => {
      assertAppError(error, "TEACHER_SETUP_ALREADY_COMPLETED", 409);
      return true;
    },
  );
});

test("teacher permission grants support creation, listing, revocation, remaining uses, and safe audit payloads", async () => {
  const existing = createRecord();
  const { repository } = createRepository([existing]);
  const events: unknown[] = [];
  const grant = await createTeacherPermissionGrant(
    existing.id,
    createTeacherGrantSchema.parse({ permission: TeacherPermission.CREATE_TEACHER, maxUses: 3 }),
    systemContext,
    { repository, auditDispatcher: (event) => events.push(event) },
  );
  assert.equal(grant.remainingUses, 3);
  assert.equal(grant.permission, TeacherPermission.CREATE_TEACHER);
  const listed = await listTeacherPermissionGrants(existing.id, { repository });
  assert.equal(listed.length, 1);
  const revoked = await revokeTeacherPermissionGrant(existing.id, grant.id, systemContext, {
    repository,
    auditDispatcher: (event) => events.push(event),
  });
  assert.equal(revoked.isActive, false);
  assert.equal((events[0] as { action: string }).action, "TEACHER_PERMISSION_GRANTED");
  assert.equal((events[1] as { action: string }).action, "TEACHER_PERMISSION_REVOKED");
  assert.equal(JSON.stringify(events).includes("setupToken"), false);
});

test("teacher validators reject mass assignment, invalid phone values, invalid grant expiry, and unsafe sorting", () => {
  assert.throws(
    () => createTeacherSchema.parse({
      schoolId: schoolOneId,
      teacherId: "GURU001",
      fullName: "Cikgu Aisyah",
      gender: Gender.FEMALE,
      email: "aisyah@example.com",
      accountStatus: AccountStatus.ACTIVE,
    }),
    ZodError,
  );
  assert.throws(
    () => createTeacherSchema.parse({
      schoolId: schoolOneId,
      teacherId: "GURU001",
      fullName: "Cikgu Aisyah",
      gender: Gender.FEMALE,
      email: "aisyah@example.com",
      phone: "not-a-phone",
    }),
    ZodError,
  );
  assert.throws(
    () => listTeachersQuerySchema.parse({ sortBy: "passwordHash" }),
    ZodError,
  );
  assert.throws(
    () => updateTeacherStatusSchema.parse({ status: AccountStatus.PENDING }),
    ZodError,
  );
  assert.throws(
    () => createTeacherGrantSchema.parse({
      permission: TeacherPermission.CREATE_TEACHER,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    }),
    ZodError,
  );
});

test("class assignment is rejected when a teacher and class belong to different schools", () => {
  assert.doesNotThrow(() => assertTeacherClassSchoolAssignment(schoolOneId, schoolOneId));
  assert.throws(
    () => assertTeacherClassSchoolAssignment(schoolOneId, schoolTwoId),
    (error: unknown) => {
      assertAppError(error, "TEACHER_SCHOOL_ASSIGNMENT_INVALID", 400);
      return true;
    },
  );
});
