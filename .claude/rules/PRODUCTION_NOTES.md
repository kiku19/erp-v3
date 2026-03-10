# Production Notes

Pre-production and go-live checklist items that must be completed before or during production deployment.
These are deferred items that are not enforced during development but are mandatory for production readiness.

---

## Kong Gateway

- [ ] **Configure Redis for Kong rate limiting**
  Kong's in-memory rate limiting does not work correctly in a multi-node/clustered deployment.
  Redis must be configured as the Kong rate limiting storage backend so limits are shared across all Kong nodes.
  Reference: Kong rate-limiting plugin `policy: redis` configuration.
  Required config: `redis_host`, `redis_port`, `redis_password`, `redis_timeout` in Kong plugin settings.

---

## Authentication

- [ ] **Move RSA keys out of the repository and load from environment**
  `private.pem` and `public.pem` are currently committed to the repository for local development convenience.
  Before production:
  - Remove both key files from the repository (`git rm private.pem public.pem`).
  - Add `private.pem` and `public.pem` to `.gitignore`.
  - Store the key contents in secrets management (e.g. AWS Secrets Manager, Vault, GCP Secret Manager).
  - Inject the key content via environment variables: `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`.
  - Update `src/lib/jwt/sign.ts` (`PRIVATE_KEY_PATH`) to read from `process.env.JWT_PRIVATE_KEY` directly instead of reading a file path.
  - Update any Kong configuration that references the public key to pull from the same secrets store.
  - Rotate both keys immediately after removal — treat the committed keys as compromised.

- [ ] **Configure seed credentials or skip seeding in production**
  `prisma/seed.ts` reads credentials from environment variables (`SEED_*`) with default fallback values.
  The seed script should NOT run against production databases.
  Before production:
  - Do NOT run `prisma db seed` against the production database.
  - If seeding is needed in production, set strong, unique credentials via environment variables.
  - Ensure no default seed accounts exist in production (`SELECT username FROM users WHERE username IN ('admin','user','superadmin')`).
  - The seed credentials are now configurable via env vars — set them to unique values for each environment.

---
