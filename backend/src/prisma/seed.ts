import { AccountStatus, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";

export type SuperAdminSeedConfig = {
  email: string;
  password: string;
  fullName: string;
};

type SeedDependencies = {
  prisma: typeof prisma;
  hashPassword: typeof hashPassword;
};

export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return trimmed;
}

export function readSuperAdminSeedConfig(env: NodeJS.ProcessEnv = process.env): SuperAdminSeedConfig {
  return {
    email: requireEnv("SEED_SUPER_ADMIN_EMAIL", env.SEED_SUPER_ADMIN_EMAIL).toLowerCase(),
    password: requireEnv("SEED_SUPER_ADMIN_PASSWORD", env.SEED_SUPER_ADMIN_PASSWORD),
    fullName: requireEnv("SEED_SUPER_ADMIN_NAME", env.SEED_SUPER_ADMIN_NAME),
  };
}

export async function seedSuperAdmin(config: SuperAdminSeedConfig, dependencies: SeedDependencies = { prisma, hashPassword }) {
  const passwordHash = await dependencies.hashPassword(config.password);

  console.log("seed started");
  console.log(`Super Admin email: ${config.email}`);

  await dependencies.prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        email: config.email,
      },
      create: {
        role: UserRole.SUPER_ADMIN,
        email: config.email,
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
        email: config.email,
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
        fullName: config.fullName,
        position: "Super Administrator",
        phone: null,
        avatar: null,
      },
      update: {
        schoolId: null,
        fullName: config.fullName,
        position: "Super Administrator",
        phone: null,
        avatar: null,
      },
    });
  });

  console.log("created or updated");
  console.log("seed completed");
}

async function main() {
  await seedSuperAdmin(readSuperAdminSeedConfig());
}

if (process.argv[1]?.endsWith("seed.ts")) {
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
}
