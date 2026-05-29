import { initDb } from "../server/db.js";
import app from "../server/index.js";

// initDb() establishes the DB connection pool on cold start.
// Module-level top-level await ensures it completes before the first request.
await initDb();

export default app;
