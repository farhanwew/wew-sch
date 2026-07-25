# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Graph-Paper is a citation graph visualization tool (similar to Connected Papers/ResearchRabbit). Users search academic papers via the Semantic Scholar API, explore citation networks as interactive D3 graphs, and save projects to a PostgreSQL database.

## Development Commands

### Run with Docker (recommended)
```bash
docker-compose up       # Start all services: postgres (:5432), backend (:8000), frontend (:80)
docker-compose down
docker-compose logs -f
```

### Backend (Go)
```bash
cd backend
go mod download
go run main.go          # Runs on :8000
go build -o server .
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, and optionally `S2_API_KEY`.

### Frontend (React/Vite)
```bash
cd wew-scholar
npm install
npm run dev             # Dev server on http://localhost:5173
npm run build
```

Set `VITE_API_URL` in `wew-scholar/.env.local` (default: `http://localhost:8000`).

## Architecture

```
React (Vite/TypeScript) → Gin (Go) REST API → PostgreSQL
                                     ↓
                            Semantic Scholar API
```

### Backend (`/backend`)
- **`main.go`** — Route registration, middleware setup (CORS, optional/required JWT auth)
- **`handlers/`** — HTTP handlers: `auth.go`, `search.go`, `paper.go`, `project.go`
- **`services/semantic_scholar.go`** — All S2 API calls with exponential backoff retry logic
- **`database/`** — `database.go` (connection), `migrations.go` (schema), `queries.go` (SQL)
- **`models/`** — Domain structs for papers, users, and S2 API responses

Database tables: `users`, `projects`, `saved_papers`, `graph_data` (all with CASCADE deletes).

### Frontend (`/wew-scholar`)
- **`App.tsx`** — Central state orchestrator; controls which view is active and passes callbacks down
- **`contexts/AuthContext.tsx`** — JWT token lifecycle; exposes `authFetch()` for authenticated requests
- **`components/GraphView.tsx`** — D3 force-directed graph rendering
- **`types.ts`** — Shared TypeScript interfaces

View routing is done via URL search params (`?view=...&projectId=...`), not React Router.

### Key API Endpoints
| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/auth/register` / `/login` | — | Auth |
| `GET /api/search?query=` | — | Paper search |
| `GET /api/paper/:id/graph` | — | Simple citation graph |
| `GET /api/paper/:id/deep-graph` | — | Inter-connected citation graph |
| `GET/POST /api/projects` | Optional/Required | Project management |
| `POST /api/projects/:id/graph` | Required | Save graph state |

### Graph Building
- **Simple graph:** Fetches a paper's direct citations and references from S2
- **Deep graph:** Additionally fetches the references of each citation node to find inter-paper connections (multi-step, more API calls)

## Deployment

CI/CD is via GitHub Actions (`.github/workflows/deploy.yml`) — triggers on push to `main`, builds and pushes images to GHCR. Production uses `docker-compose.dokploy.yml`.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->