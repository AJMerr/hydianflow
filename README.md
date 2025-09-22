# HydianFlow
HydianFlow is your route to better task management! It is a lightweight kanban style task board. You can create tasks, link them to a GitHub repo + branch, and let the GitHub repo handle the rest!

### [Try it yourself!](https://hydianflow.com)

## Tech Stack
### Front End
- React 
- Typescript
- @tanstack/react-query
- Tailwind CSS
- shadcn/ui 

### Back end
- Go
- Postgres
- GORM

### GitHub integration
- Repo picker (search as you type, keyboard navigation, Enter to select)
- Branch picker (loads after repo selection, filters locally as you type)
- Webhook: moves tasks based on pushes/merges (configurable flow below)

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Production Notes](#production-notes)
- [API Overview](#api-overview)
- [GitHub Webhook Behavior](#github-webhook-behavior)
- [Commit Reference Format](#commit-reference-format)
- [Accessibility (a11y)](#accessibility-a11y)
- [Development Tips](#development-tips)
- [Roadmap](#roadmap)
- [License](#license)

## Features 
- Three Column board: To Do, In Progress, Done
- Full CRUD (Create, Read, Update, Delete)
- GitHub Picker
  - Repo suggestions with debounce and keyboard controls (↑/↓/Enter/Esc)
  - Branch suggestions fetched once after repo is confirmed (no noisy API calls), then filtered locally as you type
- Webhook automation
  - Push to a feature branch → task moves **To Do → In Progress**
  - Merge to default branch (e.g., `main`) → task moves **In Progress → Done**
  - Direct push to default branch is **ignored by default**, unless the commit explicitly

## Architecture
```
/internal
  /auth          # auth helpers
  /githubapi     # GitHub client/service
  /githubhttp    # HTTP handlers for repo/branch lookups
  /ghwebhook     # GitHub webhook: verify + handle push events
  /utils         # JSON helpers, error responses
/web             # React app (Vite), shadcn/ui, react-query
```
**Key flows**
- Repo/branch lookup:
`/api/v1/github/repos?query=<q>` -> minimal repo list
`api/v1/github/branches?repo_full_name=<owner/repo>`-> branch list
- Tasks API:
`/api/v1/tasks?status=todo|in_progress|done` (pagination via next_cursor)
`POST /api/v1/tasks` (create), `PATCH /api/v1/tasks/:id` (update), `DELETE /api/v1/tasks/:id` (delete)
- Webhook:
`POST /api/v1/webhooks/github` (HMAC-SHA256 signature validation)

## Quick Start
### Local:
1. **Clone and install**
```
git clone <this-repo>
cd hydianflow
```
2. **Backend env**
```
HF_DATABASE_URL=postgres://user:pass@localhost:5432/hydianflow?sslmode=disable
HF_SESSION_SECRET=replace-me
HF_GITHUB_CLIENT_ID=...
HF_GITHUB_CLIENT_SECRET=...
HF_GITHUB_WEBHOOK_SECRET=replace-me
HF_BASE_URL=http://localhost:8080   # public base URL the UI/API will use
```
3. **Run DB and API**
```
make migrate 
go run ./cmd/hydianflow-server/main.go 
```
4. **Frontend env**
in `/hydianflow-ui/` create `.env.local`
```
VITE_API_BASE_URL=http://localhost:8080
```
Then:
```
npm install
npm run dev 
```
5. **Sign in with GitHub**
- Visit the app in your browser, click Sign in with GitHub.
- After auth, the board loads with your tasks.

6. **Setup Webhook**
- GitHub → your repo -> Settings -> Webhooks -> Add webhook
- Payload URL: `https://<your-host>/api/v1/webhooks/github`
- Content type: `application/json`
- Secret: use `HF_GITHUB_WEBHOOK_SECRET`
- Events: at least Push events
- Save.

## Configuration
| Variable                   | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `HF_DATABASE_URL`          | Postgres connection string                     |
| `HF_SESSION_SECRET`        | Cookie/session signing                         |
| `HF_GITHUB_CLIENT_ID`      | GitHub OAuth                                   |
| `HF_GITHUB_CLIENT_SECRET`  | GitHub OAuth                                   |
| `HF_GITHUB_WEBHOOK_SECRET` | HMAC secret for webhook signature verification |
| `HF_BASE_URL`              | Public base URL used for redirects/cookies     |
| `VITE_API_BASE_URL`        | Frontend → API base (Vite)                     |

## Production Notes
- Behind a proxy/CDN, ensure:
  - Cookies are forwarded to `/api/v1/*`
  - Do not cache API JSON responses that depend on authentication
- Set Secure, SameSite cookies as appropriate (the server already supports WithCredentials on the client).
- Webhook endpoint should not be cached or rate-limited aggressively by your edge.

## API Overview
### Auth
- `GET /api/v1/auth/me` -> current user
- `POST /api/v1/auth/logout` -> clear session
- `GET /api/v1/auth/github/start` -> initiate OAuth

### Tasks
- `GET /api/v1/tasks?status=todo|in_progress|done`
- `POST /api/v1/tasks`
```
{
  "title": "Wire /tasks to UI",
  "description": "Optional details",
  "repo_full_name": "owner/repo",
  "branch_hint": "feature/my-branch"
}
```
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`

### GitHub lookup
- `GET /api/v1/github/repos?query=<q>` -> `{ items: [{ full_name, private, ... }] }`
- `GET /api/v1/github/branches?repo_full_name=<owner/repo>` -> `{ items: [{ name }] }`

### Webhook 
- `POST /api/v1/webhooks/github`
  Headers:
  - `X-GitHub-Event: push`
  - `X-GitHub-Delivery: <uuid>`
  - `X-Hub-Signature-256: sha256=<hmac>`

## GitHub Webhook Behavior
- Logs all events (deduped by `delivery_id`)
- Push on non-default branch
  - If any task has `repo_full_name` matching the push repo and `branch_hint` equals the pushed branch (or a prefix like `branch_hint/child)`, status is updated:
    - `todo → in_progress`
- Merge to default branch (via push to main/master)
  - By default, the handler completes tasks only when explicit task IDs are referenced in commit messages (see below). This protects against accidental completion after drive-by commits to default.
- Direct push to default branch without task refs
  - Ignored by default (no status changes)

## Commit Reference Fromat
To deliberately complete tasks on a direct push to the default branch, reference task IDs in the commit message:
- `#123`
- `task:123`
Multiple references are supported:
```
git commit -m "Fix docs (#101, #102) task:205"

```
This will mark those tasks as Done (if they belong to the same repo and are in `todo/in_progress`).

## Accessibility (a11y)
- Pickers support keyboard navigation (↑/↓ to move, Enter to select, Esc to dismiss).
- Suggestions open near the input and close after selection.
- Future improvements: add `aria-activedescendant`, `aria-controls`, and role attributes to align fully with WAI-ARIA combobox patterns.

## Development Tips
- **Repo picker:** starts suggesting when you type; selecting a repo confirms it and triggers a single branch fetch.
- **Branch picker:** filters client-side as you type (no extra network calls after the first fetch).
- **Avoid 502s while typing:** branches are not fetched until a repo is selected (click or Enter).

## Roadmap
- Project implementation (Multiple projects per user in order to have multiple boards that you can work on!)
- Team collaboration (Users will be able to create a team so that multiple devs can work on a project together)
- OpenAPI integration for automatic task creation
- Optional auto-link: create task -> create branch
- Full ARIA combobox semantics

## License
MIT
