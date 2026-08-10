import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";

import { UserRole } from "@prisma/client";

import { loginController } from "../src/controllers/auth.controller.js";
import { createAuthRouter } from "../src/routes/auth.routes.js";
import { AppError } from "../src/errors/app-error.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { generateAccessToken } from "../src/utils/jwt.js";

type RequestCapture = {
  authorization: string | null;
  body: Record<string, unknown>;
};

function createTestRouter(options?: {
  onLogin?: (capture: RequestCapture) => void;
  onMe?: (role: UserRole) => void;
}) {
  return createAuthRouter({
    loginController(req, res) {
      options?.onLogin?.({
        authorization: req.get("authorization"),
        body: req.body as Record<string, unknown>,
      });

      res.status(200).json({
        success: true,
        message: "login-controller-hit",
      });
    },
    studentLoginController(_req, res) {
      res.status(200).json({ success: true, message: "student-login-controller-hit" });
    },
    setupPasswordController(_req, res) {
      res.status(200).json({ success: true, message: "setup-password-controller-hit" });
    },
    forgotPasswordController(_req, res) {
      res.status(200).json({ success: true, message: "forgot-password-controller-hit" });
    },
    resetPasswordController(_req, res) {
      res.status(200).json({ success: true, message: "reset-password-controller-hit" });
    },
    changeFirstPasswordController(_req, res) {
      res.status(200).json({ success: true, message: "change-first-password-controller-hit" });
    },
    changeFirstPinController(_req, res) {
      res.status(200).json({ success: true, message: "change-first-pin-controller-hit" });
    },
    meController(req, res, next) {
      if (!req.user) {
        next(new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token."));
        return;
      }

      options?.onMe?.(req.user.role);

      if (req.user.role !== UserRole.SUPER_ADMIN) {
        next(new AppError("AUTH_ROLE_FORBIDDEN", 403, "Forbidden."));
        return;
      }

      res.status(200).json({
        success: true,
        message: "me-controller-hit",
      });
    },
  });
}

async function request(
  router: ReturnType<typeof createAuthRouter>,
  path: string,
  init?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
) {
  return await new Promise<{ response: { status: number }; json: unknown }>((resolve, reject) => {
    const req = {
      method: init?.method ?? "GET",
      url: path,
      originalUrl: path,
      path,
      body: init?.body ?? {},
      headers: Object.fromEntries(
        Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
      ),
      get(name: string) {
        return this.headers[name.toLowerCase()];
      },
      header(name: string) {
        return this.get(name);
      },
      ip: "127.0.0.1",
      socket: {
        remoteAddress: "127.0.0.1",
      },
      app: {
        get(setting: string) {
          if (setting === "trust proxy fn") {
            return () => false;
          }

          return undefined;
        },
      },
    } as unknown as Request;

    let statusCode = 200;
    let settled = false;

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        settled = true;
        resolve({
          response: { status: statusCode },
          json: body,
        });
        return this;
      },
      setHeader() {
        return this;
      },
      getHeader() {
        return undefined;
      },
      removeHeader() {
        return this;
      },
      append() {
        return this;
      },
    } as unknown as Response;

    const next: NextFunction = (error?: unknown) => {
      if (settled) {
        return;
      }

      if (error) {
        errorHandler(error as Error, req, res, (() => undefined) as NextFunction);
        return;
      }

      reject(new Error(`No route handler completed for ${req.method} ${path}.`));
    };

    router.handle(req, res, next);
  });
}

test("POST /api/auth/login stays public and reaches the login controller without an Authorization header", async () => {
  let capture: RequestCapture | null = null;
  const router = createTestRouter({
    onLogin(details) {
      capture = details;
    },
  });

  const { response, json } = await request(router, "/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: {
      role: UserRole.SUPER_ADMIN,
      loginId: "superadmin@digitalmolib.my",
      password: "Admin@12345",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(json.message, "login-controller-hit");
  assert.deepEqual(capture, {
    authorization: undefined,
    body: {
      role: UserRole.SUPER_ADMIN,
      loginId: "superadmin@digitalmolib.my",
      password: "Admin@12345",
    },
  });
});

test("loginController preserves the existing invalid-input response contract", async () => {
  const req = {
    body: {
      role: UserRole.SUPER_ADMIN,
      loginId: "",
      password: "",
    },
  } as Request;
  let receivedError: unknown;

  await loginController(req, {} as Response, (error?: unknown) => {
    receivedError = error;
  });

  assert.ok(receivedError instanceof AppError);
  assert.equal(receivedError.code, "AUTH_INVALID_INPUT");
  assert.equal(receivedError.statusCode, 400);
  assert.equal(receivedError.message, "Sila semak maklumat log masuk anda.");
});

test("GET /api/auth/me still rejects missing access tokens with 401 instead of 500", async () => {
  const router = createTestRouter();

  const { response, json } = await request(router, "/me");

  assert.equal(response.status, 401);
  assert.deepEqual(json, {
    success: false,
    message: "Access token is required.",
  });
});

test("GET /api/auth/me still enforces RBAC after authentication succeeds", async () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const originalExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN;

  process.env.JWT_ACCESS_SECRET = "auth-routes-test-secret";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";

  try {
    const router = createTestRouter();
    const teacherToken = generateAccessToken({
      sub: "teacher-user-1",
      role: UserRole.TEACHER,
      profileId: "teacher-1",
      schoolId: "school-1",
      isFirstLogin: false,
    });

    const { response, json } = await request(router, "/me", {
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    });

    assert.equal(response.status, 403);
    assert.deepEqual(json, {
      success: false,
      error: {
        code: "AUTH_ROLE_FORBIDDEN",
        message: "Forbidden.",
      },
    });
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
