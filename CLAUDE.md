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
- [Workflow Orchestration](#workflow-orchestration)
- [Task Management](#task-management)
- [Core Principles](#core-principles)
- [Seguridad](#seguridad)
- [Recursos](#recursos)

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
| Proceso | PM2: `oas` |
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
- **Vanilla JS** — sin framework, sin build step
- **Auto-refresh:** cada 30 segundos

---

## Quick Start

```bash
npm install
cp .env.example .env  # Edit host/port/workspace
node server.js         # or: pm2 restart oas
```

---

## Comandos Frecuentes

```bash
# Restart
pm2 restart oas

# Logs
pm2 logs oas --lines 50

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

### Arquitectura Frontend
- **Vanilla JS** — No frameworks (React, Vue, etc.). No TypeScript. No build step.
- **Separación de concerns** — CSS en archivos `.css`, JS en archivos `.js`, HTML limpio. No monolitos single-file.
- **Modular** — Funciones y componentes aislados, reutilizables. Si un archivo supera ~300 líneas, refactorizar.
- **Escalable** — Cada decisión debe funcionar igual de bien con 10 features que con 100. No shortcuts que se vuelvan deuda.

### Arquitectura Backend
- **Express only** — Minimal deps.
- **JSON/JSONL storage** — No database. Copy folder = copy state.

### Código
- **Naming:** camelCase (vars/functions), `/api/kebab-case` (routes), kebab-case (files)
- **PRs obligatorios** — branch `feat/xxx-N` o `fix/xxx-N`, PR con `Closes #N`
- **Golden Rules en markdown** — Nunca hardcodear reglas en HTML. Leer de workspace.
- **`ticket_type` reemplaza `deliverable_type` en UI** — `deliverable_type` se mantiene en schema por backward compat pero NO se muestra en la interfaz.

### ⚠️ Playwright — Schedule Tab Prohibido
- **NUNCA usar Playwright para interactuar o hacer snapshot del tab Schedule**
- El tab carga `calendar.html` en un iframe con un grid de 24h×7 días (168+ celdas) + emojis en nombres de crons
- Playwright serializa el DOM a ~900K chars con surrogate pairs UTF-16 inválidos → crash de la API de Claude (`"no low surrogate in string"`)
- Para verificar el Schedule: leer código directamente o pedir screenshot manual al usuario

---

## Workflow Orchestration

### 1. Plan Mode Default
- Entrar en plan mode para cualquier tarea no trivial (3+ pasos o decisiones arquitecturales)
- Si algo sale mal, PARAR y re-planificar inmediatamente — no seguir empujando
- Usar plan mode para pasos de verificación, no solo para construir
- Escribir specs detallados upfront para reducir ambigüedad

### 2. Subagent Strategy
- Usar subagents liberalmente para mantener el context window principal limpio
- Delegar research, exploración y análisis paralelo a subagents
- Para problemas complejos, usar más compute via subagents
- Una tarea por subagent para ejecución enfocada

### 3. Self-Improvement Loop
- Después de CUALQUIER corrección del usuario: actualizar `tasks/lessons.md` con el patrón
- Escribir reglas que prevengan el mismo error
- Iterar en estas lecciones hasta que la tasa de error baje
- Revisar lecciones al inicio de sesión para el proyecto relevante

### 4. Verification Before Done
- Nunca marcar una tarea como completa sin probar que funciona
- Comparar behavior entre main y tus cambios cuando sea relevante
- Preguntarse: "Would a staff engineer approve this?"
- Correr tests, revisar logs, demostrar correctitud

### 5. Demand Elegance (Balanced)
- Para cambios no triviales: pausar y preguntar "is there a more elegant way?"
- Si un fix se siente hacky: "Knowing everything I know now, implement the elegant solution"
- Skip para fixes simples y obvios — no over-engineer
- Desafiar tu propio trabajo antes de presentarlo

### 6. Autonomous Bug Fixing
- Cuando recibas un bug report: solo arréglalo. No pedir que te guíen
- Apuntar a logs, errores, tests que fallan — luego resolverlos
- Zero context switching requerido del usuario
- Arreglar tests de CI que fallan sin que te digan cómo

---

## Task Management

1. **Plan First:** Escribir plan en `tasks/todo.md` con items checkeables
2. **Verify Plan:** Check in antes de empezar implementación
3. **Track Progress:** Marcar items completos conforme avanzas
4. **Explain Changes:** Resumen de alto nivel en cada paso
5. **Document Results:** Agregar sección de review en `tasks/todo.md`
6. **Capture Lessons:** Actualizar `tasks/lessons.md` después de correcciones

---

## Core Principles

- **Simplicity First:** Cada cambio tan simple como sea posible. Impacto mínimo en código.
- **No Laziness:** Encontrar root causes. No fixes temporales. Estándares de senior developer.
- **Minimal Impact:** Los cambios solo tocan lo necesario. Evitar introducir bugs.
- **Timeless documentation:** Este archivo contiene visión, arquitectura y convenciones. No bugs, TODOs, ni feature status aquí — eso va en issues o STATUS.md.

---

## Seguridad

- **Bind a Tailscale o localhost** — NUNCA `0.0.0.0`
- **No auth** — Depende de red privada (Tailscale)
- **No secrets en código** — Usar `.env`
- **`data/` en .gitignore** — Tickets y logs son datos privados

---

## Recursos

- [ROADMAP.md](ROADMAP.md) — Plan de evolución (Khipu MVP)
- [docs/known-bugs.md](docs/known-bugs.md) — Bugs conocidos y workarounds
- [docs/](docs/) — Documentación técnica del proyecto
- [Repo GitHub](https://github.com/ronaldmego/openclaw-auto-sprint)
