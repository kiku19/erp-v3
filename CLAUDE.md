# CLAUDE.md — ERP v3

## Stack
- Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4
- PostgreSQL + Prisma ORM v7
- Swagger (swagger-jsdoc + swagger-ui-react), OpenAPI 3.0
- Vitest (unit), Playwright (E2E), Storybook (components)
- Path alias: `@/*` → project root

## Hard Rules

1. **No raw colors.** Use only design tokens from `app/globals.css`. Use `bg-primary`, `text-foreground`, `var(--border)`, etc. Hardcoded hex/rgb = violation.
2. **Every API route must have `@swagger` JSDoc** with summary, request/response schemas, and status codes (200, 400, 401, 404, 500). Docs at `/api-doc`.
3. **TDD: Red → Green → Refactor.** Write failing test first, then implement. No feature ships without tests. **Every component/page/route MUST have unit tests, E2E tests, AND stories written BEFORE implementation. No exceptions.**
4. **Prisma for all DB access.** No raw SQL. Run `npx prisma generate` + `npx prisma migrate dev` after schema changes.
5. **Named exports** everywhere (except Next.js pages/layouts).
6. **`@/` path alias** for imports outside current directory.

## Design Tokens (from `app/globals.css`)
- **Colors:** `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `border`, `input`, `ring` — each has a `-foreground` variant
- **Status:** `success`, `warning`, `error`, `info` — each has `-bg` and `-foreground` variants
- **Hover:** `primary-hover`, `secondary-hover`, `destructive-hover`, `muted-hover` — use these for interactive states, never opacity hacks or mismatched tokens
- **Animation:** `duration-fast` (150ms), `duration-normal` (200ms), `duration-slow` (300ms), `ease-default`, `scale-press` (0.98)
- **Radius:** `sm` (4px), `md` (8px), `lg` (12px), `pill` (9999px)
- **Font:** `font-primary` / `font-secondary` (Inter)

## Tests

- **Unit** (`*.test.ts` co-located): `lib/`, API routes, hooks
- **E2E** (`e2e/*.spec.ts`): every page and user flow
- **Stories** (`*.stories.tsx` co-located): every UI component
- Done = all tests pass, no regressions, happy + error paths covered
