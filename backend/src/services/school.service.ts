import { prisma } from "../config/prisma.js";
import { AccountStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { generateSetupToken } from "../utils/generateSetupToken.js";

export interface CreateSchoolInput {
  schoolCode: string;
  schoolName: string;
  principalName?: string;
  address: string;
  phone: string;
  contactEmail?: string;

  adminName: string;
  adminEmail: string;
  adminPhone?: string;
}

export async function createSchool(data: CreateSchoolInput) {
  const db = prisma as PrismaClient;

  const existingSchool = await db.school.findFirst({
    where: {
      OR: [
        { schoolCode: data.schoolCode },
        { schoolName: data.schoolName },
        { contactEmail: data.contactEmail },
      ],
    },
  });

  if (existingSchool) {
    throw new Error("School already exists.");
  }

  const existingUser = await db.user.findUnique({
    where: {
      email: data.adminEmail,
    },
  });

  if (existingUser) {
    throw new Error("Admin email is already in use.");
  }

  const setupToken = generateSetupToken();

  const setupTokenExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24
  );

const result = await db.$transaction(async (tx) => {
  const school = await tx.school.create({
    data: {
      schoolCode: data.schoolCode,
      schoolName: data.schoolName,
      principalName: data.principalName,
      address: data.address,
      phone: data.phone,
      contactEmail: data.contactEmail,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  const user = await tx.user.create({
    data: {
      role: "ADMIN",
      email: data.adminEmail,
      accountStatus: AccountStatus.PENDING,
      setupToken,
      setupTokenExpiry,
    },
  });

  const admin = await tx.admin.create({
    data: {
      userId: user.id,
      schoolId: school.id,
      fullName: data.adminName,
      phone: data.adminPhone,
    },
  });

  return {
    school,
    admin,
    setupLink: `http://localhost:5173/setup-password?token=${setupToken}`,
  };
});

console.log(result);

return result;
  
}