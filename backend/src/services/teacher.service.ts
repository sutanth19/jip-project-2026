import { prisma } from "../config/prisma.js";
import { AccountStatus, UserRole } from "@prisma/client";
import { generateSetupToken } from "../utils/generateSetupToken.js";

export interface CreateTeacherInput {
  schoolId: string;

  teacherId: string;
  fullName: string;
  email: string;
  phone: string;

  gender: "MALE" | "FEMALE";
}

export interface UpdateTeacherInput {
  fullName?: string;
  gender?: "MALE" | "FEMALE";
  phone?: string;
  position?: string;
}

export async function createTeacher(
  data: CreateTeacherInput
) {
  // Check existing teacher
  const existingTeacher = await prisma.teacher.findFirst({
    where: {
      OR: [
        { teacherId: data.teacherId },
        { phone: data.phone },
      ],
    },
  });

  if (existingTeacher) {
    throw new Error("Teacher already exists.");
  }

  // Check existing user
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error("Email is already in use.");
  }

  const setupToken = generateSetupToken();

  const setupTokenExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24
  );

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: UserRole.TEACHER,
        email: data.email,
        accountStatus: AccountStatus.PENDING,
        setupToken,
        setupTokenExpiry,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        schoolId: data.schoolId,
        userId: user.id,
        teacherId: data.teacherId,
        fullName: data.fullName,
        phone: data.phone,
        gender: data.gender,
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    return {
      teacher,
      setupLink: `http://localhost:5173/setup-password?token=${setupToken}`,
    };
  });

  return result;
}

export async function getTeachers() {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          email: true,
          lastLogin: true,
        },
      },
      school: {
        select: {
          schoolName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return teachers;
}

export async function getTeacherById(id: string) {
  const teacher = await prisma.teacher.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          email: true,
          lastLogin: true,
        },
      },
      school: {
        select: {
          schoolName: true,
          schoolCode: true,
        },
      },
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  return teacher;
}

export async function updateTeacher(
  id: string,
  data: UpdateTeacherInput
) {
  const teacher = await prisma.teacher.findUnique({
    where: {
      id,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  const updatedTeacher = await prisma.teacher.update({
    where: {
      id,
    },
    data: {
      fullName: data.fullName,
      gender: data.gender,
      phone: data.phone,
      position: data.position,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      school: {
        select: {
          schoolName: true,
        },
      },
    },
  });

  return updatedTeacher;
}

export interface UpdateTeacherStatusInput {
  accountStatus: AccountStatus;
}

export async function updateTeacherStatus(
  id: string,
  data: UpdateTeacherStatusInput
) {
  const teacher = await prisma.teacher.findUnique({
    where: {
      id,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  await prisma.user.update({
    where: {
      id: teacher.userId,
    },
    data: {
      accountStatus: data.accountStatus,
    },
  });

  const updatedTeacher = await prisma.teacher.update({
    where: {
      id,
    },
data: {
  accountStatus: data.accountStatus as AccountStatus,
},
  });

  return updatedTeacher;
}

export async function resendTeacherSetupLink(
  id: string
) {
  const teacher = await prisma.teacher.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });

  if (!teacher) {
    throw new Error("Teacher not found.");
  }

  const setupToken = generateSetupToken();

  const setupTokenExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24
  );

  await prisma.user.update({
    where: {
      id: teacher.userId,
    },
    data: {
      setupToken,
      setupTokenExpiry,
      accountStatus: AccountStatus.PENDING,
    },
  });

  return {
    setupLink: `http://localhost:5173/setup-password?token=${setupToken}`,
  };
}