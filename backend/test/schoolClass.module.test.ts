import assert from "node:assert/strict";
import test from "node:test";
import { AccountStatus, UserRole } from "@prisma/client";

import { prisma } from "../src/config/prisma.js";
import { AppError } from "../src/errors/app-error.js";
import { dispatchAuditEvent } from "../src/services/audit.service.js";
import { canSchoolClassTransitionStatus, createSchoolClass, createTeacherSchoolClass, getSchoolClassById, getSchoolClasses, normalizeSchoolClassName, removeStudentFromSchoolClass, updateSchoolClass, updateSchoolClassStatus } from "../src/services/schoolClass.service.js";
import { createSchoolClassSchema, createTeacherSchoolClassSchema, listClassStudentsQuerySchema, listSchoolClassesQuerySchema, updateSchoolClassSchema } from "../src/validators/schoolClass.validator.js";

const schoolId = "11111111-1111-4111-8111-111111111111";
const teacherId = "22222222-2222-4222-8222-222222222222";
const classId = "33333333-3333-4333-8333-333333333333";
const studentId = "44444444-4444-4444-8444-444444444444";

test("class validators enforce the V1 shape, bounds, safe sorting, and pagination", () => {
  const created = createSchoolClassSchema.parse({ schoolId, teacherId, className: "  1 Amanah ", yearLevel: 1, academicYear: 2026, capacity: 30 });
  assert.equal(created.className, "1 Amanah");
  assert.equal(createTeacherSchoolClassSchema.parse({ className: " A ", yearLevel: 2, academicYear: 2026 }).className, "A");
  assert.deepEqual(listSchoolClassesQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.deepEqual(listClassStudentsQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.throws(() => createSchoolClassSchema.parse({ ...created, accountStatus: "ARCHIVED" }));
  assert.equal(createSchoolClassSchema.parse({ ...created, yearLevel: 6 }).yearLevel, 6);
  assert.throws(() => createSchoolClassSchema.parse({ ...created, yearLevel: 7 }));
  assert.throws(() => createTeacherSchoolClassSchema.parse({ className: "   ", yearLevel: 2, academicYear: 2026 }));
  assert.throws(() => createTeacherSchoolClassSchema.parse({ className: "A".repeat(51), yearLevel: 2, academicYear: 2026 }));
  assert.throws(() => updateSchoolClassSchema.parse({ teacherId }));
  assert.throws(() => updateSchoolClassSchema.parse({}));
  assert.equal(normalizeSchoolClassName("  A  "), "a");
});

test("class status policy supports operational changes and reserves archived restoration", () => {
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "SUSPENDED", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("SUSPENDED", "ACTIVE", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "ARCHIVED", UserRole.ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ARCHIVED", "ACTIVE", UserRole.ADMIN), false);
  assert.equal(canSchoolClassTransitionStatus("ARCHIVED", "ACTIVE", UserRole.SUPER_ADMIN), true);
  assert.equal(canSchoolClassTransitionStatus("ACTIVE", "ACTIVE", UserRole.SUPER_ADMIN), false);
});

test("non-management accounts are denied class reads and writes before database access", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const studentContext = { actor: { userId: "user", profileId: studentId, role: UserRole.STUDENT, schoolId, isFirstLogin: false } };
  const parentContext = { actor: { userId: "user", profileId: "parent", role: UserRole.PARENT, schoolId: null, isFirstLogin: false } };
  const payload = createSchoolClassSchema.parse({ schoolId, teacherId, className: "1 Amanah", yearLevel: 1, academicYear: 2026 });
  await assert.rejects(() => createSchoolClass(payload, teacherContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => getSchoolClasses(listSchoolClassesQuerySchema.parse({}), parentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => removeStudentFromSchoolClass(classId, studentId, studentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
});

test("class removal is explicitly unsupported and cannot orphan a student", async () => {
  const context = { actor: { userId: "user", profileId: "admin", role: UserRole.ADMIN, schoolId: null, isFirstLogin: false } };
  await assert.rejects(() => removeStudentFromSchoolClass(classId, studentId, context), (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_STUDENT_REMOVAL_NOT_SUPPORTED" && caught.statusCode === 400);
});

test("class audit actions retain actor, class, school, and safe assignment data", async () => {
  let received: unknown;
  await dispatchAuditEvent({
    actorUserId: "actor-user", actorProfileId: "admin", actorRole: UserRole.ADMIN, actorName: null,
    action: "CLASS_TEACHER_CHANGED", resourceType: "CLASS", resourceId: classId, schoolId,
    before: { teacherId: "old-teacher" }, after: { teacherId }, timestamp: new Date("2026-07-26T00:00:00.000Z"), requestIp: "127.0.0.1", userAgent: "test",
  }, (event) => { received = event; });
  assert.deepEqual(received && JSON.parse(JSON.stringify(received)), {
    actorUserId: "actor-user", actorProfileId: "admin", actorRole: "ADMIN", actorName: null,
    action: "CLASS_TEACHER_CHANGED", resourceType: "CLASS", resourceId: classId, schoolId,
    before: { teacherId: "old-teacher" }, after: { teacherId }, timestamp: "2026-07-26T00:00:00.000Z", requestIp: "127.0.0.1", userAgent: "test",
  });
});

test("teacher class list is enforced to the assigned school and supports real filters", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalFindMany = prisma.schoolClass.findMany;
  const originalCount = prisma.schoolClass.count;
  const now = new Date("2026-08-03T00:00:00.000Z");
  let receivedWhere: unknown;
  let receivedOrderBy: unknown;

  prisma.schoolClass.findMany = (async (args: Record<string, unknown>) => {
    receivedWhere = args.where;
    receivedOrderBy = args.orderBy;
    return [
      {
        id: classId,
        schoolId,
        teacherId,
        className: "Bestari",
        yearLevel: 2,
        academicYear: 2026,
        capacity: 30,
        accountStatus: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
        teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
        _count: { students: 3 },
      },
    ];
  }) as typeof prisma.schoolClass.findMany;
  prisma.schoolClass.count = (async () => 1) as typeof prisma.schoolClass.count;

  try {
    const result = await getSchoolClasses(
      listSchoolClassesQuerySchema.parse({
        page: 2,
        limit: 5,
        search: "Tahun 2",
        yearLevel: 2,
        academicYear: 2026,
        status: "ACTIVE",
        sortBy: "yearLevel",
        sortOrder: "asc",
      }),
      teacherContext,
    );

    assert.equal(result.classes.length, 1);
    assert.equal(result.classes[0]?.studentCount, 3);
    assert.equal(result.pagination.page, 2);
    assert.equal(result.pagination.total, 1);
    assert.deepEqual(receivedOrderBy, { yearLevel: "asc" });
    assert.deepEqual(receivedWhere, {
      accountStatus: "ACTIVE",
      yearLevel: 2,
      academicYear: 2026,
      schoolId,
      OR: [
        { className: { contains: "Tahun 2", mode: "insensitive" } },
        { school: { schoolName: { contains: "Tahun 2", mode: "insensitive" } } },
        { school: { schoolCode: { contains: "Tahun 2", mode: "insensitive" } } },
        { teacher: { fullName: { contains: "Tahun 2", mode: "insensitive" } } },
        { teacher: { teacherId: { contains: "Tahun 2", mode: "insensitive" } } },
        { yearLevel: 2 },
      ],
    });
  } finally {
    prisma.schoolClass.findMany = originalFindMany;
    prisma.schoolClass.count = originalCount;
  }
});

test("teacher without a school receives a safe empty scoped response", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId: null, isFirstLogin: false } };
  const result = await getSchoolClasses(listSchoolClassesQuerySchema.parse({ page: 1, limit: 10 }), teacherContext);

  assert.deepEqual(result, {
    classes: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

test("teacher can retrieve same-school class details with real student count and academic fields", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalFindUnique = prisma.schoolClass.findUnique;
  const originalStudentCount = prisma.student.count;
  const now = new Date("2026-08-03T00:00:00.000Z");
  const archivedAt = new Date("2026-08-04T00:00:00.000Z");
  const lookups: unknown[] = [];
  let studentCountWhere: unknown;

  prisma.schoolClass.findUnique = (async (args: Record<string, unknown>) => {
    lookups.push(args);
    return {
      id: classId,
      schoolId,
      teacherId,
      className: "A",
      normalizedClassName: "a",
      yearLevel: 2,
      academicYear: 2026,
      capacity: 30,
      accountStatus: "ARCHIVED",
      createdAt: now,
      updatedAt: archivedAt,
      school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
      teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
      _count: { students: 4 },
    };
  }) as typeof prisma.schoolClass.findUnique;
  prisma.student.count = (async (args: Record<string, unknown>) => {
    studentCountWhere = args.where;
    return 2;
  }) as typeof prisma.student.count;

  try {
    const result = await getSchoolClassById(classId, teacherContext);

    assert.equal(result.class.className, "A");
    assert.equal(result.class.yearLevel, 2);
    assert.equal(result.class.academicYear, 2026);
    assert.equal(result.class.accountStatus, "ARCHIVED");
    assert.equal(result.class.studentCount, 4);
    assert.deepEqual(result.class.capacitySummary, { capacity: 30, occupied: 2, availableSeats: 28 });
    assert.deepEqual(studentCountWhere, {
      classId,
      user: { accountStatus: { in: ["ACTIVE", "SUSPENDED"] } },
    });
    assert.equal(lookups.length, 2);
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
    prisma.student.count = originalStudentCount;
  }
});

test("teacher class details reject another school and teachers without school safely", async () => {
  const originalFindUnique = prisma.schoolClass.findUnique;
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const noSchoolContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId: null, isFirstLogin: false } };

  prisma.schoolClass.findUnique = (async () => ({ schoolId: "99999999-9999-4999-8999-999999999999" })) as typeof prisma.schoolClass.findUnique;

  try {
    await assert.rejects(
      () => getSchoolClassById(classId, teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_OWNER_ACCESS_DENIED",
    );
    await assert.rejects(
      () => getSchoolClassById(classId, noSchoolContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_OWNER_ACCESS_DENIED",
    );
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
  }
});

test("teacher can update own-school class fields while preserving duplicate protection", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalFindUnique = prisma.schoolClass.findUnique;
  const originalFindFirst = prisma.schoolClass.findFirst;
  const originalUpdate = prisma.schoolClass.update;
  const now = new Date("2026-08-03T00:00:00.000Z");
  let duplicateWhere: unknown;
  let updateData: unknown;

  prisma.schoolClass.findUnique = (async () => ({
    id: classId,
    schoolId,
    teacherId,
    className: "A",
    normalizedClassName: "a",
    yearLevel: 1,
    academicYear: 2026,
    capacity: null,
    accountStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
    teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
    _count: { students: 2 },
  })) as typeof prisma.schoolClass.findUnique;
  prisma.schoolClass.findFirst = (async (args: Record<string, unknown>) => {
    duplicateWhere = args.where;
    return { id: classId };
  }) as typeof prisma.schoolClass.findFirst;
  prisma.schoolClass.update = (async (args: Record<string, unknown>) => {
    updateData = args.data;
    return {
      id: classId,
      schoolId,
      teacherId,
      className: "Bestari",
      normalizedClassName: "bestari",
      yearLevel: 2,
      academicYear: 2027,
      capacity: null,
      accountStatus: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
      teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
      _count: { students: 2 },
    };
  }) as typeof prisma.schoolClass.update;

  try {
    const result = await updateSchoolClass(
      classId,
      updateSchoolClassSchema.parse({ className: " Bestari ", yearLevel: 2, academicYear: 2027 }),
      teacherContext,
      { auditDispatcher: async () => undefined },
    );

    assert.equal(result.className, "Bestari");
    assert.equal(result.yearLevel, 2);
    assert.equal(result.academicYear, 2027);
    assert.deepEqual(duplicateWhere, {
      schoolId,
      academicYear: 2027,
      yearLevel: 2,
      normalizedClassName: "bestari",
    });
    assert.deepEqual(updateData, { className: "Bestari", normalizedClassName: "bestari", yearLevel: 2, academicYear: 2027 });
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
    prisma.schoolClass.findFirst = originalFindFirst;
    prisma.schoolClass.update = originalUpdate;
  }
});

test("teacher class update rejects cross-school access, school moves, capacity changes, and normalized duplicates", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalFindUnique = prisma.schoolClass.findUnique;
  const originalFindFirst = prisma.schoolClass.findFirst;
  const now = new Date("2026-08-03T00:00:00.000Z");
  const baseRecord = {
    id: classId,
    schoolId,
    teacherId,
    className: "A",
    normalizedClassName: "a",
    yearLevel: 1,
    academicYear: 2026,
    capacity: null,
    accountStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
    teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
    _count: { students: 2 },
  };

  try {
    assert.throws(() => updateSchoolClassSchema.parse({ schoolId }));

    prisma.schoolClass.findUnique = (async () => ({ ...baseRecord, schoolId: "99999999-9999-4999-8999-999999999999" })) as typeof prisma.schoolClass.findUnique;
    await assert.rejects(
      () => updateSchoolClass(classId, updateSchoolClassSchema.parse({ className: "B" }), teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_OWNER_ACCESS_DENIED",
    );

    prisma.schoolClass.findUnique = (async () => baseRecord) as typeof prisma.schoolClass.findUnique;
    await assert.rejects(
      () => updateSchoolClass(classId, updateSchoolClassSchema.parse({ capacity: 30 }), teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_TEACHER_UPDATE_INVALID",
    );

    prisma.schoolClass.findFirst = (async () => ({ id: "55555555-5555-4555-8555-555555555555" })) as typeof prisma.schoolClass.findFirst;
    await assert.rejects(
      () => updateSchoolClass(classId, updateSchoolClassSchema.parse({ className: " a ", yearLevel: 2 }), teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_ALREADY_EXISTS",
    );
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
    prisma.schoolClass.findFirst = originalFindFirst;
  }
});

test("teacher can archive and reactivate same-school classes without deleting student relations", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalFindUnique = prisma.schoolClass.findUnique;
  const originalUpdate = prisma.schoolClass.update;
  const now = new Date("2026-08-03T00:00:00.000Z");
  const baseRecord = {
    id: classId,
    schoolId,
    teacherId,
    className: "A",
    normalizedClassName: "a",
    yearLevel: 1,
    academicYear: 2026,
    capacity: null,
    accountStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
    teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
    _count: { students: 2 },
  };
  let nextStatus: unknown;

  prisma.schoolClass.update = (async (args: Record<string, unknown>) => {
    const data = args.data as { accountStatus: AccountStatus };
    nextStatus = data.accountStatus;
    return { ...baseRecord, accountStatus: data.accountStatus };
  }) as typeof prisma.schoolClass.update;

  try {
    prisma.schoolClass.findUnique = (async () => baseRecord) as typeof prisma.schoolClass.findUnique;
    const archived = await updateSchoolClassStatus(classId, AccountStatus.ARCHIVED, teacherContext, { auditDispatcher: async () => undefined });
    assert.equal(archived.accountStatus, AccountStatus.ARCHIVED);
    assert.equal(archived.studentCount, 2);
    assert.equal(nextStatus, AccountStatus.ARCHIVED);

    prisma.schoolClass.findUnique = (async () => ({ ...baseRecord, accountStatus: AccountStatus.ARCHIVED })) as typeof prisma.schoolClass.findUnique;
    const restored = await updateSchoolClassStatus(classId, AccountStatus.ACTIVE, teacherContext, { auditDispatcher: async () => undefined });
    assert.equal(restored.accountStatus, AccountStatus.ACTIVE);
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
    prisma.schoolClass.update = originalUpdate;
  }
});

test("teacher class status changes reject unsupported transitions and missing school context", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const noSchoolContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId: null, isFirstLogin: false } };
  const originalFindUnique = prisma.schoolClass.findUnique;
  const now = new Date("2026-08-03T00:00:00.000Z");

  prisma.schoolClass.findUnique = (async () => ({
    id: classId,
    schoolId,
    teacherId,
    className: "A",
    normalizedClassName: "a",
    yearLevel: 1,
    academicYear: 2026,
    capacity: null,
    accountStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
    teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
    _count: { students: 2 },
  })) as typeof prisma.schoolClass.findUnique;

  try {
    await assert.rejects(
      () => updateSchoolClassStatus(classId, AccountStatus.SUSPENDED, teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_STATUS_TRANSITION_INVALID",
    );
    await assert.rejects(
      () => updateSchoolClassStatus(classId, AccountStatus.ARCHIVED, noSchoolContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_OWNER_ACCESS_DENIED",
    );
    assert.equal(canSchoolClassTransitionStatus(AccountStatus.ARCHIVED, AccountStatus.ACTIVE, UserRole.TEACHER), true);
    assert.equal(canSchoolClassTransitionStatus(AccountStatus.ACTIVE, AccountStatus.SUSPENDED, UserRole.TEACHER), false);
  } finally {
    prisma.schoolClass.findUnique = originalFindUnique;
  }
});

test("teacher can create a class for their own school with normalized duplicate protection", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalTeacherFindUnique = prisma.teacher.findUnique;
  const originalClassFindFirst = prisma.schoolClass.findFirst;
  const originalClassCreate = prisma.schoolClass.create;
  const now = new Date("2026-08-03T00:00:00.000Z");
  let duplicateWhere: unknown;
  let createdData: unknown;

  prisma.teacher.findUnique = (async () => ({
    id: teacherId,
    schoolId,
    user: { accountStatus: "ACTIVE" },
  })) as typeof prisma.teacher.findUnique;
  prisma.schoolClass.findFirst = (async (args: Record<string, unknown>) => {
    duplicateWhere = args.where;
    return null;
  }) as typeof prisma.schoolClass.findFirst;
  prisma.schoolClass.create = (async (args: Record<string, unknown>) => {
    createdData = args.data;
    return {
      id: classId,
      schoolId,
      teacherId,
      className: "A",
      normalizedClassName: "a",
      yearLevel: 2,
      academicYear: 2026,
      capacity: null,
      accountStatus: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
      teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
      _count: { students: 0 },
    };
  }) as typeof prisma.schoolClass.create;

  try {
    const result = await createTeacherSchoolClass(
      createTeacherSchoolClassSchema.parse({ className: "  A  ", yearLevel: 2, academicYear: 2026 }),
      teacherContext,
    );

    assert.equal(result.className, "A");
    assert.equal(result.yearLevel, 2);
    assert.deepEqual(duplicateWhere, {
      schoolId,
      academicYear: 2026,
      yearLevel: 2,
      normalizedClassName: "a",
    });
    assert.deepEqual(createdData, {
      schoolId,
      teacherId,
      className: "A",
      normalizedClassName: "a",
      yearLevel: 2,
      academicYear: 2026,
      capacity: null,
      accountStatus: "ACTIVE",
    });
  } finally {
    prisma.teacher.findUnique = originalTeacherFindUnique;
    prisma.schoolClass.findFirst = originalClassFindFirst;
    prisma.schoolClass.create = originalClassCreate;
  }
});

test("teacher duplicate checks allow the same class name across different year levels but reject the same normalized year-level combination", async () => {
  const teacherContext = { actor: { userId: "user", profileId: teacherId, role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const originalTeacherFindUnique = prisma.teacher.findUnique;
  const originalClassFindFirst = prisma.schoolClass.findFirst;

  prisma.teacher.findUnique = (async () => ({
    id: teacherId,
    schoolId,
    user: { accountStatus: "ACTIVE" },
  })) as typeof prisma.teacher.findUnique;

  try {
    prisma.schoolClass.findFirst = (async () => ({ id: classId })) as typeof prisma.schoolClass.findFirst;
    await assert.rejects(
      () => createTeacherSchoolClass(createTeacherSchoolClassSchema.parse({ className: " a ", yearLevel: 2, academicYear: 2026 }), teacherContext),
      (caught: unknown) => caught instanceof AppError && caught.code === "CLASS_ALREADY_EXISTS",
    );

    prisma.schoolClass.findFirst = (async () => null) as typeof prisma.schoolClass.findFirst;
    const originalCreate = prisma.schoolClass.create;
    prisma.schoolClass.create = (async () => ({
      id: classId,
      schoolId,
      teacherId,
      className: "A",
      normalizedClassName: "a",
      yearLevel: 3,
      academicYear: 2026,
      capacity: null,
      accountStatus: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
      school: { id: schoolId, schoolCode: "SKTM", schoolName: "SJK(T) Seri Maju" },
      teacher: { id: teacherId, teacherId: "GURU001", fullName: "Cikgu Aisyah", user: { accountStatus: "ACTIVE" } },
      _count: { students: 0 },
    })) as typeof prisma.schoolClass.create;
    try {
      const created = await createTeacherSchoolClass(createTeacherSchoolClassSchema.parse({ className: "A", yearLevel: 3, academicYear: 2026 }), teacherContext);
      assert.equal(created.yearLevel, 3);
    } finally {
      prisma.schoolClass.create = originalCreate;
    }
  } finally {
    prisma.teacher.findUnique = originalTeacherFindUnique;
    prisma.schoolClass.findFirst = originalClassFindFirst;
  }
});
