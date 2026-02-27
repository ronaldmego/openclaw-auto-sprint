# OAS — OpenClaw Auto Sprint

## Tabla de Contenidos

- [Qué es esto](#qué-es-esto)
- [Puerto y Acceso](#puerto-y-acceso)
- [Arquitectura](#arquitectura)
- [Archivos Clave](#archivos-clave)
- [API Endpoints](#api-endpoints)
- [Modelo de Datos](#modelo-de-datos)
- [Ticket Types (AUTO/MANUAL)](#ticket-types-automanual)
- [Worker Runs (Observability)](#worker-runs-observability)
- [Frontend (UI)](#frontend-ui)
- [Quick Start](#quick-start)
- [Comandos Frecuentes](#comandos-frecuentes)
- [Convenciones de Desarrollo](#convenciones-de-desarrollo)
- [Seguridad](#seguridad)
- [Bugs Conocidos](#bugs-conocidos)

---

## Qué es esto

OAS es un **tablero Kanban + API REST** donde humanos y agentes AI coordinan trabajo. Es el sistema operativo de la relación humano-agente, y el **MVP de Khipu** (AI Worker Governance).

**Principios:**
1. El agente necesita estructura → OAS impone flujo, prioridades, accountability
2. El humano necesita visibilidad → Dashboard web accesible desde teléfono
3. Golden Rules como código → viven en markdown del workspace, no hardcodeadas
4. Worker observability → cada ejecución de cron/worker se loguea con modelo, tokens, costo

---

## Puerto y Acceso

| Item | Valor |
|------|-------|
| Puerto | `3401` (Tailscale only) |
| Bind | `OCC_HOST` env var (default `127.0.0.1`) |
| URL (Ronald) | `http://100.64.216.28:3401` |
| Proceso | PM2: `occ` |
| Repo | `ronaldmego/openclaw-auto-sprint` |

---

## Arquitectura

```
Browser (UI) ──HTTP──> server.js (Express)
                          │
              ┌───────────┼───────────────┐
              ▼           ▼               ▼
         data/tasks.json  data/logs/   data/worker-runs.jsonl
                          │
                          ▼
              OpenClaw Workspace (~/.openclaw/workspace/)
              ├── OAS-GOLDEN-RULES.md (board rules)
              ├── TOOLS.md (agent tools inventory)
              ├── SOUL.md, IDENTITY.md, USER.md, MEMORY.md (brain)
              └── memory/*.md (daily logs)
```

**Stack:** Node.js + Express | Vanilla HTML/CSS/JS (single file) | JSON/JSONL storage | PM2

---

## Archivos Clave

```
├── CLAUDE.md              # ESTE ARCHIVO — leer siempre antes de tocar el repo
├── server.js              # API + static server (~600 líneas)
├── public/
│   ├── index.html         # Full UI single page (~1500 líneas)
│   ├── calendar.html      # Schedule view (iframe)
│   └── favicon.svg
├── data/                  # Runtime data (GITIGNORED)
│   ├── tasks.json         # Todos los tickets
│   ├── activity.json      # Activity log
│   ├── worker-runs.jsonl  # Worker execution logs (append-only)
│   └── logs/              # Cron execution markdown logs
├── docs/
│   ├── autonomous-sprint-cycle.md
│   ├── board-autonomy-architecture.md
│   ├── ticket-anatomy.md
│   └── golden-rules-changelog.md
└── .gitignore
```

---

## API Endpoints

### Tasks (tickets)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List all tasks (filter: `?status=`, `?include_all=true`) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task fields |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |
| DELETE | `/api/tasks/:id/comments/:commentId` | Delete comment |

### Ideas
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ideas` | List ideas (filter: `?status=`, `?tag=`) |
| POST | `/api/ideas` | Create idea |
| PATCH | `/api/ideas/:id` | Update idea |
| POST | `/api/ideas/:id/promote` | Promote idea → task |
| DELETE | `/api/ideas/:id` | Delete idea |

### Worker Runs (Observability)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/worker-runs` | Log a worker execution |
| GET | `/api/worker-runs` | List runs (`?limit=100`) |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config` | UI config (names, defaults) |
| GET | `/api/stats` | Board statistics |
| GET | `/api/aging` | Task aging analytics |
| POST | `/api/checkin` | Cron check-in (legacy, use worker-runs for new crons) |
| GET | `/api/logs` | List cron execution logs |
| GET | `/api/crons` | Proxy to `openclaw cron list --json` |
| GET | `/api/docs` | Documentation sections |
| GET | `/api/brain` | Workspace markdown files |
| GET | `/api/tools` | TOOLS.md content |
| GET | `/api/search` | Search memory files |

---

## Modelo de Datos

### Task (ticket)
```json
{
  "id": 155,
  "title": "Hackathon Galáctica — PEPA Wallet Intelligence",
  "description": "...",
  "status": "doing",           // todo | doing | done | routine | archived
  "priority": "high",          // low | normal | high | critical
  "assignee": "ronald",        // agent | pepa | human | ronald
  "ticket_type": "manual",     // ⚡ auto | 🔧 manual (KEY FIELD)
  "deliverable_type": "other", // legacy, kept for backward compat, hidden in UI
  "drive_link": null,
  "github_link": null,
  "doc_link": "docs/hackathon-galactica/PLAN.md",
  "project_ref": null,
  "parent_id": null,
  "due_date": "2026-03-22",
  "created_at": "2026-02-25T23:59:09.392Z",
  "updated_at": "2026-02-26T16:39:13.336Z",
  "completed_at": null,
  "reviewed_by_owner": false,
  "review_action": null,       // close | expand | need_info
  "comments": []
}
```

### Worker Run
```json
{
  "worker": "Intel GitHub",
  "ticket_id": 141,
  "model": "google/gemini-2.5-flash",
  "tokens_in": 12400,
  "tokens_out": 3200,
  "cost_usd": 0.012,
  "duration_s": 48,
  "status": "ok",
  "timestamp": "2026-02-26T20:05:00Z"
}
```

---

## Ticket Types (AUTO/MANUAL)

**Esto es clave para la gobernanza de workers.**

| Type | Badge | Meaning | Who executes |
|------|-------|---------|-------------|
| `auto` | ⚡ AUTO (verde) | Cron/worker puede ejecutarlo | Crons (Task Sprint, Dev Sprint, etc.) |
| `manual` | 🔧 MANUAL (ámbar) | Requiere humano u Opus | Ronald o Pepa en conversación directa |

**Migration:** Al cargar `tasks.json`, si un ticket no tiene `ticket_type`, se asigna automáticamente:
- `assignee` in `[agent, pepa]` → `auto`
- else → `manual`

**UI:** El badge es clickeable (toggle auto↔manual). También hay filtro en la barra de filtros.

---

## Worker Runs (Observability)

Los crons deben loguear su ejecución vía POST `/api/worker-runs` al terminar. Esto alimenta:

1. **Tab "⚡ Runs"** en el board — tabla con todas las ejecuciones
2. **Stats** — runs/día, costo/día, costo/semana, tokens, success rate
3. **Audit trail** — quién ejecutó qué, con qué modelo, cuánto costó

**Campos requeridos:** `worker` (nombre del cron). Todo lo demás es opcional pero recomendado.

**Storage:** `data/worker-runs.jsonl` (append-only, una línea JSON por run).

### Ejemplo de log desde un cron
```bash
curl -X POST http://100.64.216.28:3401/api/worker-runs \
  -H "Content-Type: application/json" \
  -d '{"worker":"Intel GitHub","ticket_id":141,"model":"google/gemini-2.5-flash","tokens_in":12400,"tokens_out":3200,"cost_usd":0.012,"duration_s":48,"status":"ok"}'
```

---

## Frontend (UI)

**Tabs:** Board | Activity | Docs | Ideas | Tools | Brain | Runs | Schedule | Analytics

### Board
- Columnas: **To Do** → **Doing** → **Review** (+ Routines, Closed)
- Cada tarjeta muestra: ID, título, assignee badge, **ticket_type badge (AUTO/MANUAL)**, priority, due date
- Filtros: assignee, priority, deliverable_type, status, **ticket_type**
- Actions: Start, Done, Approve, Expand, Need Info, Back

### Runs (nuevo)
- Tabla de worker runs con: timestamp, worker, ticket, model, tokens in/out, cost, duration, status
- Stats superiores: today runs, today cost, week runs, week cost, week tokens, success rate

### Key UI patterns
- **Badges son clickeables:** priority cycle, assignee toggle, ticket_type toggle
- **No React, no build step:** Vanilla JS, todo en un solo HTML
- **Auto-refresh:** cada 30 segundos

---

## Quick Start

```bash
npm install
cp .env.example .env  # Edit host/port/workspace
node server.js         # or: pm2 restart occ
```

---

## Comandos Frecuentes

```bash
# Restart
pm2 restart occ

# Logs
pm2 logs occ --lines 50

# API test
curl -s http://100.64.216.28:3401/api/tasks | python3 -m json.tool | head -20

# Create task
curl -X POST http://100.64.216.28:3401/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","assignee":"agent","priority":"normal","ticket_type":"auto"}'

# Log a worker run
curl -X POST http://100.64.216.28:3401/api/worker-runs \
  -H "Content-Type: application/json" \
  -d '{"worker":"Test Worker","status":"ok","duration_s":10}'

# List worker runs
curl -s http://100.64.216.28:3401/api/worker-runs?limit=10 | python3 -m json.tool
```

---

## Convenciones de Desarrollo

- **Zero build step** — No webpack, no React, no TS. Vanilla JS.
- **Single-file UI** — Todo en `public/index.html`. Simplicity > architecture.
- **JSON/JSONL storage** — No database. Copy folder = copy state.
- **Express only** — Minimal deps.
- **Naming:** camelCase (vars/functions), `/api/kebab-case` (routes), kebab-case (files)
- **PRs obligatorios** — branch `feat/xxx-N` o `fix/xxx-N`, PR con `Closes #N`
- **Golden Rules en markdown** — Nunca hardcodear reglas en HTML. Leer de workspace.
- **`ticket_type` reemplaza `deliverable_type` en UI** — `deliverable_type` se mantiene en schema por backward compat pero NO se muestra en la interfaz.

---

## Seguridad

- **Bind a Tailscale o localhost** — NUNCA `0.0.0.0`
- **No auth** — Depende de red privada (Tailscale)
- **No secrets en código** — Usar `.env`
- **`data/` en .gitignore** — Tickets y logs son datos privados

---

## Bugs Conocidos

- **Watchdog auto-expand (#61):** Watchdog creaba children innecesarios. Fix: default close, solo expand si Ronald lo pide explícitamente.
- **Worker runs vacío:** La tab Runs estará vacía hasta que los crons empiecen a hacer POST `/api/worker-runs`. Es comportamiento esperado.

---

## Roadmap (Khipu MVP)

1. ✅ ticket_type AUTO/MANUAL
2. ✅ Worker Runs endpoint + UI
3. ⬜ Crons logueando a worker-runs al terminar cada ejecución
4. ⬜ Governance rules como JSON (budget por worker, modelo asignado, retry policy)
5. ⬜ Auto-disable worker si excede budget o falla 3x consecutivas
6. ⬜ Cost alertas (Slack/Telegram cuando budget diario se excede)

*Última actualización: 2026-02-26*
