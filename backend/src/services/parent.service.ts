import { prisma } from "../config/prisma.js";
import { AccountStatus, UserRole } from "@prisma/client";
import { generateSetupToken } from "../utils/generateSetupToken.js";

export interface CreateParentInput {
  schoolId: string;

  fullName: string;
  email: string;
  phone: string;

  occupation?: string;
  address?: string;
}

export async function createParent(
  data: CreateParentInput
) {
  const existingParent = await prisma.parent.findUnique({
    where: {
      phone: data.phone,
    },
  });

  if (existingParent) {
    throw new Error("Parent already exists.");
  }

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
        role: UserRole.PARENT,
        email: data.email,
        accountStatus: AccountStatus.PENDING,
        setupToken,
        setupTokenExpiry,
      },
    });

    const parent = await tx.parent.create({
      data: {
        userId: user.id,
        schoolId: data.schoolId,
        fullName: data.fullName,
        phone: data.phone,
        occupation: data.occupation,
        address: data.address,
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    return {
      parent,
      setupLink: `http://localhost:5173/setup-password?token=${setupToken}`,
    };
  });

  return result;
}

export interface UpdateParentInput {
  fullName?: string;
  phone?: string;
  occupation?: string;
  address?: string;
}

export interface UpdateParentStatusInput {
  accountStatus: AccountStatus;
}

export async function getParents() {
  const parents = await prisma.parent.findMany({
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

  return parents;
}

export async function getParentById(id: string) {
  const parent = await prisma.parent.findUnique({
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

  if (!parent) {
    throw new Error("Parent not found.");
  }

  return parent;
}

export async function updateParent(
  id: string,
  data: UpdateParentInput
) {
  const parent = await prisma.parent.findUnique({
    where: {
      id,
    },
  });

  if (!parent) {
    throw new Error("Parent not found.");
  }

  const updatedParent = await prisma.parent.update({
    where: {
      id,
    },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      occupation: data.occupation,
      address: data.address,
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

  return updatedParent;
}

export async function updateParentStatus(
  id: string,
  data: UpdateParentStatusInput
) {
  const parent = await prisma.parent.findUnique({
    where: {
      id,
    },
  });

  if (!parent) {
    throw new Error("Parent not found.");
  }

  await prisma.user.update({
    where: {
      id: parent.userId,
    },
    data: {
      accountStatus: data.accountStatus,
    },
  });

  const updatedParent = await prisma.parent.update({
    where: {
      id,
    },
    data: {
      accountStatus: data.accountStatus,
    },
  });

  return updatedParent;
}

export async function resendParentSetupLink(
  id: string
) {
  const parent = await prisma.parent.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });

  if (!parent) {
    throw new Error("Parent not found.");
  }

  const setupToken = generateSetupToken();

  const setupTokenExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24
  );

  await prisma.user.update({
    where: {
      id: parent.userId,
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