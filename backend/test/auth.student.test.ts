import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  changeFirstPin,
  studentLogin,
  type AuthSession,
} from "../src/services/auth.service.js";
import type { AccessTokenPayload } from "../src/utils/jwt.js";

interface MockStudentUser {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
}

interface MockSchool {
  id: string;
}

interface MockSchoolClass {
  id: string;
  schoolId: string;
  className: string;
  yearLevel: number;
}

interface MockStudent {
  id: string;
  userId: string;
  schoolId: string;
  classId: string;
  studentId: string;
  fullName: string;
  pinHash: string | null;
  isPinChanged: boolean;
  pinUpdatedAt: Date | null;
  user: MockStudentUser | null;
  school: MockSchool | null;
  class: MockSchoolClass | null;
}

interface MockState {
  student: MockStudent | null;
  studentFindUniqueArgs?: Record<string, unknown>;
  userUpdateArgs?: Record<string, unknown>;
  studentUpdateArgs?: Record<string, unknown>;
}

type StudentResolver = (
  args: Record<string, unknown>,
  state: MockState,
) => MockStudent | null;

function getData(args: Record<string, unknown>): Record<string, unknown> {
  const data = args.data;

  if (!data || typeof data !== "object") {
    throw new Error("Expected Prisma update data.");
  }

  return data as Record<string, unknown>;
}

function createMockDb(
  initialStudent: MockStudent | null,
  resolver?: StudentResolver,
) {
  const state: MockState = {
    student: initialStudent,
  };

  const db = {
    user: {
      update: async (args: Record<string, unknown>) => {
        state.userUpdateArgs = args;
        return null;
      },
    },
    student: {
      findUnique: async (args: Record<string, unknown>) => {
        state.studentFindUniqueArgs = args;
        return resolver ? resolver(args, state) : state.student;
      },
      update: async (args: Record<string, unknown>) => {
        state.studentUpdateArgs = args;

        if (!state.student) {
          throw new Error("No student loaded.");
        }

        const data = getData(args);

        state.student = {
          ...state.student,
          pinHash:
            typeof data.pinHash === "string"
              ? data.pinHash
              : state.student.pinHash,
          isPinChanged:
            typeof data.isPinChanged === "boolean"
              ? data.isPinChanged
              : state.student.isPinChanged,
          pinUpdatedAt:
            data.pinUpdatedAt instanceof Date
              ? data.pinUpdatedAt
              : state.student.pinUpdatedAt,
        };

        return state.student;
      },
    },
  };

  return { db, state };
}

function createStudent(overrides: Partial<MockStudent> = {}): MockStudent {
  const schoolId = overrides.schoolId ?? "school-1";
  const classId = overrides.classId ?? "class-1";

  return {
    id: "student-1",
    userId: "student-user-1",
    schoolId,
    classId,
    studentId: "M-001",
    fullName: "Murid Satu",
    pinHash: "hashed-pin",
    isPinChanged: false,
    pinUpdatedAt: null,
    user: {
      id: "student-user-1",
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
    },
    school: {
      id: schoolId,
    },
    class: {
      id: classId,
      schoolId,
      className: "1 Cemerlang",
      yearLevel: 1,
    },
    ...overrides,
  };
}

function readCompositeStudentLookup(
  args: Record<string, unknown>,
): { schoolId: string; studentId: string } | null {
  const where = args.where;

  if (!where || typeof where !== "object") {
    return null;
  }

  const composite = (where as Record<string, unknown>).schoolId_studentId;

  if (!composite || typeof composite !== "object") {
    return null;
  }

  const schoolId = (composite as Record<string, unknown>).schoolId;
  const studentId = (composite as Record<string, unknown>).studentId;

  return typeof schoolId === "string" && typeof studentId === "string"
    ? { schoolId, studentId }
    : null;
}

const fixedNow = new Date("2026-07-26T00:00:00.000Z");
const accessTokenExpiresIn = "15m";

const fixedStudentAuth: AuthSession = {
  userId: "student-user-1",
  role: UserRole.STUDENT,
  profileId: "student-1",
  schoolId: "school-1",
  isFirstLogin: false,
  requiresPinChange: true,
};

function signAccessToken(payload: AccessTokenPayload): string {
  return `token:${payload.sub}:${String(payload.requiresPinChange)}`;
}

test("valid student PIN login returns scoped profile and token", async () => {
  const { db } = createMockDb(createStudent());

  const result = await studentLogin(
    {
      schoolId: "school-1",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async () => true,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(result.accessToken, "token:student-user-1:true");
  assert.equal(result.expiresIn, accessTokenExpiresIn);
  assert.equal(result.requiresPinChange, true);
  assert.deepEqual(result.user, {
    id: "student-user-1",
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
  });
  assert.deepEqual(result.profile, {
    id: "student-1",
    studentId: "M-001",
    fullName: "Murid Satu",
    schoolId: "school-1",
    classId: "class-1",
    className: "1 Cemerlang",
    yearLevel: 1,
  });
});

test("invalid student PIN is rejected without exposing the record", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    studentLogin(
      {
        schoolId: "school-1",
        studentId: "M-001",
        pin: "9999",
      },
      {
        db: db as never,
        comparePin: async () => false,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_INVALID_CREDENTIALS" &&
      error.message === "ID murid atau PIN tidak sah.",
  );
});

test("a student lookup with the wrong school ID is rejected", async () => {
  const student = createStudent();
  const { db, state } = createMockDb(student, (args) => {
    const lookup = readCompositeStudentLookup(args);

    return lookup?.schoolId === student.schoolId &&
      lookup.studentId === student.studentId
      ? student
      : null;
  });

  await assert.rejects(
    studentLogin(
      {
        schoolId: "school-2",
        studentId: "M-001",
        pin: "2468",
      },
      {
        db: db as never,
        comparePin: async () => true,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_INVALID_CREDENTIALS",
  );

  assert.deepEqual(readCompositeStudentLookup(state.studentFindUniqueArgs ?? {}), {
    schoolId: "school-2",
    studentId: "M-001",
  });
});

test("duplicate student IDs in different schools resolve only within the requested school", async () => {
  const schoolOneStudent = createStudent({
    id: "student-school-1",
    userId: "student-user-school-1",
    schoolId: "school-1",
    classId: "class-school-1",
    pinHash: "hashed-pin-school-1",
    user: {
      id: "student-user-school-1",
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
    },
    school: { id: "school-1" },
    class: {
      id: "class-school-1",
      schoolId: "school-1",
      className: "1 Cemerlang",
      yearLevel: 1,
    },
  });
  const schoolTwoStudent = createStudent({
    id: "student-school-2",
    userId: "student-user-school-2",
    schoolId: "school-2",
    classId: "class-school-2",
    pinHash: "hashed-pin-school-2",
    user: {
      id: "student-user-school-2",
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
    },
    school: { id: "school-2" },
    class: {
      id: "class-school-2",
      schoolId: "school-2",
      className: "1 Bestari",
      yearLevel: 1,
    },
  });

  const { db } = createMockDb(schoolOneStudent, (args) => {
    const lookup = readCompositeStudentLookup(args);

    if (
      lookup?.schoolId === schoolOneStudent.schoolId &&
      lookup.studentId === schoolOneStudent.studentId
    ) {
      return schoolOneStudent;
    }

    if (
      lookup?.schoolId === schoolTwoStudent.schoolId &&
      lookup.studentId === schoolTwoStudent.studentId
    ) {
      return schoolTwoStudent;
    }

    return null;
  });

  const result = await studentLogin(
    {
      schoolId: "school-2",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async (_pin, hash) => hash === "hashed-pin-school-2",
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(result.user.id, "student-user-school-2");
  assert.equal(result.profile.id, "student-school-2");
  assert.equal(result.profile.schoolId, "school-2");
});

test("non-active student accounts are blocked", async () => {
  const { db } = createMockDb(
    createStudent({
      user: {
        id: "student-user-1",
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.SUSPENDED,
      },
    }),
  );

  await assert.rejects(
    studentLogin(
      {
        schoolId: "school-1",
        studentId: "M-001",
        pin: "2468",
      },
      {
        db: db as never,
        comparePin: async () => true,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_ACCOUNT_SUSPENDED",
  );
});

test("student login rejects records linked to a non-student user", async () => {
  const { db } = createMockDb(
    createStudent({
      user: {
        id: "teacher-user-1",
        role: UserRole.TEACHER,
        accountStatus: AccountStatus.ACTIVE,
      },
    }),
  );

  await assert.rejects(
    studentLogin(
      {
        schoolId: "school-1",
        studentId: "M-001",
        pin: "2468",
      },
      {
        db: db as never,
        comparePin: async () => true,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_INVALID_CREDENTIALS",
  );
});

test("student login blocks school and class mismatches", async () => {
  const { db } = createMockDb(
    createStudent({
      class: {
        id: "class-1",
        schoolId: "school-2",
        className: "1 Cemerlang",
        yearLevel: 1,
      },
    }),
  );

  await assert.rejects(
    studentLogin(
      {
        schoolId: "school-1",
        studentId: "M-001",
        pin: "2468",
      },
      {
        db: db as never,
        comparePin: async () => true,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_STUDENT_SCHOOL_CLASS_MISMATCH",
  );
});

test("student login responses never include a PIN hash", async () => {
  const { db } = createMockDb(createStudent({ pinHash: "secret-pin-hash" }));

  const result = await studentLogin(
    {
      schoolId: "school-1",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async () => true,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(JSON.stringify(result).includes("secret-pin-hash"), false);
  assert.equal("pinHash" in result.user, false);
  assert.equal("pinHash" in result.profile, false);
});

test("successful student login updates lastLogin", async () => {
  const { db, state } = createMockDb(createStudent());

  await studentLogin(
    {
      schoolId: "school-1",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async () => true,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.deepEqual(getData(state.userUpdateArgs ?? {}).lastLogin, fixedNow);
});

test("student login requires an initial PIN change when the PIN is unchanged", async () => {
  const { db } = createMockDb(createStudent({ isPinChanged: false }));

  const result = await studentLogin(
    {
      schoolId: "school-1",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async () => true,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(result.requiresPinChange, true);
});

test("student login does not require a PIN change after the initial PIN is changed", async () => {
  const { db } = createMockDb(createStudent({ isPinChanged: true }));

  const result = await studentLogin(
    {
      schoolId: "school-1",
      studentId: "M-001",
      pin: "2468",
    },
    {
      db: db as never,
      comparePin: async () => true,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(result.requiresPinChange, false);
});

test("valid initial PIN change returns a replacement token", async () => {
  const { db } = createMockDb(createStudent());

  const result = await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async (pin, hash) => pin === "2468" && hash === "hashed-pin",
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(result.accessToken, "token:student-user-1:false");
  assert.equal(result.requiresPinChange, false);
  assert.deepEqual(result.user, {
    id: "student-user-1",
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
  });
});

test("first PIN change rejects an invalid current PIN", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "9999",
        newPin: "4826",
        confirmPin: "4826",
      },
      {
        db: db as never,
        comparePin: async () => false,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_CURRENT_PIN_INVALID",
  );
});

test("first PIN change rejects a mismatched confirmation", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "2468",
        newPin: "4826",
        confirmPin: "6284",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_PIN_CONFIRMATION_MISMATCH",
  );
});

test("first PIN change rejects reuse of the current PIN", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "2468",
        newPin: "2468",
        confirmPin: "2468",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_PIN_REUSE_NOT_ALLOWED",
  );
});

test("first PIN change rejects sequential PINs", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "2468",
        newPin: "1234",
        confirmPin: "1234",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_PIN_POLICY_FAILED",
  );
});

test("first PIN change rejects repeated-digit PINs", async () => {
  const { db } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "2468",
        newPin: "1111",
        confirmPin: "1111",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_PIN_POLICY_FAILED",
  );
});

test("first PIN change is blocked after the initial PIN was changed", async () => {
  const { db } = createMockDb(createStudent({ isPinChanged: true }));

  await assert.rejects(
    changeFirstPin(
      {
        auth: fixedStudentAuth,
        currentPin: "2468",
        newPin: "4826",
        confirmPin: "4826",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_PIN_CHANGE_NOT_REQUIRED",
  );
});

test("first PIN change rejects non-student tokens before querying a profile", async () => {
  const { db, state } = createMockDb(createStudent());

  await assert.rejects(
    changeFirstPin(
      {
        auth: {
          ...fixedStudentAuth,
          role: UserRole.ADMIN,
          profileId: "admin-1",
          schoolId: "school-1",
          isFirstLogin: true,
        },
        currentPin: "2468",
        newPin: "4826",
        confirmPin: "4826",
      },
      {
        db: db as never,
        comparePin: async () => true,
        hashNewPin: async (pin) => `hashed:${pin}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_STUDENT_ONLY",
  );

  assert.equal(state.studentFindUniqueArgs, undefined);
});

test("first PIN change updates the PIN hash", async () => {
  const { db, state } = createMockDb(createStudent());

  await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async () => true,
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(state.student?.pinHash, "hashed:4826");
});

test("first PIN change marks the student PIN as changed", async () => {
  const { db, state } = createMockDb(createStudent());

  await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async () => true,
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(state.student?.isPinChanged, true);
});

test("first PIN change records pinUpdatedAt", async () => {
  const { db, state } = createMockDb(createStudent());

  await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async () => true,
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.deepEqual(state.student?.pinUpdatedAt, fixedNow);
});

test("replacement student token carries requiresPinChange false", async () => {
  const { db } = createMockDb(createStudent());
  let capturedPayload: AccessTokenPayload | null = null;

  await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async () => true,
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken: (payload) => {
        capturedPayload = payload;
        return `token:${payload.sub}`;
      },
      accessTokenExpiresIn,
    },
  );

  assert.equal(capturedPayload?.isFirstLogin, false);
  assert.equal(capturedPayload?.requiresPinChange, false);
});

test("first PIN change responses never include PIN values or hashes", async () => {
  const { db } = createMockDb(createStudent({ pinHash: "secret-pin-hash" }));

  const result = await changeFirstPin(
    {
      auth: fixedStudentAuth,
      currentPin: "2468",
      newPin: "4826",
      confirmPin: "4826",
    },
    {
      db: db as never,
      comparePin: async () => true,
      hashNewPin: async (pin) => `hashed:${pin}`,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  const response = JSON.stringify(result);

  assert.equal(response.includes("secret-pin-hash"), false);
  assert.equal(response.includes("2468"), false);
  assert.equal(response.includes("4826"), false);
});
