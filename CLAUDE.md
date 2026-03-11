# CLAUDE.md — ERP v3

## Stack
- Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4
- PostgreSQL + Prisma ORM v7
- Vitest (unit), Playwright (E2E), Storybook (components)
- Path alias: `@/*` → project root

## TDD Rules

**Always follow Red → Green → Refactor. Write tests first, code second.**

1. Write a failing test before writing any implementation
2. Write minimum code to pass the test
3. Refactor while keeping tests green

### What needs tests

- **Unit tests** (`*.test.ts` co-located): all logic in `lib/`, API routes, hooks
- **E2E tests** (`e2e/*.spec.ts`): every new page, user flow, or API endpoint
- **Stories** (`*.stories.tsx` co-located): every new UI component

### A feature is done when

- All new tests pass (`npx vitest run` + `npx playwright test`)
- No existing tests break
- Both happy path and error cases are covered

## Code Style

- Use `@/` path alias for imports outside current directory
- Named exports (except Next.js pages/layouts)
- API routes return proper status codes and typed JSON
