# Project-Specific Implementation Notes

This file contains project-specific learnings, quirks, and implementation notes that must be followed.
All developers (human and AI agents) must follow these rules without exception.

---

## Prisma 7 Breaking Changes

- Prisma 7 no longer supports `url = env("DATABASE_URL")` in schema.prisma
- The URL must be configured in `prisma.config.ts` via `datasource.url`
- Remove the `url` field from `datasource db {}` block in schema.prisma entirely
- Run `npm install dotenv` and import in prisma.config.ts

## shadcn/ui Path Issue

- shadcn creates components at the literal path from `components.json` aliases
- If aliases use `@/components/ui`, the CLI may create files at `@/components/ui/` literally
- After `npx shadcn@latest add`, verify files are in `src/components/ui/` not `@/components/ui/`
- Fix: `mv "@/components/ui/"* src/components/ui/ && rm -rf "@/"`

## shadcn sonner circular import

- shadcn-generated `sonner.tsx` incorrectly imports from itself (`@/components/ui/sonner`)
- Fix: change the import to the actual package: `from "sonner"`

## BullMQ + ioredis version conflict

- BullMQ bundles its own ioredis internally — do NOT use external ioredis with BullMQ
- Use `ConnectionOptions` from `bullmq` directly with host/port instead of IORedis instance
- Avoid `import IORedis from "ioredis"` when using with BullMQ to prevent type conflicts

## jest.config.ts

- The correct Jest config key is `setupFilesAfterEnv`, NOT `setupFilesAfterFramework`

## Next.js Boilerplate Pattern

- Always run `npx create-next-app` in a temp dir then copy to target if target dir has contents
- Prisma generate requires `@prisma/client` installed even with separate `prisma` dev dep
- nuqs `NuqsAdapter` must wrap the app in `layout.tsx` from `nuqs/adapters/next/app`

## Database Choice Rule

- Ask user MongoDB vs PostgreSQL before developing each feature
- PostgreSQL with Prisma is used for auth/RBAC (user management, roles, permissions)
- MongoDB is used for tenant business data (per ARCHITECTURE_STANDARDS.md)

## Git Worktree Testing

- When testing a worktree, run Next.js on a different port (e.g., 3003)
- Start with: `npm run dev -- -p 3003` (or set `PORT=3003` in .env)
- Update `TEST_BASE_URL=http://localhost:3003` in worktree's .env (add at bottom; dotenv uses last value)
- Never hardcode base URLs in tests — always use env variables
- `TEST_BASE_URL` is used by Jest API tests to hit the correct server
- `KONG_BASE_URL` is used by tests to hit Kong gateway
- These env vars allow tests to run against any server instance
- **CRITICAL**: Copy `private.pem` and `public.pem` to the worktree dir — they're gitignored and won't be present
  - `cp /path/to/main/private.pem ./ && cp /path/to/main/public.pem ./`
- **Kong routing**: Update Kong service to point to worktree's port (e.g., 3003) for Kong tests to pass
  - `curl -X PATCH http://localhost:8001/services/<service-id> -d "port=3003"`
  - Get service ID from: `curl http://localhost:8001/services`
  - Restore after merge: `curl -X PATCH http://localhost:8001/services/<service-id> -d "port=3002"`
- **Jest env**: The `api` jest project requires `setupFiles` with dotenv so `TEST_BASE_URL` is loaded
  - Without it, tests fall back to `localhost:3002` (default fallback in test files)
