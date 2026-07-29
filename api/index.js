import { initDb } from "../server/db.js";
import app from "../server/index.js";

// initDb() establishes the DB connection pool on cold start.
// A failure here must not throw at module scope: that crashes the function
// before Express is mounted, and the platform's HTML error page reads to the
// client as "the server is unreachable". Routes report their own DB errors as
// JSON instead.
try {
  await initDb();
} catch (error) {
  console.error("initDb failed on cold start", error);
}

export default app;
