import assert from "node:assert/strict";
import test from "node:test";
import { AccountStatus, UserRole } from "@prisma/client";

import { prisma } from "../src/config/prisma.js";
import { AppError } from "../src/errors/app-error.js";
import { dispatchAuditEvent } from "../src/services/audit.service.js";
import { canStudentTransitionStatus, createStudent, createTeacherStudent, generateStudentLoginId, generateTemporaryStudentPin, listStudents, resetStudentPin } from "../src/services/student.service.js";
import { createStudentSchema, createTeacherStudentSchema, listStudentsQuerySchema, updateStudentSchema } from "../src/validators/student.validator.js";

const schoolId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";

test("student validators normalize IDs, enforce safe fields, and supply list defaults", () => {
  const student = createStudentSchema.parse({ schoolId, classId, studentId: " a-12_b ", fullName: "  Nur Aisyah  ", gender: "FEMALE", birthDate: "2015-05-20" });
  assert.equal(student.studentId, "A-12_B");
  assert.equal(student.fullName, "Nur Aisyah");
  assert.deepEqual(listStudentsQuerySchema.parse({}), { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  assert.throws(() => createStudentSchema.parse({ ...student, pinHash: "secret" }));
  const update = updateStudentSchema.parse({ fullName: "  Nur Aisyah  ", yearLevel: 2, classId, gender: "FEMALE" });
  assert.equal(update.fullName, "Nur Aisyah");
  assert.equal(update.yearLevel, 2);
  assert.equal(update.classId, classId);
  assert.equal(update.gender, "FEMALE");
  assert.throws(() => updateStudentSchema.parse({ classId }));
  assert.throws(() => updateStudentSchema.parse({}));
});

test("teacher student validator accepts only teacher-entered fields", () => {
  const remedialSkillId = "33333333-3333-4333-8333-333333333333";
  const student = createTeacherStudentSchema.parse({ classId, remedialSkillId, fullName: "  Kumar Raj  ", yearLevel: 2, gender: "MALE" });
  assert.equal(student.fullName, "Kumar Raj");
  assert.equal(student.yearLevel, 2);
  assert.equal(student.remedialSkillId, remedialSkillId);
  assert.equal("schoolId" in student, false);
  assert.equal("studentId" in student, false);
  assert.throws(() => createTeacherStudentSchema.parse({ classId, schoolId, remedialSkillId, fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" }));
  assert.throws(() => createTeacherStudentSchema.parse({ classId, studentId: "M7", remedialSkillId, fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" }));
  assert.throws(() => createTeacherStudentSchema.parse({ classId, pin: "0274", remedialSkillId, fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" }));
  assert.throws(() => createTeacherStudentSchema.parse({ classId, birthDate: "2017-04-12", remedialSkillId, fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" }));
  assert.throws(() => createTeacherStudentSchema.parse({ classId, fullName: "Kumar Raj", yearLevel: 7, remedialSkillId, gender: "MALE" }));
});

test("teacher student updates can change the supported classroom and identity fields only", () => {
  const update = updateStudentSchema.parse({ fullName: "  Kumar Raj  ", yearLevel: 2, classId, gender: "MALE" });

  assert.equal(update.fullName, "Kumar Raj");
  assert.equal(update.yearLevel, 2);
  assert.equal(update.classId, classId);
  assert.equal(update.gender, "MALE");
  assert.equal(updateStudentSchema.parse({ remedialSkillId: "33333333-3333-4333-8333-333333333333" }).remedialSkillId, "33333333-3333-4333-8333-333333333333");
  assert.throws(() => updateStudentSchema.parse({ schoolId }));
  assert.equal(updateStudentSchema.parse({ studentId: "M1" }).studentId, "M1");
  assert.equal(updateStudentSchema.parse({ birthDate: "2016-01-01" }).birthDate, "2016-01-01");
});

test("temporary Student PINs are four digits and never weak patterns", () => {
  for (let index = 0; index < 25; index += 1) {
    const pin = generateTemporaryStudentPin();
    assert.match(pin, /^\d{4}$/);
    assert.equal(/^(\d)\1{3}$/.test(pin), false);
    assert.equal(["0123", "1234", "2345", "3456", "4567", "5678", "6789", "9876", "8765", "7654", "6543", "5432", "4321", "3210"].includes(pin), false);
  }
});

test("generated student login IDs use the system format", () => {
  for (let index = 0; index < 10; index += 1) {
    assert.match(generateStudentLoginId(), /^MURID-[A-F0-9]{8}$/);
  }
});

test("student status policy reserves archived restoration for SUPER_ADMIN", () => {
  assert.equal(canStudentTransitionStatus("ACTIVE", "SUSPENDED", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("SUSPENDED", "ACTIVE", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("ACTIVE", "ARCHIVED", UserRole.ADMIN), true);
  assert.equal(canStudentTransitionStatus("ARCHIVED", "ACTIVE", UserRole.ADMIN), false);
  assert.equal(canStudentTransitionStatus("ARCHIVED", "ACTIVE", UserRole.SUPER_ADMIN), true);
  assert.equal(canStudentTransitionStatus("ACTIVE", "ACTIVE", UserRole.SUPER_ADMIN), false);
});

test("student and parent accounts are denied Student Management before database access", async () => {
  const parentContext = { actor: { userId: "user", profileId: "profile", role: UserRole.PARENT, schoolId: null, isFirstLogin: false } };
  const studentContext = { actor: { userId: "user", profileId: "profile", role: UserRole.STUDENT, schoolId, isFirstLogin: false } };
  await assert.rejects(() => listStudents(listStudentsQuerySchema.parse({}), parentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
  await assert.rejects(() => createStudent(createStudentSchema.parse({ schoolId, classId, studentId: "A12", fullName: "Nur Aisyah", gender: "FEMALE" }), studentContext), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_ROLE_FORBIDDEN");
});

test("teacher student list is scoped to the assigned school and not a single owned class", async () => {
  const originalFindMany = prisma.student.findMany;
  const originalCount = prisma.student.count;
  const teacherContext = { actor: { userId: "user", profileId: "teacher-profile", role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  let findManyWhere: unknown;
  let countWhere: unknown;

  prisma.student.findMany = (async (args: Record<string, unknown>) => {
    findManyWhere = args.where;
    return [];
  }) as typeof prisma.student.findMany;
  prisma.student.count = (async (args: Record<string, unknown>) => {
    countWhere = args.where;
    return 0;
  }) as typeof prisma.student.count;

  try {
    const result = await listStudents(listStudentsQuerySchema.parse({ search: "2 A", yearLevel: 2, classId }), teacherContext);

    assert.deepEqual(findManyWhere, {
      classId,
      class: { yearLevel: 2 },
      schoolId,
      OR: [
        { studentId: { contains: "2 A", mode: "insensitive" } },
        { fullName: { contains: "2 A", mode: "insensitive" } },
        { class: { className: { contains: "2 A", mode: "insensitive" } } },
        { school: { schoolName: { contains: "2 A", mode: "insensitive" } } },
      ],
    });
    assert.deepEqual(countWhere, findManyWhere);
    assert.equal(result.pagination.total, 0);
  } finally {
    prisma.student.findMany = originalFindMany;
    prisma.student.count = originalCount;
  }
});

test("teacher without a school receives a safe empty student list", async () => {
  const teacherContext = { actor: { userId: "user", profileId: "teacher-profile", role: UserRole.TEACHER, schoolId: null, isFirstLogin: false } };

  const result = await listStudents(listStudentsQuerySchema.parse({ page: 2 }), teacherContext);

  assert.deepEqual(result, {
    students: [],
    pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: true },
  });
});

test("teacher creates a student with generated ID and one-time raw PIN response", async () => {
  const originalTeacherFindUnique = prisma.teacher.findUnique;
  const originalRemedialSkillFindUnique = prisma.remedialSkill.findUnique;
  const originalClassFindUnique = prisma.schoolClass.findUnique;
  const originalTransaction = prisma.$transaction;
  const teacherContext = { actor: { userId: "teacher-user", profileId: "teacher-profile", role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  let createdStudentData: Record<string, unknown> | undefined;
  let auditAfter: unknown;

  prisma.teacher.findUnique = (async () => ({ id: "teacher-profile", schoolId, user: { accountStatus: AccountStatus.ACTIVE } })) as typeof prisma.teacher.findUnique;
  prisma.remedialSkill.findUnique = (async () => ({ id: "skill-1", status: "ACTIVE", programme: { curriculumVersion: { status: "PUBLISHED" } } })) as typeof prisma.remedialSkill.findUnique;
  prisma.schoolClass.findUnique = (async () => ({ id: classId, schoolId, yearLevel: 2, accountStatus: AccountStatus.ACTIVE })) as typeof prisma.schoolClass.findUnique;
  prisma.$transaction = (async (callback: (tx: { user: { create: (args: unknown) => Promise<{ id: string }> }; student: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } }) => Promise<unknown>) => callback({
    user: { create: async () => ({ id: "student-user" }) },
    student: {
      create: async (args) => {
        createdStudentData = args.data;
        return {
          id: "student-profile", userId: "student-user", schoolId, classId, studentId: args.data.studentId, fullName: "Kumar Raj",
          gender: "MALE", birthDate: null, avatar: null, isPinChanged: false, pinUpdatedAt: null,
          createdAt: new Date("2026-08-04T00:00:00.000Z"), updatedAt: new Date("2026-08-04T00:00:00.000Z"),
          remedialSkill: { id: "33333333-3333-4333-8333-333333333333", code: "KP04", name: "Suku kata KV", sequence: 4 },
          user: { id: "student-user", accountStatus: AccountStatus.ACTIVE, lastLogin: null },
          school: { id: schoolId, schoolCode: "ABC1234", schoolName: "SJKT Taman Harmoni" },
          class: { id: classId, schoolId, teacherId: "teacher-profile", className: "C", yearLevel: 2, academicYear: 2026 },
          _count: { parents: 0 },
        };
      },
    },
  })) as typeof prisma.$transaction;

  try {
    const result = await createTeacherStudent(
      createTeacherStudentSchema.parse({ classId, remedialSkillId: "33333333-3333-4333-8333-333333333333", fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" }),
      teacherContext,
      {
        pinGenerator: () => "0274",
        studentIdGenerator: () => "MURID-ABC12345",
        auditDispatcher: (event) => { auditAfter = event.after; },
      },
    );

    assert.equal(result.student.schoolId, schoolId);
    assert.equal(result.student.studentId, "MURID-ABC12345");
    assert.equal(result.student.accountStatus, AccountStatus.ACTIVE);
    assert.equal(result.student.remedialSkill?.id, "33333333-3333-4333-8333-333333333333");
    assert.deepEqual(result.credentials, { studentId: "MURID-ABC12345", temporaryPin: "0274" });
    assert.equal(createdStudentData?.schoolId, schoolId);
    assert.equal(createdStudentData?.remedialSkillId, "33333333-3333-4333-8333-333333333333");
    assert.equal(createdStudentData?.studentId, "MURID-ABC12345");
    assert.equal(createdStudentData?.birthDate, null);
    assert.equal(createdStudentData?.pinHash === "0274", false);
    assert.equal(typeof createdStudentData?.pinHash, "string");
    assert.equal(JSON.stringify(auditAfter).includes("0274"), false);
    assert.equal(JSON.stringify(auditAfter).includes(String(createdStudentData?.pinHash)), false);
  } finally {
    prisma.teacher.findUnique = originalTeacherFindUnique;
    prisma.remedialSkill.findUnique = originalRemedialSkillFindUnique;
    prisma.schoolClass.findUnique = originalClassFindUnique;
    prisma.$transaction = originalTransaction;
  }
});

test("teacher cannot create students without school context, with cross-school class, inactive class, or mismatched year", async () => {
  const originalTeacherFindUnique = prisma.teacher.findUnique;
  const originalRemedialSkillFindUnique = prisma.remedialSkill.findUnique;
  const originalClassFindUnique = prisma.schoolClass.findUnique;
  const context = { actor: { userId: "teacher-user", profileId: "teacher-profile", role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  const request = createTeacherStudentSchema.parse({ classId, remedialSkillId: "33333333-3333-4333-8333-333333333333", fullName: "Kumar Raj", yearLevel: 2, gender: "MALE" });

  prisma.teacher.findUnique = (async () => ({ id: "teacher-profile", schoolId, user: { accountStatus: AccountStatus.ACTIVE } })) as typeof prisma.teacher.findUnique;
  prisma.remedialSkill.findUnique = (async () => ({ id: "33333333-3333-4333-8333-333333333333", status: "ACTIVE", programme: { curriculumVersion: { status: "PUBLISHED" } } })) as typeof prisma.remedialSkill.findUnique;

  try {
    await assert.rejects(() => createTeacherStudent(request, { actor: { ...context.actor, schoolId: null } }), (caught: unknown) => caught instanceof AppError && caught.code === "AUTH_SCHOOL_CONTEXT_REQUIRED");
    prisma.schoolClass.findUnique = (async () => ({ id: classId, schoolId: "99999999-9999-4999-8999-999999999999", yearLevel: 2, accountStatus: AccountStatus.ACTIVE })) as typeof prisma.schoolClass.findUnique;
    await assert.rejects(() => createTeacherStudent(request, context), (caught: unknown) => caught instanceof AppError && caught.code === "STUDENT_CLASS_TRANSFER_INVALID");
    prisma.schoolClass.findUnique = (async () => ({ id: classId, schoolId, yearLevel: 2, accountStatus: AccountStatus.ARCHIVED })) as typeof prisma.schoolClass.findUnique;
    await assert.rejects(() => createTeacherStudent(request, context), (caught: unknown) => caught instanceof AppError && caught.code === "SCHOOL_CLASS_INACTIVE");
    prisma.schoolClass.findUnique = (async () => ({ id: classId, schoolId, yearLevel: 3, accountStatus: AccountStatus.ACTIVE })) as typeof prisma.schoolClass.findUnique;
    await assert.rejects(() => createTeacherStudent(request, context), (caught: unknown) => caught instanceof AppError && caught.code === "STUDENT_CLASS_TRANSFER_INVALID");
  } finally {
    prisma.teacher.findUnique = originalTeacherFindUnique;
    prisma.remedialSkill.findUnique = originalRemedialSkillFindUnique;
    prisma.schoolClass.findUnique = originalClassFindUnique;
  }
});

test("teacher can reset a same-school student PIN and receives one-time credentials only", async () => {
  const originalStudentFindUnique = prisma.student.findUnique;
  const originalStudentUpdate = prisma.student.update;
  const teacherContext = { actor: { userId: "user", profileId: "teacher-profile", role: UserRole.TEACHER, schoolId, isFirstLogin: false } };
  let findUniqueCalls = 0;
  let updateData: Record<string, unknown> | undefined;

  prisma.student.findUnique = (async () => {
    findUniqueCalls += 1;
    if (findUniqueCalls === 1) {
      return { id: "student-profile", schoolId, class: { schoolId } };
    }
    return { id: "student-profile", studentId: "MURID-0001", schoolId, classId, user: { accountStatus: AccountStatus.ACTIVE }, fullName: "Adik Aisyah", gender: "FEMALE", birthDate: null, avatar: null, isPinChanged: false, pinUpdatedAt: null, createdAt: new Date(), updatedAt: new Date(), school: { id: schoolId, schoolCode: "ABC1234", schoolName: "SJKT Taman Harmoni" }, class: { id: classId, schoolId, teacherId: "teacher-profile", className: "C", yearLevel: 2, academicYear: 2026, accountStatus: AccountStatus.ACTIVE }, _count: { parents: 0 } };
  }) as typeof prisma.student.findUnique;
  prisma.student.update = (async (args: { data: Record<string, unknown> }) => {
    updateData = args.data;
    return { id: "student-profile", userId: "student-user", schoolId, classId, studentId: "MURID-0001", fullName: "Adik Aisyah", gender: "FEMALE", birthDate: null, avatar: null, isPinChanged: false, pinUpdatedAt: new Date("2026-08-04T00:00:00.000Z"), createdAt: new Date("2026-07-10T08:00:00.000Z"), updatedAt: new Date("2026-08-04T00:00:00.000Z"), user: { id: "student-user", accountStatus: AccountStatus.ACTIVE, lastLogin: null }, school: { id: schoolId, schoolCode: "ABC1234", schoolName: "SJKT Taman Harmoni" }, class: { id: classId, schoolId, teacherId: "teacher-profile", className: "C", yearLevel: 2, academicYear: 2026, accountStatus: AccountStatus.ACTIVE }, _count: { parents: 0 } };
  }) as typeof prisma.student.update;

  try {
    const result = await resetStudentPin("student-profile", teacherContext, { pinGenerator: () => "0274", now: () => new Date("2026-08-04T00:00:00.000Z") });

    assert.equal(findUniqueCalls >= 2, true);
    assert.deepEqual(result, { credentials: { studentId: "MURID-0001", temporaryPin: "0274" } });
    assert.equal(updateData?.pinHash === "0274", false);
    assert.equal(JSON.stringify(updateData).includes("0274"), false);
  } finally {
    prisma.student.findUnique = originalStudentFindUnique;
    prisma.student.update = originalStudentUpdate;
  }
});

test("student audit actions retain context without credential values", async () => {
  let received: unknown;
  await dispatchAuditEvent({
    actorUserId: "actor-user", actorProfileId: "actor-profile", actorRole: UserRole.ADMIN, actorName: null,
    action: "STUDENT_PIN_RESET", resourceType: "STUDENT", resourceId: "student-profile", schoolId,
    before: null, after: { isPinChanged: false, pinUpdatedAt: new Date("2026-07-26T00:00:00.000Z") },
    timestamp: new Date("2026-07-26T00:00:00.000Z"), requestIp: "127.0.0.1", userAgent: "test",
  }, (event) => { received = event; });
  assert.deepEqual(received && JSON.parse(JSON.stringify(received)), {
    actorUserId: "actor-user", actorProfileId: "actor-profile", actorRole: "ADMIN", actorName: null,
    action: "STUDENT_PIN_RESET", resourceType: "STUDENT", resourceId: "student-profile", schoolId,
    before: null, after: { isPinChanged: false, pinUpdatedAt: "2026-07-26T00:00:00.000Z" },
    timestamp: "2026-07-26T00:00:00.000Z", requestIp: "127.0.0.1", userAgent: "test",
  });
});
