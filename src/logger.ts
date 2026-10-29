/**
 * File logger for access-logger.
 *
 * Writes one JSON object per line (JSON Lines / .jsonl style) to
 * logs/access.log. Append-only, so it is cheap and crash-safe, and easy to
 * parse later (Phase 3 dashboard / SQLite import).
 */

import fs from "fs";
import path from "path";

// On Vercel the only writable location is /tmp (and it is wiped between cold
// starts). Elsewhere (local, Render with a disk) we use ./logs.
const DEFAULT_LOG_DIR = process.env.VERCEL
  ? "/tmp/logs"
  : path.resolve(process.cwd(), "logs");

const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : DEFAULT_LOG_DIR;

const LOG_FILE = path.join(LOG_DIR, "access.log");

// Make sure the logs directory exists before we try to write.
function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export interface AccessEntry {
  timestamp: string;
  ip: string;
  forwardedChain: string | null;
  browser: string;
  os: string;
  userAgent: string;
  path: string;
  referer: string | null;
}

/**
 * Append one entry to the log file. Non-blocking: a write failure is reported
 * to the console but never crashes the request handler.
 */
export function appendEntry(entry: AccessEntry): void {
  ensureLogDir();
  const line = JSON.stringify(entry) + "\n";
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("[access-logger] failed to write log line:", err.message);
    }
  });
}

export function getLogFilePath(): string {
  return LOG_FILE;
}

export interface ReadOptions {
  limit?: number; // max entries to return (newest first)
  ip?: string; // filter: only entries whose ip contains this substring
  since?: string; // filter: only entries with timestamp >= this ISO string
}

/**
 * Read and parse access.log (JSON Lines). Returns entries newest-first.
 * Malformed lines are skipped rather than throwing. For very large logs you
 * would move to SQLite; this is fine for a simple file-backed dashboard.
 */
export function readEntries(opts: ReadOptions = {}): AccessEntry[] {
  if (!fs.existsSync(LOG_FILE)) return [];

  const raw = fs.readFileSync(LOG_FILE, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  let entries: AccessEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as AccessEntry);
    } catch {
      // skip malformed line
    }
  }

  if (opts.ip) {
    const needle = opts.ip.toLowerCase();
    entries = entries.filter((e) => e.ip.toLowerCase().includes(needle));
  }
  if (opts.since) {
    entries = entries.filter((e) => e.timestamp >= opts.since!);
  }

  entries.reverse(); // newest first

  if (opts.limit && opts.limit > 0) {
    entries = entries.slice(0, opts.limit);
  }

  return entries;
}
