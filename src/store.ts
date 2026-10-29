/**
 * Storage backend for access-logger.
 *
 * - If Upstash Redis env vars are present (UPSTASH_REDIS_REST_URL +
 *   UPSTASH_REDIS_REST_TOKEN), entries are stored in a Redis list — this
 *   persists across serverless invocations on Vercel.
 * - Otherwise it falls back to the local file backend (logs/access.log),
 *   which is what you use when running locally or on Render.
 *
 * Both functions are async because the Redis REST client is async.
 */

import { Redis } from "@upstash/redis";
import {
  appendEntry as fileAppend,
  readEntries as fileRead,
  getLogFilePath,
} from "./logger";
import type { AccessEntry, ReadOptions } from "./logger";

export type { AccessEntry, ReadOptions } from "./logger";

const REDIS_KEY = "access:log";
const MAX_ENTRIES = 5000; // cap the list so it can't grow unbounded
const useRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = useRedis ? Redis.fromEnv() : null;

export async function appendEntry(entry: AccessEntry): Promise<void> {
  if (redis) {
    try {
      await redis.lpush(REDIS_KEY, JSON.stringify(entry)); // newest at head
      await redis.ltrim(REDIS_KEY, 0, MAX_ENTRIES - 1); // keep newest N
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[access-logger] redis write failed:", (err as Error).message);
    }
    return;
  }
  fileAppend(entry);
}

export async function readEntries(opts: ReadOptions = {}): Promise<AccessEntry[]> {
  if (redis) {
    const filtering = Boolean(opts.ip || opts.since);
    const take = filtering ? MAX_ENTRIES : opts.limit ?? 200;

    let rows: unknown[] = [];
    try {
      rows = await redis.lrange(REDIS_KEY, 0, take - 1); // already newest-first
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[access-logger] redis read failed:", (err as Error).message);
      return [];
    }

    let entries: AccessEntry[] = rows
      .map((r) => {
        if (typeof r === "string") {
          try {
            return JSON.parse(r) as AccessEntry;
          } catch {
            return null;
          }
        }
        return r as AccessEntry; // client may auto-deserialize
      })
      .filter((e): e is AccessEntry => e !== null);

    if (opts.ip) {
      const needle = opts.ip.toLowerCase();
      entries = entries.filter((e) => e.ip.toLowerCase().includes(needle));
    }
    if (opts.since) {
      entries = entries.filter((e) => e.timestamp >= opts.since!);
    }
    if (opts.limit && opts.limit > 0) {
      entries = entries.slice(0, opts.limit);
    }
    return entries;
  }

  return fileRead(opts);
}

export function getStoreInfo(): string {
  return useRedis ? "Upstash Redis" : `file: ${getLogFilePath()}`;
}
