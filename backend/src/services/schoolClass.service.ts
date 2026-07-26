import { prisma } from "../config/prisma.js";
import { AccountStatus } from "@prisma/client";
import { AppError } from "../errors/app-error.js";

export function assertTeacherClassSchoolAssignment(
  classSchoolId: string,
  teacherSchoolId: string,
): void {
  if (classSchoolId !== teacherSchoolId) {
    throw new AppError(
      "TEACHER_SCHOOL_ASSIGNMENT_INVALID",
      400,
      "Guru hanya boleh ditugaskan kepada kelas dalam sekolah yang sama.",
    );
  }
}

export interface CreateSchoolClassInput {
  schoolId: string;
  teacherId: string;

  className: string;

  yearLevel: number;

  academicYear: number;

  capacity?: number;
}

export async function createSchoolClass(
  data: CreateSchoolClassInput
) {
  const school = await prisma.school.findUnique({
    where: {
      id: data.schoolId,
    },
  });

  if (!school) {
    throw new Error("School not found.");
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      id: data.teacherId,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  assertTeacherClassSchoolAssignment(data.schoolId, teacher.schoolId);

  const existingClass =
    await prisma.schoolClass.findFirst({
      where: {
        schoolId: data.schoolId,
        className: data.className,
        academicYear: data.academicYear,
      },
    });

  if (existingClass) {
    throw new Error(
      "Class already exists for this academic year."
    );
  }

  const schoolClass =
    await prisma.schoolClass.create({
      data: {
        schoolId: data.schoolId,
        teacherId: data.teacherId,

        className: data.className,

        yearLevel: data.yearLevel,

        academicYear: data.academicYear,

        capacity: data.capacity,

        accountStatus: AccountStatus.ACTIVE,
      },
    });

  return schoolClass;
}

export async function getSchoolClasses() {
  const classes = await prisma.schoolClass.findMany({
    select: {
      id: true,
      className: true,
      yearLevel: true,
      academicYear: true,
      capacity: true,
      accountStatus: true,
      createdAt: true,
      updatedAt: true,

      school: {
        select: {
          schoolName: true,
          schoolCode: true,
        },
      },

      teacher: {
        select: {
          teacherId: true,
          fullName: true,
        },
      },

      _count: {
        select: {
          students: true,
        },
      },
    },
    orderBy: {
      yearLevel: "asc",
    },
  });

  return classes;
}

export async function getSchoolClassById(id: string) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      className: true,
      yearLevel: true,
      academicYear: true,
      capacity: true,
      accountStatus: true,
      createdAt: true,
      updatedAt: true,

      school: {
        select: {
          schoolName: true,
          schoolCode: true,
        },
      },

      teacher: {
        select: {
          teacherId: true,
          fullName: true,
          position: true,
        },
      },

      _count: {
        select: {
          students: true,
        },
      },
    },
  });

  if (!schoolClass) {
    throw new Error("Class not found.");
  }

  return schoolClass;
}

export interface UpdateSchoolClassInput {

  teacherId?: string;

  className?: string;

  yearLevel?: number;

  academicYear?: number;

  capacity?: number;

}

export async function updateSchoolClass(
  id: string,
  data: UpdateSchoolClassInput
) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: {
      id,
    },
  });

  if (!schoolClass) {
    throw new Error("Class not found.");
  }

  if (data.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: {
        id: data.teacherId,
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found.");
    }

    assertTeacherClassSchoolAssignment(schoolClass.schoolId, teacher.schoolId);
  }

  const updatedClass = await prisma.schoolClass.update({
    where: {
      id,
    },
    data: {
      teacherId: data.teacherId,
      className: data.className,
      yearLevel: data.yearLevel,
      academicYear: data.academicYear,
      capacity: data.capacity,
    },
    select: {
      id: true,
      className: true,
      yearLevel: true,
      academicYear: true,
      capacity: true,
      accountStatus: true,
      createdAt: true,
      updatedAt: true,

      school: {
        select: {
          schoolName: true,
        },
      },

      teacher: {
        select: {
          teacherId: true,
          fullName: true,
        },
      },
    },
  });

  return updatedClass;
}

export interface UpdateSchoolClassStatusInput {
  accountStatus: AccountStatus;
}

export async function updateSchoolClassStatus(
  id: string,
  data: UpdateSchoolClassStatusInput
) {
  const schoolClass = await prisma.schoolClass.findUnique({
    where: {
      id,
    },
  });

  if (!schoolClass) {
    throw new Error("Class not found.");
  }

  const updatedClass = await prisma.schoolClass.update({
    where: {
      id,
    },
    data: {
      accountStatus: data.accountStatus,
    },
    select: {
      id: true,
      className: true,
      yearLevel: true,
      academicYear: true,
      accountStatus: true,
      updatedAt: true,
    },
  });

  return updatedClass;
}
