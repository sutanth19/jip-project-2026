import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  authenticate,
  requirePasswordChanged,
  requireStudentPinChanged,
  type AuthenticatedRequest,
} from "../src/middleware/auth.middleware.js";
import { generateAccessToken } from "../src/utils/jwt.js";

test("requirePasswordChanged blocks first-login sessions", () => {
  const req = {
    auth: {
      userId: "user-1",
      role: UserRole.SUPER_ADMIN,
      profileId: "admin-1",
      schoolId: null,
      isFirstLogin: true,
    },
  } as AuthenticatedRequest;

  let receivedError: unknown;
  let called = false;

  requirePasswordChanged(req, {} as never, (error?: unknown) => {
    called = true;
    receivedError = error;
  });

  assert.equal(called, true);
  assert.ok(receivedError instanceof AppError);
  assert.equal((receivedError as AppError).code, "AUTH_PASSWORD_CHANGE_REQUIRED");
  assert.equal((receivedError as AppError).statusCode, 403);
});

test("requirePasswordChanged permits normal access after password change", () => {
  const req = {
    auth: {
      userId: "user-1",
      role: UserRole.SUPER_ADMIN,
      profileId: "admin-1",
      schoolId: null,
      isFirstLogin: false,
    },
  } as AuthenticatedRequest;

  let called = false;

  requirePasswordChanged(req, {} as never, () => {
    called = true;
  });

  assert.equal(called, true);
});

test("requireStudentPinChanged blocks student sessions that still require a PIN change", () => {
  const req = {
    auth: {
      userId: "student-user-1",
      role: UserRole.STUDENT,
      profileId: "student-1",
      schoolId: "school-1",
      isFirstLogin: false,
      requiresPinChange: true,
    },
  } as AuthenticatedRequest;

  let receivedError: unknown;
  let called = false;

  requireStudentPinChanged(req, {} as never, (error?: unknown) => {
    called = true;
    receivedError = error;
  });

  assert.equal(called, true);
  assert.ok(receivedError instanceof AppError);
  assert.equal((receivedError as AppError).code, "AUTH_PIN_CHANGE_REQUIRED");
  assert.equal((receivedError as AppError).statusCode, 403);
});

test("requireStudentPinChanged permits student sessions after a PIN change", () => {
  const req = {
    auth: {
      userId: "student-user-1",
      role: UserRole.STUDENT,
      profileId: "student-1",
      schoolId: "school-1",
      isFirstLogin: false,
      requiresPinChange: false,
    },
  } as AuthenticatedRequest;

  let called = false;

  requireStudentPinChanged(req, {} as never, () => {
    called = true;
  });

  assert.equal(called, true);
});

test("requireStudentPinChanged does not block non-student sessions", () => {
  const req = {
    auth: {
      userId: "admin-user-1",
      role: UserRole.ADMIN,
      profileId: "admin-1",
      schoolId: "school-1",
      isFirstLogin: false,
      requiresPinChange: true,
    },
  } as AuthenticatedRequest;

  let called = false;
  let receivedError: unknown;

  requireStudentPinChanged(req, {} as never, (error?: unknown) => {
    called = true;
    receivedError = error;
  });

  assert.equal(called, true);
  assert.equal(receivedError, undefined);
});

test("authenticate preserves the optional student PIN-change claim", () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const originalExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN;

  process.env.JWT_ACCESS_SECRET = "student-pin-test-secret";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";

  try {
    const token = generateAccessToken({
      sub: "student-user-1",
      role: UserRole.STUDENT,
      profileId: "student-1",
      schoolId: "school-1",
      isFirstLogin: false,
      requiresPinChange: true,
    });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as AuthenticatedRequest;
    let called = false;

    authenticate(req, {} as never, () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(req.auth?.requiresPinChange, true);
    assert.equal(req.auth?.isFirstLogin, false);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = originalSecret;
    }

    if (originalExpiresIn === undefined) {
      delete process.env.JWT_ACCESS_EXPIRES_IN;
    } else {
      process.env.JWT_ACCESS_EXPIRES_IN = originalExpiresIn;
    }
  }
});

test("authenticate rejects missing access tokens with the existing 401 contract", () => {
  const req = {
    headers: {},
  } as AuthenticatedRequest;
  let statusCode: number | undefined;
  let payload: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      payload = body;
      return this;
    },
  } as never;

  authenticate(req, res, () => {
    throw new Error("authenticate should not call next() when the token is missing");
  });

  assert.equal(statusCode, 401);
  assert.deepEqual(payload, {
    success: false,
    message: "Access token is required.",
  });
});
