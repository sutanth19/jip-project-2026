import { AccountStatus, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import {
  hashPassword,
  hashPin,
  verifyPassword,
  verifyPin,
} from "../utils/bcrypt.js";
import {
  generateAccessToken,
  getAccessTokenExpiresIn,
} from "../utils/jwt.js";

export interface LoginInput {
  role: UserRole;
  loginId: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthSession {
  userId: string;
  role: UserRole;
  profileId: string;
  schoolId: string | null;
  isFirstLogin: boolean;
  requiresPinChange?: boolean;
}

type UserRecord = {
  id: string;
  role: UserRole;
  email: string | null;
  passwordHash: string | null;
  accountStatus: AccountStatus;
  isFirstLogin: boolean;
  setupToken?: string | null;
  setupTokenExpiry?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  admin?: {
    id: string;
    fullName: string;
    schoolId: string | null;
  } | null;
  teacher?: {
    id: string;
    fullName: string;
    schoolId: string;
    user?: {
      id: string;
      role: UserRole;
      email: string | null;
      passwordHash: string | null;
      accountStatus: AccountStatus;
      isFirstLogin: boolean;
    } | null;
  } | null;
  parent?: {
    id: string;
    fullName: string;
  } | null;
};

type TeacherRecord = {
  id: string;
  fullName: string;
  schoolId: string;
  user: {
    id: string;
    role: UserRole;
    email: string | null;
    passwordHash: string | null;
    accountStatus: AccountStatus;
    isFirstLogin: boolean;
  };
};

type ParentRecord = {
  id: string;
  fullName: string;
  user: {
    id: string;
    role: UserRole;
    email: string | null;
    passwordHash: string | null;
    accountStatus: AccountStatus;
    isFirstLogin: boolean;
  };
};

type StudentUserRecord = {
  id: string;
  role: UserRole;
  accountStatus: AccountStatus;
};

type StudentRecord = {
  id: string;
  userId: string;
  schoolId: string;
  classId: string;
  studentId: string;
  fullName: string;
  pinHash: string | null;
  isPinChanged: boolean;
  pinUpdatedAt: Date | null;
  user: StudentUserRecord | null;
  school: {
    id: string;
  } | null;
  class: {
    id: string;
    schoolId: string;
    className: string;
    yearLevel: number;
  } | null;
};

type AuthDb = {
  user: {
    findUnique(args: Record<string, unknown>): Promise<UserRecord | null>;
    update(args: Record<string, unknown>): Promise<UserRecord>;
  };
  teacher: {
    findMany(args: Record<string, unknown>): Promise<TeacherRecord[]>;
  };
  parent: {
    findFirst(args: Record<string, unknown>): Promise<ParentRecord | null>;
  };
};

type StudentAuthDb = {
  user: {
    update(args: Record<string, unknown>): Promise<unknown>;
  };
  student: {
    findUnique(args: Record<string, unknown>): Promise<StudentRecord | null>;
    update(args: Record<string, unknown>): Promise<StudentRecord>;
  };
};

export interface LoginDependencies {
  db?: AuthDb;
  comparePassword?: typeof verifyPassword;
  signAccessToken?: typeof generateAccessToken;
  accessTokenExpiresIn?: string;
  now?: () => Date;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  requiresPasswordChange: boolean;
  user: {
    id: string;
    role: UserRole;
    email: string | null;
    accountStatus: AccountStatus;
    isFirstLogin: boolean;
  };
  profile: {
    id: string;
    fullName: string;
    schoolId: string | null;
  };
}

export interface ChangeFirstPasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  auth: AuthSession;
}

export interface ChangeFirstPasswordResult {
  accessToken: string;
  expiresIn: string;
  requiresPasswordChange: false;
  user: {
    id: string;
    role: UserRole;
    email: string | null;
    accountStatus: AccountStatus;
    isFirstLogin: false;
  };
}

export interface ChangeFirstPasswordDependencies {
  db?: AuthDb;
  comparePassword?: typeof verifyPassword;
  hashNewPassword?: typeof hashPassword;
  signAccessToken?: typeof generateAccessToken;
  accessTokenExpiresIn?: string;
}

export interface StudentLoginInput {
  schoolId: string;
  studentId: string;
  pin: string;
}

export interface StudentLoginDependencies {
  db?: StudentAuthDb;
  comparePin?: typeof verifyPin;
  signAccessToken?: typeof generateAccessToken;
  accessTokenExpiresIn?: string;
  now?: () => Date;
}

export interface StudentLoginResult {
  accessToken: string;
  expiresIn: string;
  requiresPinChange: boolean;
  user: {
    id: string;
    role: "STUDENT";
    accountStatus: AccountStatus;
  };
  profile: {
    id: string;
    studentId: string;
    fullName: string;
    schoolId: string;
    classId: string;
    className: string;
    yearLevel: number;
  };
}

export interface ChangeFirstPinInput {
  currentPin: string;
  newPin: string;
  confirmPin: string;
  auth: AuthSession;
}

export interface ChangeFirstPinDependencies {
  db?: StudentAuthDb;
  comparePin?: typeof verifyPin;
  hashNewPin?: typeof hashPin;
  signAccessToken?: typeof generateAccessToken;
  accessTokenExpiresIn?: string;
  now?: () => Date;
}

export interface ChangeFirstPinResult {
  accessToken: string;
  expiresIn: string;
  requiresPinChange: false;
  user: {
    id: string;
    role: "STUDENT";
    accountStatus: AccountStatus;
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneCandidates(value: string): string[] {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s().-]/g, "");
  const digitsOnly = compact.replace(/[^\d+]/g, "");

  return [...new Set([trimmed, compact, digitsOnly].filter(Boolean))];
}

function isEmailLike(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

function getAccountStatusError(status: AccountStatus): AppError {
  switch (status) {
    case AccountStatus.PENDING:
      return new AppError(
        "AUTH_ACCOUNT_PENDING",
        403,
        "Akaun belum diaktifkan.",
      );
    case AccountStatus.LOCKED:
      return new AppError(
        "AUTH_ACCOUNT_LOCKED",
        403,
        "Akaun telah dikunci.",
      );
    case AccountStatus.SUSPENDED:
      return new AppError(
        "AUTH_ACCOUNT_SUSPENDED",
        403,
        "Akaun telah digantung.",
      );
    case AccountStatus.ARCHIVED:
      return new AppError(
        "AUTH_ACCOUNT_ARCHIVED",
        403,
        "Akaun telah diarkibkan.",
      );
    default:
      return new AppError(
        "AUTH_INVALID_CREDENTIALS",
        401,
        "Kod atau kata laluan tidak sah.",
      );
  }
}

function invalidCredentials(): AppError {
  return new AppError(
    "AUTH_INVALID_CREDENTIALS",
    401,
    "Kod atau kata laluan tidak sah.",
  );
}

function roleMismatch(): AppError {
  return new AppError(
    "AUTH_ROLE_MISMATCH",
    403,
    "Peranan akaun tidak sepadan.",
  );
}

function studentEndpointRequired(): AppError {
  return new AppError(
    "AUTH_STUDENT_ENDPOINT_REQUIRED",
    400,
    "Student PIN login uses a separate endpoint.",
  );
}

function ambiguousTeacherId(): AppError {
  return new AppError(
    "AUTH_AMBIGUOUS_TEACHER_ID",
    409,
    "Teacher ID is ambiguous. Please select a school in a later step.",
  );
}

function passwordChangeNotRequired(): AppError {
  return new AppError(
    "AUTH_PASSWORD_CHANGE_NOT_REQUIRED",
    403,
    "Penukaran kata laluan kali pertama tidak diperlukan.",
  );
}

function currentPasswordInvalid(): AppError {
  return new AppError(
    "AUTH_CURRENT_PASSWORD_INVALID",
    401,
    "Kata laluan semasa tidak sah.",
  );
}

function passwordConfirmationMismatch(): AppError {
  return new AppError(
    "AUTH_PASSWORD_CONFIRMATION_MISMATCH",
    400,
    "Pengesahan kata laluan tidak sepadan.",
  );
}

function passwordReuseNotAllowed(): AppError {
  return new AppError(
    "AUTH_PASSWORD_REUSE_NOT_ALLOWED",
    400,
    "Kata laluan baharu mestilah berbeza daripada kata laluan semasa.",
  );
}

function passwordPolicyFailed(): AppError {
  return new AppError(
    "AUTH_PASSWORD_POLICY_FAILED",
    400,
    "Kata laluan baharu tidak memenuhi keperluan keselamatan.",
  );
}

function studentPasswordChangeNotAllowed(): AppError {
  return new AppError(
    "AUTH_STUDENT_PASSWORD_CHANGE_NOT_ALLOWED",
    400,
    "Student PIN login uses a separate endpoint.",
  );
}

function invalidStudentCredentials(): AppError {
  return new AppError(
    "AUTH_INVALID_CREDENTIALS",
    401,
    "ID murid atau PIN tidak sah.",
  );
}

function studentSchoolClassMismatch(): AppError {
  return new AppError(
    "AUTH_STUDENT_SCHOOL_CLASS_MISMATCH",
    409,
    "Maklumat sekolah dan kelas murid tidak sah.",
  );
}

function studentOnly(): AppError {
  return new AppError(
    "AUTH_STUDENT_ONLY",
    403,
    "Akses ini untuk murid sahaja.",
  );
}

function pinChangeNotRequired(): AppError {
  return new AppError(
    "AUTH_PIN_CHANGE_NOT_REQUIRED",
    403,
    "Penukaran PIN kali pertama tidak diperlukan.",
  );
}

function currentPinInvalid(): AppError {
  return new AppError(
    "AUTH_CURRENT_PIN_INVALID",
    401,
    "PIN semasa tidak sah.",
  );
}

function pinConfirmationMismatch(): AppError {
  return new AppError(
    "AUTH_PIN_CONFIRMATION_MISMATCH",
    400,
    "Pengesahan PIN tidak sepadan.",
  );
}

function pinReuseNotAllowed(): AppError {
  return new AppError(
    "AUTH_PIN_REUSE_NOT_ALLOWED",
    400,
    "PIN baharu mestilah berbeza daripada PIN semasa.",
  );
}

function pinPolicyFailed(): AppError {
  return new AppError(
    "AUTH_PIN_POLICY_FAILED",
    400,
    "PIN baharu terlalu mudah diteka.",
  );
}

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 8 &&
    value.length <= 128 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value)
  );
}

function isValidPin(value: string): boolean {
  return /^\d{4}$/.test(value);
}

function isSequentialPin(value: string): boolean {
  let ascending = true;
  let descending = true;

  for (let index = 1; index < value.length; index += 1) {
    const previous = Number(value[index - 1]);
    const current = Number(value[index]);

    if (current !== (previous + 1) % 10) {
      ascending = false;
    }

    if (current !== (previous + 9) % 10) {
      descending = false;
    }
  }

  return ascending || descending;
}

export function isWeakPin(value: string): boolean {
  return /^(\d)\1{3}$/.test(value) || isSequentialPin(value);
}

function assertStudentSchoolClassConsistency(student: StudentRecord): void {
  if (
    !student.school ||
    !student.class ||
    student.school.id !== student.schoolId ||
    student.class.schoolId !== student.schoolId
  ) {
    throw studentSchoolClassMismatch();
  }
}

function getStudentUserForLogin(student: StudentRecord): StudentUserRecord {
  if (!student.user || student.user.role !== UserRole.STUDENT) {
    throw invalidStudentCredentials();
  }

  return student.user;
}

function getStudentUserForPinChange(student: StudentRecord): StudentUserRecord {
  if (!student.user || student.user.role !== UserRole.STUDENT) {
    throw studentOnly();
  }

  return student.user;
}

function resolveProfile(user: UserRecord): {
  id: string;
  fullName: string;
  schoolId: string | null;
} {
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    if (!user.admin) {
      throw invalidCredentials();
    }

    return {
      id: user.admin.id,
      fullName: user.admin.fullName,
      schoolId: user.admin.schoolId ?? null,
    };
  }

  if (user.role === UserRole.TEACHER) {
    if (!user.teacher) {
      throw invalidCredentials();
    }

    return {
      id: user.teacher.id,
      fullName: user.teacher.fullName,
      schoolId: user.teacher.schoolId,
    };
  }

  if (user.role === UserRole.PARENT) {
    if (!user.parent) {
      throw invalidCredentials();
    }

    return {
      id: user.parent.id,
      fullName: user.parent.fullName,
      schoolId: null,
    };
  }

  throw studentEndpointRequired();
}

function buildSuccessPayload(
  user: UserRecord,
  profile: { id: string; fullName: string; schoolId: string | null },
  signAccessTokenFn: typeof generateAccessToken,
  accessTokenExpiresIn: string,
): LoginResult {
  const accessToken = signAccessTokenFn({
    sub: user.id,
    role: user.role,
    profileId: profile.id,
    schoolId: profile.schoolId,
    isFirstLogin: user.isFirstLogin,
  });

  return {
    accessToken,
    expiresIn: accessTokenExpiresIn,
    requiresPasswordChange: user.isFirstLogin,
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      accountStatus: user.accountStatus,
      isFirstLogin: user.isFirstLogin,
    },
    profile,
  };
}

async function loginByEmail(
  db: AuthDb,
  role: UserRole,
  email: string,
): Promise<{ user: UserRecord; profile: { id: string; fullName: string; schoolId: string | null } }> {
  const include =
    role === UserRole.TEACHER
      ? { teacher: true }
      : role === UserRole.PARENT
        ? { parent: true }
        : { admin: true };

  const user = (await db.user.findUnique({
    where: { email },
    include,
  })) as UserRecord | null;

  if (!user) {
    throw invalidCredentials();
  }

  if (user.role !== role) {
    throw roleMismatch();
  }

  return {
    user,
    profile: resolveProfile(user),
  };
}

async function loginTeacherById(
  db: AuthDb,
  teacherId: string,
): Promise<{ user: UserRecord; profile: { id: string; fullName: string; schoolId: string | null } }> {
  const matches = (await db.teacher.findMany({
    where: { teacherId },
    include: { user: true },
  })) as TeacherRecord[];

  if (matches.length > 1) {
    throw ambiguousTeacherId();
  }

  const teacher = matches[0];

  if (!teacher) {
    throw invalidCredentials();
  }

  if (teacher.user.role !== UserRole.TEACHER) {
    throw roleMismatch();
  }

  return {
    user: teacher.user,
    profile: {
      id: teacher.id,
      fullName: teacher.fullName,
      schoolId: teacher.schoolId,
    },
  };
}

async function loginParentByPhone(
  db: AuthDb,
  loginId: string,
): Promise<{ user: UserRecord; profile: { id: string; fullName: string; schoolId: string | null } }> {
  const phoneCandidates = normalizePhoneCandidates(loginId);

  const parent = (await db.parent.findFirst({
    where: {
      phone: {
        in: phoneCandidates,
      },
    },
    include: { user: true },
  })) as ParentRecord | null;

  if (!parent) {
    throw invalidCredentials();
  }

  if (parent.user.role !== UserRole.PARENT) {
    throw roleMismatch();
  }

  return {
    user: parent.user,
    profile: {
      id: parent.id,
      fullName: parent.fullName,
      schoolId: null,
    },
  };
}

export async function login(
  input: LoginInput,
  deps: LoginDependencies = {},
): Promise<LoginResult> {
  const db = deps.db ?? (prisma as unknown as AuthDb);
  const comparePassword = deps.comparePassword ?? verifyPassword;
  const signAccessToken = deps.signAccessToken ?? generateAccessToken;
  const accessTokenExpiresIn =
    deps.accessTokenExpiresIn ?? String(getAccessTokenExpiresIn());
  const now = deps.now ?? (() => new Date());

  if (input.role === UserRole.STUDENT) {
    throw studentEndpointRequired();
  }

  const loginId = input.loginId.trim();

  if (!loginId) {
    throw new AppError("AUTH_INVALID_INPUT", 400, "Login ID diperlukan.");
  }

  const emailLike = isEmailLike(loginId);
  const normalizedEmail = normalizeEmail(loginId);

  let resolved: {
    user: UserRecord;
    profile: { id: string; fullName: string; schoolId: string | null };
  };

  if (input.role === UserRole.SUPER_ADMIN || input.role === UserRole.ADMIN) {
    if (!emailLike) {
      throw invalidCredentials();
    }

    resolved = await loginByEmail(db, input.role, normalizedEmail);
  } else if (input.role === UserRole.TEACHER) {
    resolved = emailLike
      ? await loginByEmail(db, UserRole.TEACHER, normalizedEmail)
      : await loginTeacherById(db, loginId);
  } else {
    resolved = emailLike
      ? await loginByEmail(db, UserRole.PARENT, normalizedEmail)
      : await loginParentByPhone(db, loginId);
  }

  const { user, profile } = resolved;

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw getAccountStatusError(user.accountStatus);
  }

  if (!user.passwordHash) {
    throw invalidCredentials();
  }

  const passwordIsValid = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordIsValid) {
    throw invalidCredentials();
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLogin: now(),
    },
  });

  return buildSuccessPayload(
    user,
    profile,
    signAccessToken,
    accessTokenExpiresIn,
  );
}

export async function changeFirstPassword(
  input: ChangeFirstPasswordInput,
  deps: ChangeFirstPasswordDependencies = {},
): Promise<ChangeFirstPasswordResult> {
  const db = deps.db ?? (prisma as unknown as AuthDb);
  const comparePassword = deps.comparePassword ?? verifyPassword;
  const hashNewPassword = deps.hashNewPassword ?? hashPassword;
  const signAccessToken = deps.signAccessToken ?? generateAccessToken;
  const accessTokenExpiresIn =
    deps.accessTokenExpiresIn ?? String(getAccessTokenExpiresIn());

  if (input.auth.role === UserRole.STUDENT) {
    throw studentPasswordChangeNotAllowed();
  }

  const user = (await db.user.findUnique({
    where: {
      id: input.auth.userId,
    },
    include: {
      admin: true,
      teacher: true,
      parent: true,
    },
  })) as UserRecord | null;

  if (!user) {
    throw invalidCredentials();
  }

  if (user.role !== input.auth.role) {
    throw roleMismatch();
  }

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw getAccountStatusError(user.accountStatus);
  }

  if (!user.passwordHash) {
    throw invalidCredentials();
  }

  if (!user.isFirstLogin) {
    throw passwordChangeNotRequired();
  }

  if (input.confirmPassword !== input.newPassword) {
    throw passwordConfirmationMismatch();
  }

  if (input.newPassword === input.currentPassword) {
    throw passwordReuseNotAllowed();
  }

  if (!isStrongPassword(input.newPassword)) {
    throw passwordPolicyFailed();
  }

  const currentPasswordIsValid = await comparePassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordIsValid) {
    throw currentPasswordInvalid();
  }

  const profile = resolveProfile(user);
  const passwordHash = await hashNewPassword(input.newPassword);

  const updatedUser = await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
      isFirstLogin: false,
      setupToken: null,
      setupTokenExpiry: null,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return {
    accessToken: signAccessToken({
      sub: updatedUser.id,
      role: updatedUser.role,
      profileId: profile.id,
      schoolId: profile.schoolId,
      isFirstLogin: false,
    }),
    expiresIn: accessTokenExpiresIn,
    requiresPasswordChange: false,
    user: {
      id: updatedUser.id,
      role: updatedUser.role,
      email: updatedUser.email,
      accountStatus: updatedUser.accountStatus,
      isFirstLogin: false,
    },
  };
}

function buildStudentToken(
  student: StudentRecord,
  user: StudentUserRecord,
  requiresPinChange: boolean,
  signAccessToken: typeof generateAccessToken,
): string {
  return signAccessToken({
    sub: user.id,
    role: UserRole.STUDENT,
    profileId: student.id,
    schoolId: student.schoolId,
    isFirstLogin: false,
    requiresPinChange,
  });
}

export async function studentLogin(
  input: StudentLoginInput,
  deps: StudentLoginDependencies = {},
): Promise<StudentLoginResult> {
  const db = deps.db ?? (prisma as unknown as StudentAuthDb);
  const comparePin = deps.comparePin ?? verifyPin;
  const signAccessToken = deps.signAccessToken ?? generateAccessToken;
  const accessTokenExpiresIn =
    deps.accessTokenExpiresIn ?? String(getAccessTokenExpiresIn());
  const now = deps.now ?? (() => new Date());
  const studentId = input.studentId.trim();

  const student = await db.student.findUnique({
    where: {
      schoolId_studentId: {
        schoolId: input.schoolId,
        studentId,
      },
    },
    include: {
      user: true,
      school: true,
      class: true,
    },
  });

  if (!student) {
    throw invalidStudentCredentials();
  }

  assertStudentSchoolClassConsistency(student);

  const user = getStudentUserForLogin(student);

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw getAccountStatusError(user.accountStatus);
  }

  if (!student.pinHash) {
    throw invalidStudentCredentials();
  }

  const pinIsValid = await comparePin(input.pin, student.pinHash);

  if (!pinIsValid) {
    throw invalidStudentCredentials();
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLogin: now(),
    },
  });

  const requiresPinChange = !student.isPinChanged;

  return {
    accessToken: buildStudentToken(
      student,
      user,
      requiresPinChange,
      signAccessToken,
    ),
    expiresIn: accessTokenExpiresIn,
    requiresPinChange,
    user: {
      id: user.id,
      role: UserRole.STUDENT,
      accountStatus: user.accountStatus,
    },
    profile: {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      schoolId: student.schoolId,
      classId: student.classId,
      className: student.class!.className,
      yearLevel: student.class!.yearLevel,
    },
  };
}

export async function changeFirstPin(
  input: ChangeFirstPinInput,
  deps: ChangeFirstPinDependencies = {},
): Promise<ChangeFirstPinResult> {
  const db = deps.db ?? (prisma as unknown as StudentAuthDb);
  const comparePin = deps.comparePin ?? verifyPin;
  const hashNewPin = deps.hashNewPin ?? hashPin;
  const signAccessToken = deps.signAccessToken ?? generateAccessToken;
  const accessTokenExpiresIn =
    deps.accessTokenExpiresIn ?? String(getAccessTokenExpiresIn());
  const now = deps.now ?? (() => new Date());

  if (input.auth.role !== UserRole.STUDENT) {
    throw studentOnly();
  }

  const student = await db.student.findUnique({
    where: {
      userId: input.auth.userId,
    },
    include: {
      user: true,
      school: true,
      class: true,
    },
  });

  if (!student) {
    throw studentOnly();
  }

  assertStudentSchoolClassConsistency(student);

  const user = getStudentUserForPinChange(student);

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw getAccountStatusError(user.accountStatus);
  }

  if (!student.pinHash) {
    throw currentPinInvalid();
  }

  if (student.isPinChanged) {
    throw pinChangeNotRequired();
  }

  if (input.confirmPin !== input.newPin) {
    throw pinConfirmationMismatch();
  }

  if (input.newPin === input.currentPin) {
    throw pinReuseNotAllowed();
  }

  if (!isValidPin(input.newPin) || isWeakPin(input.newPin)) {
    throw pinPolicyFailed();
  }

  const currentPinIsValid = await comparePin(input.currentPin, student.pinHash);

  if (!currentPinIsValid) {
    throw currentPinInvalid();
  }

  const pinHash = await hashNewPin(input.newPin);

  await db.student.update({
    where: {
      id: student.id,
    },
    data: {
      pinHash,
      isPinChanged: true,
      pinUpdatedAt: now(),
    },
  });

  return {
    accessToken: buildStudentToken(student, user, false, signAccessToken),
    expiresIn: accessTokenExpiresIn,
    requiresPinChange: false,
    user: {
      id: user.id,
      role: UserRole.STUDENT,
      accountStatus: user.accountStatus,
    },
  };
}

export interface SetupPasswordInput {
  token: string;
  password: string;
}

export async function setupPassword(data: SetupPasswordInput) {
  const user = await prisma.user.findUnique({
    where: {
      setupToken: data.token,
    },
  });

  if (!user) {
    throw new Error("Invalid setup link.");
  }

  if (!user.setupTokenExpiry || user.setupTokenExpiry < new Date()) {
    throw new Error("Setup link has expired.");
  }

  const passwordHash = await hashPassword(data.password);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      passwordHash,
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: false,
      setupToken: null,
      setupTokenExpiry: null,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return {
    message: "Password has been set successfully.",
  };
}
