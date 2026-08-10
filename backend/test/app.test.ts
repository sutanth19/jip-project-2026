import assert from "node:assert/strict";
import test from "node:test";

import { resolveTrustProxySetting } from "../src/app.js";

test("resolveTrustProxySetting trusts a single proxy hop in production", () => {
  assert.equal(resolveTrustProxySetting({ NODE_ENV: "production" } as NodeJS.ProcessEnv), 1);
});

test("resolveTrustProxySetting preserves direct localhost development defaults", () => {
  assert.equal(resolveTrustProxySetting({ NODE_ENV: "development" } as NodeJS.ProcessEnv), false);
  assert.equal(resolveTrustProxySetting({} as NodeJS.ProcessEnv), false);
});
