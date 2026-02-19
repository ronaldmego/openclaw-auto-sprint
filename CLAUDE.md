# OCC — OpenClaw Command Center

## Tabla de Contenidos

- [Puerto](#puerto)
- [Visión y Filosofía](#visión-y-filosofía)
- [Arquitectura](#arquitectura)
- [Quick Start](#quick-start)
- [Comandos Frecuentes](#comandos-frecuentes)
- [Filosofía de Desarrollo](#filosofía-de-desarrollo)
- [Seguridad](#seguridad)
- [Recursos](#recursos)

---

## Proyecto en Archon

| Campo | Valor |
|-------|-------|
| Nombre | **OCC — OpenClaw Command Center** |
| Repo | `ronaldmego/openclaw-command-center` |

Cada ticket de Archon DEBE tener su GitHub Issue asociado. El PR que cierra el ticket debe incluir `Closes #N` para auto-cerrar el issue en GitHub.

### Workflow para agentes

1. Buscar el proyecto en Archon por nombre exacto: **OCC — OpenClaw Command Center**
2. Tomar el ticket asignado, moverlo a `doing`
3. Crear branch, hacer cambios, abrir PR con `Closes #N`
4. **Dejar comentario en el ticket de Archon** con: resumen de cambios, link al PR, archivos modificados
5. **Dejar comentario en el GitHub Issue** con el mismo resumen
6. Mover ticket a `review`

No mover a review sin dejar comentarios.

---

## Puerto

| Item | Valor |
|------|-------|
| Puerto Prod | `3401` (Tailscale only) |
| Bind | Configurable via `OCC_HOST` env var |
| URL | `http://<host>:3401` |
| Proceso | PM2: `pepa-dashboard` |

---

## Visión y Filosofía

**Single Source of Truth para agentes OpenClaw.**

OCC es un tablero Kanban + API REST diseñado para que agentes AI y humanos coordinen trabajo. No es solo un task tracker — es el sistema operativo de la relación humano-agente.

### Principios

1. **El agente necesita estructura** — Sin reglas claras, los agentes hacen lo que quieren. OCC impone flujo, prioridades y accountability.
2. **El humano necesita visibilidad** — Dashboard web accesible desde teléfono. Ver estado en 5 segundos.
3. **Golden Rules como código** — Las reglas del tablero viven en `OCC-GOLDEN-RULES.md` (workspace), no hardcodeadas en HTML. Una fuente de verdad, renderizada en el dashboard.
4. **Workspace-driven** — Tools, Brain, y Golden Rules se leen desde archivos markdown del workspace de OpenClaw. El dashboard es una ventana, no el dueño de los datos.

### Qué problema resuelve

- Agentes sin backlog = agentes que improvisan
- Humano sin dashboard = humano que no sabe qué hizo el agente
- Sin reglas = caos de tickets duplicados, sin prioridad, sin review

---

## Arquitectura

```
┌─────────────────────────────────────────┐
│            Browser (UI)                 │
│  Tabs: Board | Activity | Docs | Tools │
│        Brain | Analytics               │
└──────────────┬──────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────┐
│          server.js (Express)            │
│                                         │
│  /api/tasks     — CRUD tickets          │
│  /api/checkins  — Activity log          │
│  /api/reglas    — Golden Rules (md)     │
│  /api/tools     — TOOLS.md reader       │
│  /api/brain     — Workspace .md reader  │
│  /api/search    — Full-text search      │
│  /api/analytics — Stats & metrics       │
└──────────────┬──────────────────────────┘
               │ fs
┌──────────────▼──────────────────────────┐
│          data/ (JSON files)             │
│  tasks.json    — All tickets            │
│  checkins.json — Activity log           │
│  logs/         — Execution logs         │
└─────────────────────────────────────────┘
               │ fs
┌──────────────▼──────────────────────────┐
│    OpenClaw Workspace (~/.openclaw/     │
│              workspace/)                │
│  OCC-GOLDEN-RULES.md — Board rules     │
│  TOOLS.md             — Agent tools     │
│  SOUL.md, MEMORY.md   — Brain files    │
│  memory/*.md          — Daily logs      │
└─────────────────────────────────────────┘
```

### Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (single file, no build step)
- **Storage:** JSON files (no database required)
- **Process Manager:** PM2

### Estructura de directorios

```
├── CLAUDE.md              # Este archivo
├── README.md              # Setup para usuarios
├── server.js              # API + static server
├── package.json           # Dependencies (express only)
├── public/
│   ├── index.html         # Full UI (single page)
│   └── favicon.svg        # Icon
├── data/                  # Runtime data (gitignored)
│   ├── tasks.json         # Tickets
│   ├── checkins.json      # Activity log
│   └── logs/              # Execution logs
└── .gitignore
```

---

## Quick Start

```bash
# 1. Clone
git clone git@github.com:ronaldmego/openclaw-command-center.git
cd openclaw-command-center

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your host/port and workspace path

# 4. Run
node server.js
# Or with PM2:
pm2 start server.js --name occ
```

---

## Comandos Frecuentes

```bash
# Restart
pm2 restart pepa-dashboard

# Logs
pm2 logs pepa-dashboard --lines 50

# API test
curl http://localhost:3401/api/tasks | jq

# Create task via API
curl -X POST http://localhost:3401/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","assignee":"agent","priority":"medium","status":"todo"}'
```

---

## Filosofía de Desarrollo

### Convenciones

- **Zero build step** — No webpack, no React, no TypeScript. Vanilla JS que cualquiera puede leer.
- **Single-file UI** — Todo el frontend en `public/index.html`. Simplicity over architecture.
- **JSON storage** — No database dependency. Copy the folder = copy the state.
- **Express only** — Minimal dependencies. `package.json` should stay lean.

### Naming

- Variables/functions: camelCase
- API routes: `/api/kebab-case`
- Files: kebab-case

### Golden Rules

Las reglas del tablero viven en `OCC-GOLDEN-RULES.md` en el workspace de OpenClaw. El endpoint `/api/reglas` las lee y el frontend las renderiza. Para modificar reglas, editar el markdown — nunca el HTML.

### Workspace Integration

OCC lee archivos del workspace de OpenClaw:
- `OCC-GOLDEN-RULES.md` → Tab Docs (reglas)
- `TOOLS.md` → Tab Tools
- `SOUL.md`, `IDENTITY.md`, `USER.md`, `MEMORY.md`, `memory/*.md` → Tab Brain

Los paths se configuran via env vars. No hardcodear paths absolutos.

---

## Seguridad

- **Bind a Tailscale o localhost** — NUNCA `0.0.0.0`
- **No auth actualmente** — Depende de red privada (Tailscale). Futuro: API keys o basic auth.
- **No secrets en código** — Usar `.env` para configuración
- **data/ en .gitignore** — Tickets y logs son datos privados del usuario

---

## Recursos

- **Repo:** https://github.com/ronaldmego/openclaw-command-center
- **OpenClaw:** https://github.com/openclaw/openclaw
- **Golden Rules:** `OCC-GOLDEN-RULES.md` (workspace)
- **Archon project:** Buscar "OCC" en Archon para features y roadmap
