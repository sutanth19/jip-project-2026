import { AccountStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import type { DashboardQuery } from "../validators/dashboard.validator.js";
import { adminDashboardAnalytics, studentDashboardAnalytics, teacherDashboardAnalytics } from "./analytics.service.js";

type DashboardContext = AuthenticatedSession;
const countedStudentStatuses = [AccountStatus.ACTIVE, AccountStatus.SUSPENDED];

function error(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const profileNotFound = () => error("DASHBOARD_PROFILE_NOT_FOUND", 404, "Profil dashboard tidak ditemui.");
const accessDenied = () => error("DASHBOARD_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses dashboard ini.");

function requireDashboardRole(context: DashboardContext, role: UserRole): void {
  if (context.role !== role) throw accessDenied();
}
function schoolSummary(school: { id: string; schoolCode: string; schoolName: string }) { return school; }
function teacherSummary(teacher: { id: string; teacherId: string; fullName: string }) { return teacher; }

const recentSchoolSelect = { id: true, schoolCode: true, schoolName: true, accountStatus: true, createdAt: true } satisfies Prisma.SchoolSelect;
const recentAdminSelect = { id: true, fullName: true, position: true, avatar: true, createdAt: true, user: { select: { accountStatus: true } } } satisfies Prisma.AdminSelect;
const recentTeacherSelect = { id: true, schoolId: true, teacherId: true, fullName: true, avatar: true, createdAt: true, school: { select: { id: true, schoolCode: true, schoolName: true } }, user: { select: { accountStatus: true } } } satisfies Prisma.TeacherSelect;

function recentSchool(record: Prisma.SchoolGetPayload<{ select: typeof recentSchoolSelect }>) { return { id: record.id, schoolCode: record.schoolCode, schoolName: record.schoolName, accountStatus: record.accountStatus, createdAt: record.createdAt }; }
function recentAdmin(record: Prisma.AdminGetPayload<{ select: typeof recentAdminSelect }>) { return { id: record.id, fullName: record.fullName, position: record.position, avatar: record.avatar, accountStatus: record.user.accountStatus, createdAt: record.createdAt }; }
function recentTeacher(record: Prisma.TeacherGetPayload<{ select: typeof recentTeacherSelect }>) { return { id: record.id, schoolId: record.schoolId, teacherId: record.teacherId, fullName: record.fullName, avatar: record.avatar, accountStatus: record.user.accountStatus, createdAt: record.createdAt, school: schoolSummary(record.school) }; }

export async function getSuperAdminDashboard(context: DashboardContext, query: DashboardQuery) {
  requireDashboardRole(context, UserRole.SUPER_ADMIN);
  const [totalSchools, activeSchools, suspendedSchools, archivedSchools, totalAdmins, activeAdmins, pendingAdmins, totalTeachers, totalStudents, totalParents, totalClasses, schools, admins, teachers, analytics] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
    prisma.school.count({ where: { accountStatus: AccountStatus.SUSPENDED } }),
    prisma.school.count({ where: { accountStatus: AccountStatus.ARCHIVED } }),
    prisma.admin.count({ where: { user: { role: UserRole.ADMIN } } }),
    prisma.admin.count({ where: { user: { role: UserRole.ADMIN, accountStatus: AccountStatus.ACTIVE } } }),
    prisma.admin.count({ where: { user: { role: UserRole.ADMIN, accountStatus: AccountStatus.PENDING } } }),
    prisma.teacher.count({ where: { user: { role: UserRole.TEACHER } } }),
    prisma.student.count({ where: { user: { role: UserRole.STUDENT } } }),
    prisma.parent.count({ where: { user: { role: UserRole.PARENT } } }),
    prisma.schoolClass.count(),
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentSchoolSelect }),
    prisma.admin.findMany({ where: { user: { role: UserRole.ADMIN } }, orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentAdminSelect }),
    prisma.teacher.findMany({ where: { user: { role: UserRole.TEACHER } }, orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentTeacherSelect }),
    adminDashboardAnalytics(null),
  ]);
  return { summary: { totalSchools, activeSchools, suspendedSchools, archivedSchools, totalAdmins, activeAdmins, pendingAdmins, totalTeachers, totalStudents, totalParents, totalClasses }, recent: { schools: schools.map(recentSchool), admins: admins.map(recentAdmin), teachers: teachers.map(recentTeacher) }, analytics };
}

const recentStudentSelect = { id: true, schoolId: true, classId: true, studentId: true, fullName: true, gender: true, avatar: true, createdAt: true, school: { select: { id: true, schoolCode: true, schoolName: true } }, class: { select: { id: true, className: true, yearLevel: true, academicYear: true } }, user: { select: { accountStatus: true } } } satisfies Prisma.StudentSelect;
function recentStudent(record: Prisma.StudentGetPayload<{ select: typeof recentStudentSelect }>) { return { id: record.id, schoolId: record.schoolId, classId: record.classId, studentId: record.studentId, fullName: record.fullName, gender: record.gender, avatar: record.avatar, accountStatus: record.user.accountStatus, createdAt: record.createdAt, school: schoolSummary(record.school), class: record.class }; }

export async function getAdminDashboard(context: DashboardContext, query: DashboardQuery) {
  requireDashboardRole(context, UserRole.ADMIN);
  const [totalSchools, activeSchools, totalTeachers, activeTeachers, pendingTeachers, totalStudents, activeStudents, totalParents, totalClasses, schools, teachers, students, classCapacity, analytics] = await Promise.all([
    prisma.school.count(), prisma.school.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
    prisma.teacher.count({ where: { user: { role: UserRole.TEACHER } } }),
    prisma.teacher.count({ where: { user: { role: UserRole.TEACHER, accountStatus: AccountStatus.ACTIVE } } }),
    prisma.teacher.count({ where: { user: { role: UserRole.TEACHER, accountStatus: AccountStatus.PENDING } } }),
    prisma.student.count({ where: { user: { role: UserRole.STUDENT } } }),
    prisma.student.count({ where: { user: { role: UserRole.STUDENT, accountStatus: AccountStatus.ACTIVE } } }),
    prisma.parent.count({ where: { user: { role: UserRole.PARENT } } }), prisma.schoolClass.count(),
    prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentSchoolSelect }),
    prisma.teacher.findMany({ where: { user: { role: UserRole.TEACHER } }, orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentTeacherSelect }),
    prisma.student.findMany({ where: { user: { role: UserRole.STUDENT } }, orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentStudentSelect }),
    prisma.schoolClass.findMany({ where: { accountStatus: AccountStatus.ACTIVE, capacity: { not: null } }, select: { id: true, schoolId: true, className: true, yearLevel: true, academicYear: true, capacity: true, school: { select: { id: true, schoolCode: true, schoolName: true } }, teacher: { select: { id: true, teacherId: true, fullName: true } }, _count: { select: { students: { where: { user: { accountStatus: { in: countedStudentStatuses } } } } } } } }),
    adminDashboardAnalytics(context.schoolId),
  ]);
  const nearCapacity = classCapacity
    .filter((schoolClass) => schoolClass.capacity !== null && schoolClass._count.students >= Math.ceil(schoolClass.capacity * 0.8))
    .sort((left, right) => (right._count.students / (right.capacity ?? 1)) - (left._count.students / (left.capacity ?? 1)))
    .slice(0, query.recentLimit)
    .map((schoolClass) => ({ id: schoolClass.id, schoolId: schoolClass.schoolId, className: schoolClass.className, yearLevel: schoolClass.yearLevel, academicYear: schoolClass.academicYear, capacity: schoolClass.capacity, studentCount: schoolClass._count.students, availableSeats: Math.max(0, (schoolClass.capacity ?? 0) - schoolClass._count.students), school: schoolSummary(schoolClass.school), teacher: teacherSummary(schoolClass.teacher) }));
  return { summary: { totalSchools, activeSchools, totalTeachers, activeTeachers, pendingTeachers, totalStudents, activeStudents, totalParents, totalClasses }, recent: { schools: schools.map(recentSchool), teachers: teachers.map(recentTeacher), students: students.map(recentStudent) }, classesNearingCapacity: nearCapacity, analytics };
}

const teacherClassSelect = { id: true, schoolId: true, className: true, yearLevel: true, academicYear: true, capacity: true, accountStatus: true, _count: { select: { students: { where: { user: { accountStatus: { in: countedStudentStatuses } } } } } } } satisfies Prisma.SchoolClassSelect;
function teacherClassSummary(record: Prisma.SchoolClassGetPayload<{ select: typeof teacherClassSelect }>) { return { classId: record.id, className: record.className, yearLevel: record.yearLevel, academicYear: record.academicYear, capacity: record.capacity, studentCount: record._count.students, availableSeats: record.capacity === null ? null : Math.max(0, record.capacity - record._count.students), accountStatus: record.accountStatus }; }

export async function getTeacherDashboard(context: DashboardContext, query: DashboardQuery) {
  requireDashboardRole(context, UserRole.TEACHER);
  if (!context.schoolId) throw profileNotFound();
  const teacher = await prisma.teacher.findUnique({ where: { id: context.profileId }, select: { id: true, userId: true, schoolId: true } });
  if (!teacher || teacher.userId !== context.userId) throw profileNotFound();
  if (teacher.schoolId !== context.schoolId) throw accessDenied();
  const classWhere: Prisma.SchoolClassWhereInput = { teacherId: teacher.id, schoolId: teacher.schoolId };
  const [classes, activeStudents, suspendedStudents, students, analytics] = await Promise.all([
    prisma.schoolClass.findMany({ where: classWhere, orderBy: [{ academicYear: "desc" }, { yearLevel: "asc" }, { className: "asc" }], select: teacherClassSelect }),
    prisma.student.count({ where: { class: classWhere, user: { accountStatus: AccountStatus.ACTIVE } } }),
    prisma.student.count({ where: { class: classWhere, user: { accountStatus: AccountStatus.SUSPENDED } } }),
    prisma.student.findMany({ where: { class: classWhere, user: { role: UserRole.STUDENT } }, orderBy: { createdAt: "desc" }, take: query.recentLimit, select: recentStudentSelect }),
    teacherDashboardAnalytics(teacher.id),
  ]);
  const assignedClasses = classes.map(teacherClassSummary);
  const totalAssignedStudents = assignedClasses.reduce((total, schoolClass) => total + schoolClass.studentCount, 0);
  return { summary: { totalAssignedClasses: assignedClasses.length, totalAssignedStudents, activeStudents, suspendedStudents, classesAtCapacity: assignedClasses.filter((schoolClass) => schoolClass.capacity !== null && schoolClass.studentCount >= schoolClass.capacity).length, classesWithAvailableSeats: assignedClasses.filter((schoolClass) => schoolClass.capacity === null || schoolClass.studentCount < schoolClass.capacity).length }, assignedClasses, recentStudents: students.map(recentStudent), analytics };
}

export async function getStudentDashboard(context: DashboardContext) {
  requireDashboardRole(context, UserRole.STUDENT);
  const student = await prisma.student.findUnique({ where: { id: context.profileId }, select: { id: true, userId: true, studentId: true, fullName: true, gender: true, birthDate: true, avatar: true, isPinChanged: true, pinUpdatedAt: true, school: { select: { id: true, schoolCode: true, schoolName: true } }, class: { select: { id: true, className: true, yearLevel: true, academicYear: true, accountStatus: true, teacher: { select: { id: true, teacherId: true, fullName: true, avatar: true } } } }, user: { select: { accountStatus: true } } } });
  if (!student || student.userId !== context.userId) throw profileNotFound();
  if (context.schoolId && student.school.id !== context.schoolId) throw accessDenied();
  return { student: { id: student.id, studentId: student.studentId, fullName: student.fullName, gender: student.gender, birthDate: student.birthDate, avatar: student.avatar, accountStatus: student.user.accountStatus, pinChangeRequired: !student.isPinChanged, pinUpdatedAt: student.pinUpdatedAt }, school: schoolSummary(student.school), class: { id: student.class.id, className: student.class.className, yearLevel: student.class.yearLevel, academicYear: student.class.academicYear, accountStatus: student.class.accountStatus }, teacher: { ...teacherSummary(student.class.teacher), avatar: student.class.teacher.avatar }, analytics: await studentDashboardAnalytics(student.id) };
}

export async function getParentDashboard(context: DashboardContext) {
  requireDashboardRole(context, UserRole.PARENT);
  const parent = await prisma.parent.findUnique({ where: { id: context.profileId }, select: { id: true, userId: true, fullName: true, phone: true, occupation: true, avatar: true, user: { select: { accountStatus: true } }, students: { orderBy: { createdAt: "desc" }, select: { relationship: true, student: { select: { id: true, studentId: true, fullName: true, gender: true, avatar: true, user: { select: { accountStatus: true } }, school: { select: { id: true, schoolCode: true, schoolName: true } }, class: { select: { id: true, className: true, yearLevel: true, academicYear: true } } } } } } } });
  if (!parent || parent.userId !== context.userId) throw profileNotFound();
  const children = await Promise.all(parent.students.map(async (link) => ({ id: link.student.id, studentId: link.student.studentId, fullName: link.student.fullName, gender: link.student.gender, avatar: link.student.avatar, accountStatus: link.student.user.accountStatus, relationship: link.relationship, school: schoolSummary(link.student.school), class: link.student.class, analytics: await studentDashboardAnalytics(link.student.id) })));
  return { parent: { id: parent.id, fullName: parent.fullName, phone: parent.phone, occupation: parent.occupation, avatar: parent.avatar, accountStatus: parent.user.accountStatus }, linkedChildrenCount: parent.students.length, children };
}
