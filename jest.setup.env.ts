// Runs before module imports in both api and ui projects.
// Loads .env file and sets required env vars before any modules are imported.
import dotenv from "dotenv";
dotenv.config();

// Explicit fallback for NEXT_PUBLIC_KONG_BASE_URL (needed by page modules at evaluation time)
process.env.NEXT_PUBLIC_KONG_BASE_URL =
  process.env.NEXT_PUBLIC_KONG_BASE_URL ?? "http://localhost:8000";
