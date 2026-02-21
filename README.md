# OCC — OpenClaw Command Center

A lightweight Kanban board and API designed for **human-agent coordination** with [OpenClaw](https://github.com/openclaw/openclaw).

> Strategic AI coordination through structured task management and autonomous workflow execution.

## What is OCC?

OCC is the **Single Source of Truth** for managing tasks between you and your AI agent. It provides:

- **Kanban Board** — TODO → DOING → DONE → COMPLETED flow with assignees and reviews
- **Golden Rules** — Board rules loaded from markdown, not hardcoded
- **Activity Log** — Every checkin from agent routines in one place
- **Brain View** — Read your agent's workspace files (SOUL.md, MEMORY.md, etc.)
- **Tools View** — See your agent's available tools and APIs
- **Analytics** — Task metrics and completion stats

## Screenshots

_Coming soon_

## Quick Start

```bash
# Clone
git clone https://github.com/ronaldmego/openclaw-command-center.git
cd openclaw-command-center

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
| `GET` | `/api/reglas` | Get Golden Rules (markdown) |
| `GET` | `/api/tools` | Get TOOLS.md content |
| `GET` | `/api/brain` | Get workspace .md files |
| `GET` | `/api/search?q=` | Full-text search |
| `GET` | `/api/analytics` | Task metrics |

### Agent Integration

Your OpenClaw agent can interact with OCC via simple HTTP calls:

```bash
# Create a task
curl -X POST http://localhost:3401/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Review PR #5","assignee":"human","priority":"high","status":"todo","due_date":"2026-02-20"}'

# Log a routine checkin
curl -X POST http://localhost:3401/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"source":"morning-brief","summary":"All systems green","details":"..."}'

# Update task status
curl -X PATCH http://localhost:3401/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"done","assignee":"human"}'
```

## Golden Rules

OCC loads board rules from `OCC-GOLDEN-RULES.md` in your OpenClaw workspace. Edit the markdown to change the rules — the dashboard renders them automatically.

This keeps rules as code, versionable, and readable by both humans and agents.

## Tabs Overview

| Tab | Description |
|-----|-------------|
| **Board** | Kanban board with TODO → DOING → DONE → COMPLETED flow |
| **Activity** | Chronological log of agent checkins and routine results |
| **Docs** | Golden Rules rendered from `OCC-GOLDEN-RULES.md` |
| **Ideas** | Brainstorm section for ideas and inspiration |
| **Tools** | Agent's `TOOLS.md` — APIs, credentials, and capabilities |
| **Brain** | Reads workspace `.md` files (SOUL.md, MEMORY.md, USER.md, IDENTITY.md, etc.) — your agent's personality, memory, and context at a glance |
| **Schedule** | Weekly calendar heatmap of all cron jobs — spot idle/saturated hours |
| **Analytics** | Task metrics and completion stats |

### Brain Tab

The Brain tab displays all `.md` files from your OpenClaw workspace (`OCC_WORKSPACE` path). This gives you visibility into:

- **SOUL.md** — Agent personality and rules
- **MEMORY.md** — Long-term curated memory
- **USER.md** — Info about the human operator
- **IDENTITY.md** — Agent identity and role
- **TOOLS.md** — Available tools and local notes
- **HEARTBEAT.md** — Heartbeat checklist

These files are read-only in the UI. Edit them directly in the workspace or via your agent.

## Design Philosophy

- **Zero build step** — No React, no webpack. Vanilla HTML/CSS/JS.
- **Single dependency** — Express. That's it.
- **JSON storage** — No database. Copy the folder = copy the state.
- **Workspace-driven** — Rules, tools, and brain come from your OpenClaw workspace files.
- **Agent-first API** — Every UI action has an API equivalent.

## For OpenClaw Users

OCC is designed to work with [OpenClaw](https://github.com/openclaw/openclaw) agents. Set up your agent's cron jobs to:

1. **Check in** after each routine (POST `/api/checkin`)
2. **Pick tasks** from the board (GET `/api/tasks`)
3. **Update status** as work progresses (PATCH `/api/tasks/:id`)
4. **Audit the board** periodically to enforce Golden Rules

See the [Golden Rules template](OCC-GOLDEN-RULES.example.md) for a starting point.

## License

MIT

## Contributing

PRs welcome! This is an early-stage project. Open an issue first for major changes.
