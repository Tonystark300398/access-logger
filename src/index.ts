/**
 * access-logger — server entry point. Boots the Express app and listens.
 * See src/app.ts for the routes and src/logger.ts for persistence.
 */

import { createApp } from "./app";
import { getLogFilePath } from "./logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`access-logger listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`writing access entries to ${getLogFilePath()}`);
});
