/**
 * Vercel serverless entry point.
 *
 * Vercel treats files under /api as serverless functions. An Express app is a
 * request handler, so we can export it directly as the default export.
 *
 * CAVEAT: Vercel's filesystem is read-only except for /tmp, and /tmp is wiped
 * between cold starts. So file-based logging does NOT persist here — entries
 * written during one warm instance disappear on the next cold start, and the
 * /dashboard will usually look empty. For persistent logs use Render (see
 * render.yaml) or move storage to an external database.
 */

import { createApp } from "../src/app";

// The only writable location on Vercel is /tmp.
process.env.LOG_DIR = process.env.LOG_DIR || "/tmp/logs";

export default createApp();
