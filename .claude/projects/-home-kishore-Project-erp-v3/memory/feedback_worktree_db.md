---
name: Worktree database isolation rule
description: Never run prisma migrate/push/reset in worktrees — all worktrees share one PostgreSQL database, schema changes only in main working directory
type: feedback
---

Never run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` in a git worktree. Only `prisma generate` is allowed.

**Why:** All worktrees share the same PostgreSQL database (same `.env` / `DATABASE_URL`). Running migrations or db push in a worktree mutates the shared DB schema, breaking all other worktrees and the main branch. This caused a production-blocking schema drift incident on 2026-03-19.

**How to apply:** When working in a worktree, never touch `prisma/schema.prisma` or run any Prisma CLI command that modifies the database. If a feature needs schema changes, make them in the main working directory first, then create/update the worktree.
