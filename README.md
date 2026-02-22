# OpenClaw Auto Sprint

A lightweight **autonomous task board + sprint engine** for [OpenClaw](https://github.com/openclaw/openclaw) agents. Your agent picks up tasks, executes sprints, delivers results, and requests human review — all through a mobile-first Kanban UI.

> From manual task management to autonomous sprint cycles. Human sets direction, agent executes.

## What is Auto Sprint?

Auto Sprint turns your OpenClaw agent into an **autonomous executor** with human oversight:

- **Kanban Board** — TODO → DOING → DONE → REVIEW → COMPLETED flow
- **Sprint Engine** — Agent picks tasks, executes, and delivers without prompting
- **Review Workflow** — Human approves, expands, or requests info with one tap
- **Golden Rules** — Board rules loaded from markdown, enforced by agent routines
- **Activity Log** — Every checkin from agent sprints in one place
- **Brain View** — Read your agent's workspace files (SOUL.md, MEMORY.md, etc.)
- **Tools View** — See your agent's available tools and APIs
- **Ideas Board** — Capture inspiration, promote to tickets when ready
- **Analytics** — Task metrics, aging, and completion stats

## Screenshots

_Coming soon_

## The Sprint Cycle

```
Human creates ticket → Agent picks it up (Task Sprint cron)
→ Agent executes → Agent marks DONE → Human reviews on phone
→ Approve ✅ / Expand 🔀 / Need Info ❓
→ Agent processes review decision (OCC Watchdog cron)
```

**Cron-powered routines:**
| Routine | Schedule | What it does |
|---------|----------|--------------|
| **Task Sprint** | 3x/day | Picks TODO/DOING tickets, executes, delivers |
| **Dev Sprint** | Daily 2am | Works on GitHub Issues, creates PRs |
| **Board Audit** | 2x/day | Enforces rules, processes comments, detects stale tickets |
| **OCC Watchdog** | Every 6h | Processes review decisions (approve/expand/need-info) |
| **Morning Brief** | Daily 7am | Summary of overnight work + today's priorities |

## Quick Start

```bash
# Clone
git clone https://github.com/ronaldmego/openclaw-auto-sprint.git
cd openclaw-auto-sprint

# Install (express + optional dotenv)
npm install

# Configure
cp .env.example .env
# Edit .env — set your host, port, and OpenClaw workspace path

# [Optional] Set up workspace templates for new users
cp -r workspace-example/ ~/.openclaw/workspace/
# This provides starter templates for OCC-GOLDEN-RULES.md, TOOLS.md, and agent identity files

# Run
node server.js

# Or with PM2
pm2 start server.js --name occ
```

Then open `http://localhost:3401` in your browser.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OCC_HOST` | `127.0.0.1` | Bind address |
| `OCC_PORT` | `3401` | Server port |
| `OCC_WORKSPACE` | `~/.openclaw/workspace` | OpenClaw workspace path |
| `OCC_HUMAN_NAME` | `Human` | Display name for the human user |
| `OCC_AGENT_NAME` | `Agent` | Display name for the AI agent |
| `OCC_DEFAULT_ASSIGNEE` | `agent` | Default assignee for new tasks (`human` or `agent`) |
| `OCC_DEFAULT_AUTHOR` | `Human` | Default author for comments |

## API

All endpoints return JSON.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all tasks |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/checkins` | List activity log |
| `POST` | `/api/checkin` | Log a checkin |
| `GET` | `/api/ideas` | List ideas |
| `POST` | `/api/ideas` | Create an idea |
| `POST` | `/api/ideas/:id/promote` | Promote idea to task |
| `GET` | `/api/reglas` | Get Golden Rules (markdown) |
| `GET` | `/api/tools` | Get TOOLS.md content |
| `GET` | `/api/brain` | Get workspace .md files |
| `GET` | `/api/search?q=` | Full-text search (tasks + memory) |
| `GET` | `/api/analytics` | Task metrics |
| `GET` | `/api/aging` | Stale task detection |

### Agent Integration

Your OpenClaw agent can interact with Auto Sprint via simple HTTP calls:

```bash
# Create a task
curl -X POST http://localhost:3401/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Review PR #5","assignee":"human","priority":"high","status":"todo","due_date":"2026-02-20"}'

# Log a sprint checkin
curl -X POST http://localhost:3401/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"source":"task-sprint","summary":"Completed #42","details":"..."}'

# Update task status
curl -X PATCH http://localhost:3401/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"done","assignee":"human"}'
```

## Mobile-First Design

Auto Sprint is built for **CEOs who manage from their phone**:

- **Collapsible sections** — Tap to expand/collapse board sections, persisted in localStorage
- **Large touch targets** — Review buttons sized for thumbs, not mice
- **Search by #ID** — Find any ticket instantly, including archived
- **Drive link warnings** — Visual indicator when deliverables are missing
- **Review actions** — Clear "Your review:" label with Approve/Expand/Need Info buttons

## Golden Rules

Auto Sprint loads board rules from `OCC-GOLDEN-RULES.md` in your OpenClaw workspace. Edit the markdown to change the rules — the dashboard renders them automatically.

This keeps rules as code, versionable, and readable by both humans and agents.

## Tabs Overview

| Tab | Description |
|-----|-------------|
| **Board** | Kanban board with collapsible sections and review workflow |
| **Activity** | Chronological log of agent checkins and sprint results |
| **Docs** | Golden Rules rendered from `OCC-GOLDEN-RULES.md` |
| **Ideas** | Brainstorm section — capture, explore, promote to tickets |
| **Tools** | Agent's `TOOLS.md` — APIs, credentials, and capabilities |
| **Brain** | Agent's workspace `.md` files — personality, memory, context |
| **Schedule** | Weekly calendar heatmap of all cron jobs |
| **Analytics** | Task metrics, aging, stale task detection |

## Design Philosophy

- **Zero build step** — No React, no webpack. Vanilla HTML/CSS/JS.
- **Single dependency** — Express. That's it.
- **JSON storage** — No database. Copy the folder = copy the state.
- **Workspace-driven** — Rules, tools, and brain come from your OpenClaw workspace files.
- **Agent-first API** — Every UI action has an API equivalent.
- **Mobile-first UI** — Designed for phone-first management.

## For OpenClaw Users

Auto Sprint is designed to work with [OpenClaw](https://github.com/openclaw/openclaw) agents. Set up your agent's cron jobs to:

1. **Sprint** — Pick and execute tasks autonomously (Task Sprint + Dev Sprint)
2. **Audit** — Enforce Golden Rules and process review decisions
3. **Report** — Morning briefs, SEO reports, intel digests
4. **Check in** — Log every action for full transparency

See the [Golden Rules template](OCC-GOLDEN-RULES.example.md) for a starting point.

## License

MIT

## Contributing

PRs welcome! This is an early-stage project. Open an issue first for major changes.
