import jwt, { type SignOptions } from "jsonwebtoken";
import { UserRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  profileId: string;
  schoolId: string | null;
  isFirstLogin: boolean;
  requiresPinChange?: boolean;
}

function getAccessTokenConfig() {
  const secret =
    process.env.JWT_ACCESS_SECRET?.trim() ??
    process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "JWT_ACCESS_SECRET is missing in .env",
    );
  }

  const expiresIn =
    (process.env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]) ??
    (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) ??
    "15m";

  return {
    secret,
    expiresIn,
  };
}

/**
 * Generate Access Token
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  const { secret, expiresIn } = getAccessTokenConfig();

  return jwt.sign(payload, secret, {
    expiresIn,
  });
}

/**
 * Verify Access Token
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const { secret } = getAccessTokenConfig();

  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function getAccessTokenExpiresIn(): SignOptions["expiresIn"] {
  return getAccessTokenConfig().expiresIn;
}
