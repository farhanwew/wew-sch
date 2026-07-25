# AGENTS.md

This file is for autonomous coding agents working in this repository.

## Project Snapshot

- Name: Graph-Paper
- Purpose: Visualize and save citation graphs for academic papers.
- Architecture: React + Vite + TypeScript frontend, Go + Gin backend, PostgreSQL.
- Frontend path: `wew-scholar/`
- Backend path: `backend/`
- Infra path: `docker-compose.yml`, `docker-compose.dokploy.yml`

## Rules Files Discovered

- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.
- `CLAUDE.md` exists and contains important project commands/architecture notes.

If Cursor/Copilot rules are added later, merge their guidance into this file.

## Environment and Tooling

- Node project uses Vite with scripts in `wew-scholar/package.json`.
- Go module is `backend` in `backend/go.mod`.
- No dedicated lint config files were found (`eslint`, `prettier`, `golangci-lint`).
- No committed test files were found (`*_test.go` and frontend test files absent at scan time).

## Install and Run

### Full stack via Docker (recommended)

- `docker-compose up`
- `docker-compose down`
- `docker-compose logs -f`

Services:
- Postgres: `:5432`
- Backend API: `:8000`
- Frontend: `:80`

### Backend local

- `cd backend`
- `go mod download`
- `go run main.go`
- `go build -o server .`

Expected env (`backend/.env`):
- `DATABASE_URL`
- `JWT_SECRET`
- Optional `S2_API_KEY`

### Frontend local

- `cd wew-scholar`
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

Expected env (`wew-scholar/.env.local`):
- `VITE_API_URL` (defaults to `http://localhost:8000`)

## Build, Lint, and Test Commands

Use these from repo root unless noted.

### Build

- Backend build: `cd backend && go build ./...`
- Frontend build: `cd wew-scholar && npm run build`
- Docker build/run: `docker-compose up --build`

### Lint and static checks

Backend:
- Format check/apply: `cd backend && gofmt -w .`
- Static checks: `cd backend && go vet ./...`

Frontend:
- Type-check only (no emit): `cd wew-scholar && npx tsc --noEmit`

Note:
- No `npm run lint` script is currently defined.
- Prefer adding lint scripts if you introduce ESLint/Prettier.

### Tests

Current state:
- No committed tests were found during scan.

When tests are present, use:
- Backend all tests: `cd backend && go test ./...`
- Backend single package: `cd backend && go test ./handlers`
- Backend single test function: `cd backend && go test ./handlers -run TestName`
- Backend verbose single test: `cd backend && go test ./handlers -run TestName -v`

Frontend (if Vitest/Jest is added later):
- All tests example: `cd wew-scholar && npx vitest run`
- Single file example: `cd wew-scholar && npx vitest run src/foo/bar.test.ts`
- Single test name example: `cd wew-scholar && npx vitest run -t "renders graph"`

## Code Style Guidelines

Follow existing code patterns first; avoid unrelated refactors.

### Cross-language principles

- Keep functions focused and small when practical.
- Prefer explicit types and data shapes over loosely typed objects.
- Handle errors at boundaries (HTTP handlers, API calls, storage calls).
- Return actionable error messages to callers; avoid silent failures.
- Do not add dependencies unless needed.
- Keep naming domain-driven: papers, projects, graph, citations, references.

### Imports

TypeScript/React:
- Use ES module imports.
- Group imports as: external packages, then local modules.
- Keep paths consistent with existing style (`./` and `../`; alias `@` is available).

Go:
- Use standard Go import grouping and let `gofmt` normalize ordering.
- Keep module-local imports (`backend/...`) explicit.

### Formatting

TypeScript/React:
- Match existing style: single quotes, semicolons, 2-space indentation.
- Prefer `const` over `let` unless reassignment is needed.
- Keep JSX readable; extract complex chunks into components/helpers.

Go:
- Always run `gofmt` on changed files.
- Keep idiomatic Go spacing and line wrapping.
- Avoid manual formatting that conflicts with `gofmt`.

### Types and data modeling

TypeScript:
- Prefer explicit interfaces/types for props and API payloads.
- Avoid `any`; if unavoidable, keep usage localized and documented by naming/context.
- Reuse shared types from `wew-scholar/types.ts`.

Go:
- Use structs with clear JSON tags for request/response types.
- Keep request structs near handlers when handler-specific.
- Use pointer fields only when nullability is meaningful.

### Naming conventions

TypeScript:
- Components: PascalCase (`GraphView`, `AuthModal`).
- Hooks/helpers/variables/functions: camelCase.
- Constants: UPPER_SNAKE_CASE for true constants.
- Boolean names should read as predicates (`isLoading`, `isAuthenticated`).

Go:
- Exported identifiers: PascalCase.
- Internal identifiers: camelCase.
- Handler names should end with `Handler`.
- Middleware names should end with `Middleware`.

### Error handling

Backend (Gin):
- Validate request input with `ShouldBindJSON` and return `400` on invalid payloads.
- Return consistent JSON error shape: `{"error": "message"}`.
- Use proper status codes (`401`, `403`, `404`, `409`, `500`).
- Abort request in middleware after auth failures.

Frontend:
- Wrap network calls in `try/catch`.
- Check `response.ok` before parsing success paths.
- Surface useful feedback for failed user actions.
- Log errors with enough context for debugging.

### API and state conventions

- Backend routes are under `/api/...` and should remain consistent.
- Preserve auth behavior: optional auth for project listing, required auth for mutations.
- Frontend view routing is URL search-param based (`?view=...&projectId=...`), not React Router.
- Keep API URL resolution consistent via `import.meta.env.VITE_API_URL` fallback.

## Agent Workflow Expectations

- Read relevant files before editing; match local conventions.
- Make minimal, targeted changes.
- Run applicable checks for touched code:
  - Go changes: `gofmt`, `go vet`, and `go test` when tests exist.
  - Frontend changes: `npx tsc --noEmit` and `npm run build` for integration confidence.
- If you cannot run a check, state what was not run and why.
- Do not rewrite unrelated code solely for style.

## Quick Command Cheat Sheet

- Full stack: `docker-compose up`
- Backend run: `cd backend && go run main.go`
- Frontend run: `cd wew-scholar && npm run dev`
- Backend checks: `cd backend && gofmt -w . && go vet ./...`
- Frontend checks: `cd wew-scholar && npx tsc --noEmit && npm run build`

Keep this file updated whenever scripts, tooling, or repository rules change.
