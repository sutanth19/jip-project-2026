import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";
import { ZodError } from "zod";

import { AppError } from "../src/errors/app-error.js";
import {
  createSchool,
  getSchoolById,
  listSchools,
  updateSchool,
  updateSchoolStatus,
  type SchoolActor,
  type SchoolRecord,
  type SchoolRepository,
} from "../src/services/school.service.js";
import {
  createSchoolSchema,
  listSchoolsQuerySchema,
  schoolIdParamsSchema,
  updateSchoolSchema,
  updateSchoolStatusSchema,
} from "../src/validators/school.validator.js";

const schoolOneId = "11111111-1111-4111-8111-111111111111";
const schoolTwoId = "22222222-2222-4222-8222-222222222222";
const fixedNow = new Date("2026-07-26T00:00:00.000Z");

const actor: SchoolActor = {
  userId: "33333333-3333-4333-8333-333333333333",
  profileId: "44444444-4444-4444-8444-444444444444",
  role: UserRole.ADMIN,
};

function createRecord(overrides: Partial<SchoolRecord> = {}): SchoolRecord {
  return {
    id: schoolOneId,
    schoolCode: "KDA-001",
    schoolName: "Sekolah Kebangsaan KDA",
    logo: null,
    principalName: "Puan Aminah",
    address: "Jalan Literasi, Kedah",
    phone: "0123456789",
    contactEmail: "kda@example.com",
    accountStatus: AccountStatus.ACTIVE,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  };
}

function clone(record: SchoolRecord): SchoolRecord {
  return { ...record };
}

function createRepository(initialRecords: SchoolRecord[] = []) {
  const records = new Map(initialRecords.map((record) => [record.id, clone(record)]));
  let nextId = 10;

  const repository: SchoolRepository = {
    async findById(id) {
      const record = records.get(id);
      return record ? clone(record) : null;
    },
    async findBySchoolCode(schoolCode) {
      const record = [...records.values()].find(
        (candidate) => candidate.schoolCode === schoolCode,
      );
      return record ? clone(record) : null;
    },
    async findBySchoolName(schoolName) {
      const record = [...records.values()].find(
        (candidate) => candidate.schoolName === schoolName,
      );
      return record ? clone(record) : null;
    },
    async findByContactEmail(contactEmail) {
      const record = [...records.values()].find(
        (candidate) => candidate.contactEmail === contactEmail,
      );
      return record ? clone(record) : null;
    },
    async create(data) {
      const record: SchoolRecord = {
        ...data,
        id: `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      };
      nextId += 1;
      records.set(record.id, record);
      return clone(record);
    },
    async findMany(filters) {
      const search = filters.search?.toLowerCase();
      const filtered = [...records.values()].filter((record) => {
        if (filters.status && record.accountStatus !== filters.status) {
          return false;
        }
        if (!search) {
          return true;
        }
        return [
          record.schoolCode,
          record.schoolName,
          record.principalName ?? "",
          record.contactEmail ?? "",
          record.phone,
        ].some((value) => value.toLowerCase().includes(search));
      });
      const sorted = filtered.sort((left, right) => {
        const leftValue = left[filters.sortBy];
        const rightValue = right[filters.sortBy];
        const comparison = String(leftValue).localeCompare(String(rightValue));
        return filters.sortOrder === "asc" ? comparison : -comparison;
      });

      return sorted.slice(filters.skip, filters.skip + filters.take).map(clone);
    },
    async count(filters) {
      const result = await repository.findMany({
        ...filters,
        skip: 0,
        take: Number.MAX_SAFE_INTEGER,
        sortBy: "schoolCode",
        sortOrder: "asc",
      });
      return result.length;
    },
    async findDetailsById(id) {
      const record = records.get(id);
      return record
        ? {
            ...clone(record),
            counts: { admins: 1, teachers: 2, students: 30, classes: 2 },
          }
        : null;
    },
    async update(id, data) {
      const current = records.get(id);
      if (!current) {
        throw new Error("Unexpected missing school.");
      }
      const next: SchoolRecord = {
        ...current,
        ...(typeof data.schoolCode === "string" ? { schoolCode: data.schoolCode } : {}),
        ...(typeof data.schoolName === "string" ? { schoolName: data.schoolName } : {}),
        ...(typeof data.principalName === "string" || data.principalName === null
          ? { principalName: data.principalName }
          : {}),
        ...(typeof data.address === "string" ? { address: data.address } : {}),
        ...(typeof data.phone === "string" ? { phone: data.phone } : {}),
        ...(typeof data.contactEmail === "string" || data.contactEmail === null
          ? { contactEmail: data.contactEmail }
          : {}),
        ...(typeof data.logo === "string" || data.logo === null ? { logo: data.logo } : {}),
        ...(typeof data.accountStatus === "string"
          ? { accountStatus: data.accountStatus }
          : {}),
        updatedAt: fixedNow,
      };
      records.set(id, next);
      return clone(next);
    },
  };

  return { repository, records };
}

function assertAppError(error: unknown, code: string, statusCode: number): void {
  assert.ok(error instanceof AppError);
  assert.equal(error.code, code);
  assert.equal(error.statusCode, statusCode);
}

test("school creation normalizes code, email, and Malaysian phone numbers", async () => {
  const { repository } = createRepository();
  const school = await createSchool(
    createSchoolSchema.parse({
      schoolCode: " kda_001 ",
      schoolName: " Sekolah Digital Kedah ",
      address: " Jalan Literasi 1 ",
      phone: "+60 12-345 6789",
      contactEmail: " SCHOOL@EXAMPLE.COM ",
    }),
    { actor },
    { repository, now: () => fixedNow },
  );

  assert.equal(school.schoolCode, "KDA_001");
  assert.equal(school.schoolName, "Sekolah Digital Kedah");
  assert.equal(school.phone, "0123456789");
  assert.equal(school.contactEmail, "school@example.com");
  assert.equal(school.accountStatus, AccountStatus.ACTIVE);
});

test("school creation accepts omitted optional contact fields", async () => {
  const { repository } = createRepository();
  const school = await createSchool(
    createSchoolSchema.parse({
      schoolCode: "KDA-002",
      schoolName: "Sekolah Digital Dua",
      address: "Jalan Literasi 2",
      phone: "0312345678",
    }),
    { actor },
    { repository },
  );

  assert.equal(school.contactEmail, null);
  assert.equal(school.principalName, null);
  assert.equal(school.logo, null);
});

test("school creation rejects duplicate codes, names, and contact email with stable errors", async () => {
  const existing = createRecord();

  await assert.rejects(
    createSchool(
      createSchoolSchema.parse({
        schoolCode: existing.schoolCode,
        schoolName: "Nama Baharu",
        address: "Alamat Baharu",
        phone: "0312345678",
      }),
      { actor },
      { repository: createRepository([existing]).repository },
    ),
    (error: unknown) => {
      assertAppError(error, "SCHOOL_CODE_EXISTS", 409);
      return true;
    },
  );

  await assert.rejects(
    createSchool(
      createSchoolSchema.parse({
        schoolCode: "KDA-002",
        schoolName: existing.schoolName,
        address: "Alamat Baharu",
        phone: "0312345678",
      }),
      { actor },
      { repository: createRepository([existing]).repository },
    ),
    (error: unknown) => {
      assertAppError(error, "SCHOOL_NAME_EXISTS", 409);
      return true;
    },
  );

  await assert.rejects(
    createSchool(
      createSchoolSchema.parse({
        schoolCode: "KDA-002",
        schoolName: "Nama Baharu",
        address: "Alamat Baharu",
        phone: "0312345678",
        contactEmail: existing.contactEmail,
      }),
      { actor },
      { repository: createRepository([existing]).repository },
    ),
    (error: unknown) => {
      assertAppError(error, "SCHOOL_EMAIL_EXISTS", 409);
      return true;
    },
  );
});

test("list schools applies pagination, search, status filtering, and allowlisted sorting", async () => {
  const first = createRecord({ schoolCode: "KDA-001" });
  const second = createRecord({
    id: schoolTwoId,
    schoolCode: "KDA-002",
    schoolName: "Sekolah Digital Perlis",
    accountStatus: AccountStatus.SUSPENDED,
  });
  const { repository } = createRepository([first, second]);

  const result = await listSchools(
    listSchoolsQuerySchema.parse({
      page: "1",
      limit: "1",
      search: "perlis",
      status: "SUSPENDED",
      sortBy: "schoolName",
      sortOrder: "asc",
    }),
    { repository },
  );

  assert.equal(result.schools.length, 1);
  assert.equal(result.schools[0]?.id, schoolTwoId);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 1,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  assert.throws(
    () => listSchoolsQuerySchema.parse({ sortBy: "rawSql" }),
    ZodError,
  );
  assert.throws(
    () => listSchoolsQuerySchema.parse({ limit: 101 }),
    ZodError,
  );
});

test("school details include counts and missing schools return SCHOOL_NOT_FOUND", async () => {
  const { repository } = createRepository([createRecord()]);
  const school = await getSchoolById(schoolOneId, { repository });

  assert.deepEqual(school.counts, {
    admins: 1,
    teachers: 2,
    students: 30,
    classes: 2,
  });

  await assert.rejects(
    getSchoolById(schoolTwoId, { repository }),
    (error: unknown) => {
      assertAppError(error, "SCHOOL_NOT_FOUND", 404);
      return true;
    },
  );
});

test("school update is partial, allows the current unique value, and cannot mass-assign status", async () => {
  const { repository } = createRepository([createRecord()]);
  const school = await updateSchool(
    schoolOneId,
    updateSchoolSchema.parse({
      schoolCode: "kda-001",
      principalName: null,
      phone: "60 3-1234 5678",
    }),
    { actor },
    { repository },
  );

  assert.equal(school.schoolCode, "KDA-001");
  assert.equal(school.principalName, null);
  assert.equal(school.phone, "0312345678");
  assert.throws(
    () => updateSchoolSchema.parse({ accountStatus: "ARCHIVED" }),
    ZodError,
  );
  assert.throws(() => updateSchoolSchema.parse({}), ZodError);
});

test("school status policy supports suspension and reserves archived restoration for SUPER_ADMIN", async () => {
  const { repository } = createRepository([createRecord()]);
  const suspended = await updateSchoolStatus(
    schoolOneId,
    AccountStatus.SUSPENDED,
    { actor },
    { repository },
  );
  assert.equal(suspended.accountStatus, AccountStatus.SUSPENDED);

  const active = await updateSchoolStatus(
    schoolOneId,
    AccountStatus.ACTIVE,
    { actor },
    { repository },
  );
  assert.equal(active.accountStatus, AccountStatus.ACTIVE);

  const archived = await updateSchoolStatus(
    schoolOneId,
    AccountStatus.ARCHIVED,
    { actor },
    { repository },
  );
  assert.equal(archived.accountStatus, AccountStatus.ARCHIVED);

  await assert.rejects(
    updateSchoolStatus(schoolOneId, AccountStatus.ACTIVE, { actor }, { repository }),
    (error: unknown) => {
      assertAppError(error, "SCHOOL_STATUS_TRANSITION_INVALID", 403);
      return true;
    },
  );

  const restored = await updateSchoolStatus(
    schoolOneId,
    AccountStatus.ACTIVE,
    { actor: { ...actor, role: UserRole.SUPER_ADMIN } },
    { repository },
  );
  assert.equal(restored.accountStatus, AccountStatus.ACTIVE);
  assert.throws(
    () => updateSchoolStatusSchema.parse({ status: "LOCKED" }),
    ZodError,
  );
});

test("school changes dispatch minimal structured audit events without sensitive fields", async () => {
  const { repository } = createRepository([createRecord()]);
  const events: unknown[] = [];
  const auditDispatcher = (event: unknown) => {
    events.push(event);
  };

  await updateSchool(
    schoolOneId,
    updateSchoolSchema.parse({ schoolName: "Sekolah Kemas Kini" }),
    { actor, requestIp: "127.0.0.1", userAgent: "school-test" },
    { repository, auditDispatcher, now: () => fixedNow },
  );
  await updateSchoolStatus(
    schoolOneId,
    AccountStatus.SUSPENDED,
    { actor },
    { repository, auditDispatcher, now: () => fixedNow },
  );

  assert.equal(events.length, 2);
  const serialized = JSON.stringify(events);
  assert.match(serialized, /SCHOOL_UPDATED/);
  assert.match(serialized, /SCHOOL_STATUS_CHANGED/);
  assert.match(serialized, new RegExp(actor.userId));
  assert.doesNotMatch(serialized, /password|pinHash|setupToken|resetToken/i);
});

test("school validators reject malformed IDs, invalid phones, and unknown create fields", () => {
  assert.throws(
    () => schoolIdParamsSchema.parse({ schoolId: "not-a-uuid" }),
    ZodError,
  );
  assert.throws(
    () =>
      createSchoolSchema.parse({
        schoolCode: "KDA-003",
        schoolName: "Sekolah Tidak Sah",
        address: "Jalan Literasi 3",
        phone: "12345",
      }),
    ZodError,
  );
  assert.throws(
    () =>
      createSchoolSchema.parse({
        schoolCode: "KDA-003",
        schoolName: "Sekolah Tidak Sah",
        address: "Jalan Literasi 3",
        phone: "0312345678",
        accountStatus: "ARCHIVED",
      }),
    ZodError,
  );
});
