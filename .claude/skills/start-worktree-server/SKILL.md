---
name: start-worktree-server
description: Start the Next.js dev server in a git worktree on a specified port (default 3005). Handles Prisma generation, .env copying, and port conflicts automatically.
argument-hint: [port]
allowed-tools: Bash, Read, Glob
---

Start the Next.js dev server for the current git worktree.

## Steps

1. **Detect worktree root**: Use the current working directory. Confirm it is a git worktree (not the main repo) by checking if `.git` is a file (not a directory).

2. **Determine port**: Use `$ARGUMENTS` as the port if provided, otherwise default to `3005`.

3. **Copy `.env`**: If `.env` does not exist in the worktree, copy it from the main repo root:
   ```
   MAIN_REPO=$(git worktree list --porcelain | head -1 | awk '{print $2}')
   cp "$MAIN_REPO/.env" ./.env
   ```

4. **Generate Prisma client**: If `app/generated/prisma/` does not exist, run:
   ```
   npx prisma generate
   ```
   ⚠️ **NEVER run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` in a worktree.** All worktrees share the same database. Schema changes must only happen in the main working directory. Worktrees may only run `prisma generate`.

5. **Kill any existing process on the port**:
   ```
   fuser -k <port>/tcp 2>/dev/null
   sleep 1
   ```

6. **Start the dev server in the background**:
   ```
   npx next dev --port <port>
   ```
   Run this as a background task.

7. **Verify**: Wait a few seconds, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>` to confirm a 200 response.

8. **Report**: Tell the user the server is running at `http://localhost:<port>`.
