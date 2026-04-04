import assert from "node:assert/strict";
import test from "node:test";

import { checkAuthRateLimit } from "../lib/rateLimit.ts";

async function withNodeEnv(nodeEnv, callback) {
  const previousNodeEnv = process.env.NODE_ENV;

  if (nodeEnv == null) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }

  try {
    await callback();
  } finally {
    if (previousNodeEnv == null) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

test(
  "checkAuthRateLimit fails open in non-production when the limiter backend is unavailable",
  { concurrency: false },
  async () => {
    await withNodeEnv("development", async () => {
      const response = await checkAuthRateLimit(null, "anonymous", {
        windowMs: 60_000,
      });

      assert.equal(response, null);
    });
  },
);

test(
  "checkAuthRateLimit still fails secure in production when the limiter backend is unavailable",
  { concurrency: false },
  async () => {
    await withNodeEnv("production", async () => {
      const response = await checkAuthRateLimit(null, "anonymous", {
        windowMs: 60_000,
      });

      assert.ok(response instanceof Response);
      assert.equal(response.status, 429);
    });
  },
);
