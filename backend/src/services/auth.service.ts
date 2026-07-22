import { AccountStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  verifyPassword,
  hashPassword,
} from "../utils/bcrypt.js";
import { generateAccessToken } from "../utils/jwt.js";

export interface LoginInput {
  email: string;
  password: string;
}

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (user.accountStatus !== AccountStatus.ACTIVE) {
    throw new Error("Your account is not active.");
  }

  if (!user.passwordHash) {
    throw new Error("This account cannot be used for password login.");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    throw new Error("Invalid email or password.");
  }

  const token = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  return {
    token,
    user,
  };
}

export interface SetupPasswordInput {
  token: string;
  password: string;
}

export async function setupPassword(
  data: SetupPasswordInput
) {
const user = await prisma.user.findUnique({
  where: {
    setupToken: data.token,
  },
});

  if (!user) {
    throw new Error("Invalid setup link.");
  }

  if (
    !user.setupTokenExpiry ||
    user.setupTokenExpiry < new Date()
  ) {
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
    },
  });

  return {
    message: "Password has been set successfully.",
  };
}