import { UserRole, AccountStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { hashPassword } from "../utils/bcrypt.js";

async function main() {
  console.log("🌱 Starting database seed...");

  const email = "superadmin@digitalmolib.my";

  // Check if SUPER_ADMIN already exists
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    console.log("✅ SUPER_ADMIN already exists.");
    return;
  }

  const hashedPassword = await hashPassword("Admin@12345");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: UserRole.SUPER_ADMIN,
        email,
        passwordHash: hashedPassword,
        accountStatus: AccountStatus.ACTIVE,
        mustChangePassword: false,
        isFirstLogin: false,
      },
    });

    await tx.admin.create({
      data: {
        userId: user.id,
        fullName: "Digital MoLIB Super Admin",
        accountStatus: AccountStatus.ACTIVE,
      },
    });
  });

  console.log("🎉 SUPER_ADMIN created successfully!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });