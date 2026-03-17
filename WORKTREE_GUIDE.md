# Git Worktree Guide for ERP v3

## What is a Git Worktree?

A git worktree lets you check out multiple branches simultaneously in separate directories, sharing the same `.git` history. This means you can work on a feature branch without disrupting your main working directory.

## Creating a Worktree

### 1. Create a worktree with a new branch

```bash
# From the main repo directory:
cd /home/kishore/Project/erp-v3

# Create a new branch and worktree in one command
git branch feature/my-feature
git worktree add ../erp-v3-my-feature feature/my-feature
```

This creates:
- A new branch `feature/my-feature` based on the current HEAD
- A new directory `/home/kishore/Project/erp-v3-my-feature` with that branch checked out

### 2. Create a worktree from an existing branch

```bash
git worktree add ../erp-v3-my-feature existing-branch-name
```

## Setting Up the Application in a Worktree

After creating the worktree, you need to install dependencies and set up the environment:

```bash
# Navigate to the worktree
cd /home/kishore/Project/erp-v3-my-feature

# Install dependencies (node_modules is NOT shared between worktrees)
npm install

# Copy the environment file (the .env is NOT shared)
cp ../erp-v3/.env .env

# Generate Prisma client
npx prisma generate

# Start the development server
npm run dev
```

The dev server runs on `http://localhost:3000` by default. If the main repo is already running on port 3000, use a different port:

```bash
PORT=3001 npm run dev
```

## Managing Worktrees

### List all worktrees

```bash
git worktree list
```

### Remove a worktree when done

```bash
# From the main repo directory
cd /home/kishore/Project/erp-v3

# Remove the worktree (directory must be clean or use --force)
git worktree remove ../erp-v3-my-feature

# Optionally delete the branch if it's been merged
git branch -d feature/my-feature
```

### Prune stale worktree references

```bash
git worktree prune
```

## Important Notes

- **node_modules**: Each worktree needs its own `npm install` — `node_modules` is not shared.
- **.env**: Each worktree needs its own `.env` file — copy from the main repo.
- **Prisma**: Run `npx prisma generate` in each worktree after `npm install`.
- **Database**: All worktrees share the same database (same `.env` connection string). Be careful with migrations — run `npx prisma migrate dev` only from one worktree at a time.
- **Git history**: All worktrees share the same git history. Commits, branches, and stashes are visible from any worktree.
- **Two worktrees cannot have the same branch checked out** — git enforces this to prevent conflicts.

## For Claude Code Agents

When an agent needs to work in isolation:

```bash
# 1. Create worktree
cd /home/kishore/Project/erp-v3
git branch feature/<feature-name>
git worktree add ../erp-v3-<feature-name> feature/<feature-name>

# 2. Setup
cd /home/kishore/Project/erp-v3-<feature-name>
npm install
cp ../erp-v3/.env .env
npx prisma generate

# 3. Develop and test
npm run dev          # Start dev server (use PORT=3001 if 3000 is taken)
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests

# 4. Commit and push
git add <files>
git commit -m "feat: description"
git push -u origin feature/<feature-name>

# 5. Cleanup (from main repo)
cd /home/kishore/Project/erp-v3
git worktree remove ../erp-v3-<feature-name>
```
