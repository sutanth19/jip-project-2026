import assert from "node:assert/strict";
import test from "node:test";

import { distributeItemMarks } from "../src/services/digitalActivity.service.js";

test("distributeItemMarks assigns the full score to a single item", () => {
  assert.deepEqual(distributeItemMarks(100, 1), [100]);
});

test("distributeItemMarks splits even totals deterministically", () => {
  assert.deepEqual(distributeItemMarks(100, 2), [50, 50]);
});

test("distributeItemMarks keeps non-even totals exact", () => {
  const distributed = distributeItemMarks(100, 3);

  assert.deepEqual(distributed, [34, 33, 33]);
  assert.equal(distributed.reduce((sum, marks) => sum + marks, 0), 100);
});
