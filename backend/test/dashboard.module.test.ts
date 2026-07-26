import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import { getAdminDashboard, getParentDashboard, getStudentDashboard, getSuperAdminDashboard, getTeacherDashboard } from "../src/services/dashboard.service.js";
import { dashboardQuerySchema } from "../src/validators/dashboard.validator.js";

const context = (role: UserRole) => ({ userId: "user", profileId: "profile", role, schoolId: "11111111-1111-4111-8111-111111111111", isFirstLogin: false });

function isAccessDenied(value: unknown): boolean { return value instanceof AppError && value.code === "DASHBOARD_ACCESS_DENIED" && value.statusCode === 403; }

test("dashboard query accepts only bounded recent-limit input", () => {
  assert.deepEqual(dashboardQuerySchema.parse({}), { recentLimit: 5 });
  assert.deepEqual(dashboardQuerySchema.parse({ recentLimit: "20" }), { recentLimit: 20 });
  assert.throws(() => dashboardQuerySchema.parse({ recentLimit: 21 }));
  assert.throws(() => dashboardQuerySchema.parse({ include: "user" }));
});

test("super-admin dashboard service rejects every other role before database access", async () => {
  await assert.rejects(() => getSuperAdminDashboard(context(UserRole.ADMIN), { recentLimit: 5 }), isAccessDenied);
  await assert.rejects(() => getSuperAdminDashboard(context(UserRole.TEACHER), { recentLimit: 5 }), isAccessDenied);
});

test("admin dashboard service rejects super-admin and non-admin contexts", async () => {
  await assert.rejects(() => getAdminDashboard(context(UserRole.SUPER_ADMIN), { recentLimit: 5 }), isAccessDenied);
  await assert.rejects(() => getAdminDashboard(context(UserRole.PARENT), { recentLimit: 5 }), isAccessDenied);
});

test("teacher dashboard service rejects student and parent contexts", async () => {
  await assert.rejects(() => getTeacherDashboard(context(UserRole.STUDENT), { recentLimit: 5 }), isAccessDenied);
  await assert.rejects(() => getTeacherDashboard(context(UserRole.PARENT), { recentLimit: 5 }), isAccessDenied);
});

test("student and parent dashboards reject cross-role contexts", async () => {
  await assert.rejects(() => getStudentDashboard(context(UserRole.PARENT)), isAccessDenied);
  await assert.rejects(() => getParentDashboard(context(UserRole.STUDENT)), isAccessDenied);
});
