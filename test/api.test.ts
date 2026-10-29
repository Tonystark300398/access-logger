/**
 * Local tests (id 9) for access-logger.
 *
 * Uses Node's built-in test runner (node:test) + supertest. Run with:
 *   npm test
 *
 * Logs are written to a throwaway temp dir so tests don't touch your real
 * logs/access.log.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";

// Point the logger at a temp dir BEFORE importing the app/logger.
const TMP_LOG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "access-logger-test-"));
process.env.LOG_DIR = TMP_LOG_DIR;
process.env.TRUST_PROXY = "true"; // so x-forwarded-for is honoured in tests

// Import after env is set.
import { createApp, parseUserAgent } from "../src/app";

const app = createApp();

after(() => {
  try {
    fs.rmSync(TMP_LOG_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "access-logger");
});

test("GET /track?debug=1 parses UA and IP", async () => {
  const res = await request(app)
    .get("/track?debug=1")
    .set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    )
    .set("X-Forwarded-For", "203.0.113.9, 10.0.0.1");

  assert.equal(res.status, 200);
  assert.equal(res.body.browser.startsWith("Chrome"), true);
  assert.equal(res.body.os, "Windows 10/11");
  // Leftmost x-forwarded-for entry is the original client.
  assert.equal(res.body.ip, "203.0.113.9");
});

test("GET /track (no debug) returns a 1x1 gif beacon", async () => {
  const res = await request(app).get("/track");
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"], "image/gif");
});

test("GET /api/logs returns entries that were just logged", async () => {
  // Fire a couple of tracked requests first.
  await request(app)
    .get("/track")
    .set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")
    .set("X-Forwarded-For", "198.51.100.5");

  const res = await request(app).get("/api/logs?limit=50");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.entries));
  assert.ok(res.body.count >= 1);
  // newest-first ordering
  const first = res.body.entries[0];
  assert.ok(typeof first.timestamp === "string");
  assert.ok(typeof first.ip === "string");
});

test("GET /api/logs?ip= filters by IP substring", async () => {
  const res = await request(app).get("/api/logs?ip=198.51.100");
  assert.equal(res.status, 200);
  for (const e of res.body.entries) {
    assert.ok(e.ip.includes("198.51.100"));
  }
});

test("parseUserAgent handles Android + Firefox", () => {
  const { browser, os } = parseUserAgent(
    "Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0"
  );
  assert.equal(os.startsWith("Android"), true);
  assert.equal(browser.startsWith("Firefox"), true);
});
