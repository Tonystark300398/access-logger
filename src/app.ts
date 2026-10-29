/**
 * access-logger — Express app (no listen here, so tests can import it).
 *
 * Scope & intent: logs requests to YOUR OWN site/server (analytics,
 * rate-limiting, security). The /track endpoint is meant to be called by your
 * own pages; visitors should be told logging happens. Not for disguised links
 * sent to other people.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { appendEntry, readEntries, AccessEntry } from "./logger";

export interface UAInfo {
  browser: string;
  os: string;
}

/** Lightweight User-Agent parser (swap for `ua-parser-js` for full accuracy). */
export function parseUserAgent(ua: string): UAInfo {
  const s = ua || "";

  let os = "Unknown";
  if (/windows nt 10/i.test(s)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(s)) os = "Windows 8.1";
  else if (/windows nt 6\.1/i.test(s)) os = "Windows 7";
  else if (/windows/i.test(s)) os = "Windows";
  else if (/android[ /]?([\d.]+)?/i.test(s)) {
    const m = s.match(/android[ /]?([\d.]+)/i);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/iphone|ipad|ipod/i.test(s)) {
    const m = s.match(/os ([\d_]+)/i);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/mac os x ([\d_]+)/i.test(s)) {
    const m = s.match(/mac os x ([\d_]+)/i);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/cros/i.test(s)) os = "ChromeOS";
  else if (/linux/i.test(s)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/firefox\/([\d.]+)/i.test(s)) {
    const m = s.match(/firefox\/([\d.]+)/i);
    browser = m ? `Firefox ${m[1]}` : "Firefox";
  } else if (/chrome\/([\d.]+)/i.test(s) && !/chromium/i.test(s)) {
    const m = s.match(/chrome\/([\d.]+)/i);
    browser = m ? `Chrome ${m[1]}` : "Chrome";
  } else if (/version\/([\d.]+).*safari/i.test(s)) {
    const m = s.match(/version\/([\d.]+)/i);
    browser = m ? `Safari ${m[1]}` : "Safari";
  }

  return { browser, os };
}

/** Extract client IP, honouring x-forwarded-for when trust proxy is set. */
export function extractIp(req: Request): {
  ip: string;
  forwardedChain: string | null;
} {
  const xff = req.headers["x-forwarded-for"];
  const forwardedChain = Array.isArray(xff) ? xff.join(", ") : xff ?? null;
  const firstForwarded = forwardedChain
    ? forwardedChain.split(",")[0].trim()
    : null;

  let ip = req.ip || firstForwarded || req.socket.remoteAddress || "unknown";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);

  return { ip, forwardedChain };
}

export function createApp() {
  const app = express();

  // Match this to your deployment (see README). Clients can spoof the header,
  // so only trust proxies you actually control.
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

  app.use(cors());
  app.use(express.json());

  app.get("/track", (req: Request, res: Response) => {
    const ua = req.headers["user-agent"] ?? "";
    const { ip, forwardedChain } = extractIp(req);
    const { browser, os } = parseUserAgent(ua);

    const entry: AccessEntry = {
      timestamp: new Date().toISOString(),
      ip,
      forwardedChain,
      browser,
      os,
      userAgent: ua,
      path: req.originalUrl,
      referer: (req.headers["referer"] as string) ?? null,
    };

    appendEntry(entry);

    if (req.query.debug === "1") {
      res.json(entry);
      return;
    }

    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    res.set("Content-Type", "image/gif");
    res.set("Cache-Control", "no-store, max-age=0");
    res.send(pixel);
  });

  // Dashboard API (id 8): read back logged entries, newest first.
  app.get("/api/logs", (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const ip = typeof req.query.ip === "string" ? req.query.ip : undefined;
    const since =
      typeof req.query.since === "string" ? req.query.since : undefined;

    const entries = readEntries({ limit, ip, since });
    res.json({ count: entries.length, entries });
  });

  app.use("/dashboard", express.static(path.resolve(process.cwd(), "public")));

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "access-logger", phase: 4 });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.send(
      "access-logger is running. /track logs requests to your own site. " +
        "Add ?debug=1 to /track to see the parsed entry as JSON. " +
        "View logs at /dashboard."
    );
  });

  return app;
}

// Default export: a ready-to-serve Express app. Vercel's Express runtime
// detects and uses this; app.listen() happens in index.ts for local runs.
export default createApp();
