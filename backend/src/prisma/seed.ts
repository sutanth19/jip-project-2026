import { AccountStatus, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return trimmed;
}

async function main() {
  const email = requireEnv("SEED_SUPER_ADMIN_EMAIL", process.env.SEED_SUPER_ADMIN_EMAIL)
    .toLowerCase();
  const password = requireEnv(
    "SEED_SUPER_ADMIN_PASSWORD",
    process.env.SEED_SUPER_ADMIN_PASSWORD,
  );
  const fullName = requireEnv("SEED_SUPER_ADMIN_NAME", process.env.SEED_SUPER_ADMIN_NAME);

  console.log("seed started");
  console.log(`Super Admin email: ${email}`);

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email,
      },
      create: {
        role: UserRole.SUPER_ADMIN,
        email,
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        isFirstLogin: true,
        setupToken: null,
        setupTokenExpiry: null,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
      update: {
        role: UserRole.SUPER_ADMIN,
        email,
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
        isFirstLogin: true,
        setupToken: null,
        setupTokenExpiry: null,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    await tx.admin.upsert({
      where: {
        userId: user.id,
      },
      create: {
        userId: user.id,
        schoolId: null,
        fullName,
        position: "Super Administrator",
        phone: null,
        avatar: null,
      },
      update: {
        schoolId: null,
        fullName,
        position: "Super Administrator",
        phone: null,
        avatar: null,
      },
    });
  });

  console.log("created or updated");
  console.log("seed completed");
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error("Seed failed.");
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
