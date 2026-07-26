import { prisma } from "../config/prisma.js";
import { AccountStatus, Gender, UserRole } from "@prisma/client";
import { hashPin } from "../utils/bcrypt.js";

export interface CreateStudentInput {
  schoolId: string;
  classId: string;
  studentId: string;
  fullName: string;
  gender: Gender;
  birthDate?: string;
}

export async function createStudent(data: CreateStudentInput) {
  const existingStudent = await prisma.student.findFirst({
    where: {
      schoolId: data.schoolId,
      studentId: data.studentId,
    },
  });

  if (existingStudent) {
    throw new Error("Student ID already exists.");
  }

  const defaultPin = "1234";
  const pinHash = await hashPin(defaultPin);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        schoolId: data.schoolId,
        classId: data.classId,
        studentId: data.studentId,
        fullName: data.fullName,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        pinHash,
      },
    });

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        gender: student.gender,
        birthDate: student.birthDate,
        avatar: student.avatar,
        accountStatus: user.accountStatus,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      defaultPin,
    };
  });

  return result;
}

export async function getStudents() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      fullName: true,
      gender: true,
      birthDate: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          lastLogin: true,
          accountStatus: true,
        },
      },
      school: {
        select: {
          schoolName: true,
        },
      },
      class: {
        select: {
          className: true,
          yearLevel: true,
          academicYear: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return students;
}

export async function getStudentById(id: string) {
  const student = await prisma.student.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      gender: true,
      birthDate: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          lastLogin: true,
          accountStatus: true,
        },
      },
      school: {
        select: {
          schoolName: true,
          schoolCode: true,
        },
      },
      class: {
        select: {
          className: true,
          yearLevel: true,
          academicYear: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  return student;
}

export interface UpdateStudentInput {
  fullName?: string;
  gender?: Gender;
  birthDate?: string;
  classId?: string;
}

export async function updateStudent(id: string, data: UpdateStudentInput) {
  const student = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const updatedStudent = await prisma.student.update({
    where: {
      id,
    },
    data: {
      fullName: data.fullName,
      gender: data.gender,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      classId: data.classId,
    },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      gender: true,
      birthDate: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      school: {
        select: {
          schoolName: true,
        },
      },
      class: {
        select: {
          className: true,
          yearLevel: true,
        },
      },
      user: {
        select: {
          lastLogin: true,
          accountStatus: true,
        },
      },
    },
  });

  return updatedStudent;
}

export interface UpdateStudentStatusInput {
  accountStatus: AccountStatus;
}

export async function updateStudentStatus(
  id: string,
  data: UpdateStudentStatusInput
) {
  const student = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  await prisma.user.update({
    where: {
      id: student.userId,
    },
    data: {
      accountStatus: data.accountStatus,
    },
  });

  const updatedStudent = await prisma.student.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      updatedAt: true,
      user: {
        select: {
          accountStatus: true,
        },
      },
    },
  });

  if (!updatedStudent) {
    throw new Error("Student not found.");
  }

  return {
    ...updatedStudent,
    accountStatus: updatedStudent.user.accountStatus,
  };
}

export async function resetStudentPin(id: string) {
  const student = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const temporaryPin = "1234";
  const pinHash = await hashPin(temporaryPin);

  await prisma.student.update({
    where: {
      id,
    },
    data: {
      pinHash,
      pinUpdatedAt: new Date(),
      isPinChanged: false,
    },
  });

  return {
    studentId: student.studentId,
    temporaryPin,
  };
}
