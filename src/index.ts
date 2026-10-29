/**
 * access-logger — server entry point.
 *
 * Local / Render: starts an HTTP listener.
 * Vercel: the app is exported (default) and Vercel serves it as a function, so
 * we skip app.listen when running there (process.env.VERCEL is set).
 */

import app from "./app";
import { getLogFilePath } from "./logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`access-logger listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`writing access entries to ${getLogFilePath()}`);
  });
}

export default app;
