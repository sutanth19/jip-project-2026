import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("persistent audit migration creates only the append-only table, indexes, and SET NULL foreign keys", async () => {
  const sql = await readFile(new URL("../prisma/migrations/20260726145937_persistent_audit_log/migration.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE "audit_logs"/);
  assert.match(sql, /CREATE INDEX "audit_logs_restrictedToSuperAdmin_createdAt_idx"/);
  assert.match(sql, /ON DELETE SET NULL/);
  assert.equal(/DROP TABLE|DROP COLUMN|DELETE FROM|ALTER COLUMN/i.test(sql), false);
});
